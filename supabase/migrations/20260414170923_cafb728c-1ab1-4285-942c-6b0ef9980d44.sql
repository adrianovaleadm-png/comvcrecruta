
-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  type TEXT CHECK (type IN ('CLT','PJ','Intern','Contract')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stages table
CREATE TABLE public.stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

-- Dev-mode: allow all operations for anon and authenticated
CREATE POLICY "Allow all access to jobs" ON public.jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to stages" ON public.stages FOR ALL USING (true) WITH CHECK (true);

-- Grant access to anon role so it works without login
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stages TO anon;

-- Trigger to auto-seed default stages when a job is created
CREATE OR REPLACE FUNCTION public.seed_default_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.stages (job_id, name, order_index) VALUES
    (NEW.id, 'Recebida', 1),
    (NEW.id, 'Triagem', 2),
    (NEW.id, 'Entrevista', 3),
    (NEW.id, 'Case', 4),
    (NEW.id, 'Oferta', 5),
    (NEW.id, 'Contratada', 6),
    (NEW.id, 'Reprovada', 7);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_seed_default_stages
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_stages();

-- Updated_at trigger
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
