-- Add legacy_id to files for duplicate detection on bulk Excel imports
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS legacy_id text;
CREATE INDEX IF NOT EXISTS files_user_legacy_id_idx ON public.files(user_id, legacy_id) WHERE legacy_id IS NOT NULL;

-- Drop the legacy_id from reservations (was added in previous step but no longer needed)
-- Keep it actually — harmless, and in case any reservation was imported. Skip.
