
ALTER TABLE public.jobs
  ADD COLUMN seniority text,
  ADD COLUMN work_model text,
  ADD COLUMN department text,
  ADD COLUMN salary_min integer,
  ADD COLUMN salary_max integer,
  ADD COLUMN headcount integer NOT NULL DEFAULT 1,
  ADD COLUMN deadline date,
  ADD COLUMN required_skills text[];
