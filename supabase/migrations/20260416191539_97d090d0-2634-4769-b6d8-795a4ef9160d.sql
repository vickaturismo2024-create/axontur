ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'dd/MM/yyyy',
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS notify_birthdays boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_document_expiry boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_payment_due boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_due_days integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS document_expiry_months integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS file_prefix text NOT NULL DEFAULT 'FILE',
  ADD COLUMN IF NOT EXISTS receipt_prefix text NOT NULL DEFAULT 'REC',
  ADD COLUMN IF NOT EXISTS pdf_footer_legal text NOT NULL DEFAULT '';