ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS case_brief text;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS selected_case text,
  ADD COLUMN IF NOT EXISTS selected_case_level text,
  ADD COLUMN IF NOT EXISTS case_selected_at timestamptz;