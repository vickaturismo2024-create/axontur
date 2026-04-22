DROP INDEX IF EXISTS public.account_movements_source_payment_id_uniq;

ALTER TABLE public.account_movements
  ADD CONSTRAINT account_movements_source_payment_id_key
  UNIQUE (source_payment_id);