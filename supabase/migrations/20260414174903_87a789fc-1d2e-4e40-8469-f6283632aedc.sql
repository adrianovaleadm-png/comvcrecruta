
-- Create applications table
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to applications" ON public.applications
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create activity_events table
CREATE TABLE public.activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to activity_events" ON public.activity_events
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Trigger: log when a job is created
CREATE OR REPLACE FUNCTION public.log_job_created()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_events (type, entity_type, entity_id, message, metadata)
  VALUES ('created', 'job', NEW.id, 'Vaga criada: ' || NEW.title, jsonb_build_object('title', NEW.title, 'status', NEW.status));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_job_created
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_job_created();

-- Trigger: log when an application is created
CREATE OR REPLACE FUNCTION public.log_application_created()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  _job_title TEXT;
  _stage_name TEXT;
BEGIN
  SELECT title INTO _job_title FROM public.jobs WHERE id = NEW.job_id;
  SELECT name INTO _stage_name FROM public.stages WHERE id = NEW.stage_id;
  INSERT INTO public.activity_events (type, entity_type, entity_id, message, metadata)
  VALUES ('created', 'application', NEW.id, 'Nova candidatura na vaga: ' || COALESCE(_job_title, '—'), jsonb_build_object('job_id', NEW.job_id, 'stage', _stage_name));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_application_created
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_application_created();

-- Trigger: log when application status or stage changes
CREATE OR REPLACE FUNCTION public.log_application_updated()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  _job_title TEXT;
  _stage_name TEXT;
  _msg TEXT;
BEGIN
  SELECT title INTO _job_title FROM public.jobs WHERE id = NEW.job_id;

  IF NEW.status <> OLD.status THEN
    IF NEW.status = 'hired' THEN
      _msg := 'Candidato contratado na vaga: ' || COALESCE(_job_title, '—');
    ELSIF NEW.status = 'rejected' THEN
      _msg := 'Candidato reprovado na vaga: ' || COALESCE(_job_title, '—');
    ELSE
      _msg := 'Status da candidatura alterado na vaga: ' || COALESCE(_job_title, '—');
    END IF;
    INSERT INTO public.activity_events (type, entity_type, entity_id, message, metadata)
    VALUES ('status_changed', 'application', NEW.id, _msg, jsonb_build_object('job_id', NEW.job_id, 'old_status', OLD.status, 'new_status', NEW.status));
  END IF;

  IF NEW.stage_id <> OLD.stage_id THEN
    SELECT name INTO _stage_name FROM public.stages WHERE id = NEW.stage_id;
    _msg := 'Candidato movido para etapa "' || COALESCE(_stage_name, '—') || '" na vaga: ' || COALESCE(_job_title, '—');
    INSERT INTO public.activity_events (type, entity_type, entity_id, message, metadata)
    VALUES ('stage_changed', 'application', NEW.id, _msg, jsonb_build_object('job_id', NEW.job_id, 'new_stage', _stage_name));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_application_updated
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_application_updated();
