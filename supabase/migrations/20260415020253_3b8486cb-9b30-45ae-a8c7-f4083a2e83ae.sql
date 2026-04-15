
-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to candidates" ON public.candidates
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Add candidate_id to applications
ALTER TABLE public.applications
  ADD COLUMN candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE;
