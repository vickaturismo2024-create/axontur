CREATE UNIQUE INDEX IF NOT EXISTS account_movements_source_payment_id_uniq
  ON public.account_movements (source_payment_id)
  WHERE source_payment_id IS NOT NULL;