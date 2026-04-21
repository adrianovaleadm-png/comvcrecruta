ALTER TABLE public.candidates
  ADD COLUMN profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_profile_id
  ON public.candidates(profile_id);

CREATE INDEX IF NOT EXISTS idx_candidates_email
  ON public.candidates(lower(email));