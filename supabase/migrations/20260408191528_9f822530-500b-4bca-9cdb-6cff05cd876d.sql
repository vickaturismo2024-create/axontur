
-- Expand suppliers table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS email text DEFAULT '';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS phone text DEFAULT '';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS type text DEFAULT '';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add update policy for suppliers
CREATE POLICY "Users can update their own suppliers"
ON public.suppliers
FOR UPDATE
USING (auth.uid() = user_id);

-- Create reminders table
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quote_id uuid,
  reminder_date timestamptz NOT NULL,
  message text NOT NULL DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders"
ON public.reminders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders"
ON public.reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
ON public.reminders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
ON public.reminders FOR DELETE
USING (auth.uid() = user_id);
