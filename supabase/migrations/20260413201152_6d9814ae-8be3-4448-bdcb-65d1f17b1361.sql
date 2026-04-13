
CREATE TABLE public.account_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_type TEXT NOT NULL,
  account_id UUID NOT NULL,
  file_id UUID NULL,
  movement_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  concept TEXT NOT NULL DEFAULT '',
  reference TEXT NULL,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.account_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own movements"
ON public.account_movements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own movements"
ON public.account_movements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own movements"
ON public.account_movements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own movements"
ON public.account_movements FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_account_movements_account ON public.account_movements (account_type, account_id);
CREATE INDEX idx_account_movements_user ON public.account_movements (user_id);
