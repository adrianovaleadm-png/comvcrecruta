
-- Extend candidates table
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT;

-- Tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tags" ON public.tags FOR ALL TO public USING (true) WITH CHECK (true);

-- Candidate tags junction
CREATE TABLE public.candidate_tags (
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (candidate_id, tag_id)
);
ALTER TABLE public.candidate_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to candidate_tags" ON public.candidate_tags FOR ALL TO public USING (true) WITH CHECK (true);

-- Candidate files
CREATE TABLE public.candidate_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'cv',
  url TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.candidate_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to candidate_files" ON public.candidate_files FOR ALL TO public USING (true) WITH CHECK (true);

-- Storage bucket for candidate files
INSERT INTO storage.buckets (id, name, public) VALUES ('candidate-files', 'candidate-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read candidate files" ON storage.objects FOR SELECT USING (bucket_id = 'candidate-files');
CREATE POLICY "Anyone can upload candidate files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'candidate-files');
CREATE POLICY "Anyone can delete candidate files" ON storage.objects FOR DELETE USING (bucket_id = 'candidate-files');
