
-- Add approval columns to quotes
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by_name text DEFAULT '',
ADD COLUMN IF NOT EXISTS approved_ip text DEFAULT '';

-- Create quote_views table for tracking public link views
CREATE TABLE public.quote_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text DEFAULT ''
);

ALTER TABLE public.quote_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (public access for tracking)
CREATE POLICY "Anyone can insert quote views"
ON public.quote_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only quote owners can view their quote's views
CREATE POLICY "Quote owners can view their quote views"
ON public.quote_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_views.quote_id
    AND q.user_id = auth.uid()
  )
);
