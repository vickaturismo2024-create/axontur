ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS agency_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS agency_instagram text DEFAULT '',
  ADD COLUMN IF NOT EXISTS agency_tagline text DEFAULT '';