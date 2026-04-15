
CREATE TABLE public.job_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  seniority text,
  work_model text,
  department text,
  required_skills text[],
  screening_questions jsonb DEFAULT '[]'::jsonb,
  score_weights jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to job_templates"
  ON public.job_templates FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_job_templates_updated_at
  BEFORE UPDATE ON public.job_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
