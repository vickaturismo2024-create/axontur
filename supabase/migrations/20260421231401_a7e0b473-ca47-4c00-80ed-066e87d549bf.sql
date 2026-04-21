ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_signature text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_reply_to text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email_templates jsonb NOT NULL DEFAULT '{}'::jsonb;