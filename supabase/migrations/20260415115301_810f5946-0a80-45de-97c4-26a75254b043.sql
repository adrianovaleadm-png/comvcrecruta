
CREATE TABLE public.candidate_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  overall_score integer NOT NULL DEFAULT 0,
  criteria_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT candidate_scores_candidate_job_unique UNIQUE (candidate_id, job_id),
  CONSTRAINT candidate_scores_score_range CHECK (overall_score >= 0 AND overall_score <= 100)
);

ALTER TABLE public.candidate_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to candidate_scores"
  ON public.candidate_scores FOR ALL
  USING (true)
  WITH CHECK (true);
