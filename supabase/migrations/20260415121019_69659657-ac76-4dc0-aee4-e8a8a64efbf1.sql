
-- Screening questions per job
CREATE TABLE public.screening_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  question text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  options jsonb DEFAULT NULL,
  required boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0
);

ALTER TABLE public.screening_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to screening_questions"
  ON public.screening_questions FOR ALL
  USING (true) WITH CHECK (true);

-- Screening answers per application
CREATE TABLE public.screening_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.screening_questions(id) ON DELETE CASCADE,
  answer text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (application_id, question_id)
);

ALTER TABLE public.screening_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to screening_answers"
  ON public.screening_answers FOR ALL
  USING (true) WITH CHECK (true);

-- Add score_weights column to jobs
ALTER TABLE public.jobs ADD COLUMN score_weights jsonb DEFAULT NULL;
