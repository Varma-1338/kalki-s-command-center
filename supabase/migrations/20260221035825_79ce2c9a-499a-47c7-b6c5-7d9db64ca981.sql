
-- Add max_teams column to problem_statements (how many teams can select this problem)
ALTER TABLE public.problem_statements ADD COLUMN max_teams integer NOT NULL DEFAULT 0;

-- Create app_settings table for global settings like background audio URL
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true);

-- Storage policies for audio bucket
CREATE POLICY "Public can read audio" ON storage.objects FOR SELECT USING (bucket_id = 'audio');
CREATE POLICY "Admins can upload audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update audio" ON storage.objects FOR UPDATE USING (bucket_id = 'audio' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete audio" ON storage.objects FOR DELETE USING (bucket_id = 'audio' AND has_role(auth.uid(), 'admin'::app_role));
