
-- Create quote_versions table
CREATE TABLE public.quote_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own quote versions"
  ON public.quote_versions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quote versions"
  ON public.quote_versions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quote versions"
  ON public.quote_versions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_quote_versions_quote_id ON public.quote_versions(quote_id, version_number DESC);

-- Add archived and favorited columns to quotes
ALTER TABLE public.quotes ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN favorited boolean NOT NULL DEFAULT false;
