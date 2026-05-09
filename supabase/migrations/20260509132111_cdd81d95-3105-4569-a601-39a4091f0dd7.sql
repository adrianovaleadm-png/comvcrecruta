-- Add company_id to multi-tenant tables
ALTER TABLE public.jobs ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.candidates ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.tags ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.job_templates ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill: associate existing rows to the only/oldest company
UPDATE public.jobs SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.candidates SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.tags SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;
UPDATE public.job_templates SET company_id = (SELECT id FROM public.companies ORDER BY created_at LIMIT 1) WHERE company_id IS NULL;

-- NOT NULL after backfill
ALTER TABLE public.jobs ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.candidates ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.tags ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.job_templates ALTER COLUMN company_id SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_company ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_company ON public.candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_tags_company ON public.tags(company_id);
CREATE INDEX IF NOT EXISTS idx_job_templates_company ON public.job_templates(company_id);

-- Tags unique per company (replace global unique if any) - safe add
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_company_name_unique') THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_company_name_unique UNIQUE (company_id, name);
  END IF;
END $$;