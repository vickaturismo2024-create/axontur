-- Tabla de auditoría de tipos de cambio
CREATE TABLE public.exchange_rate_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rate_date date NOT NULL DEFAULT CURRENT_DATE,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric(20,6) NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_rate_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their rate log"
  ON public.exchange_rate_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their rate log"
  ON public.exchange_rate_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_exchange_rate_log_user_date ON public.exchange_rate_log (user_id, rate_date DESC);
CREATE INDEX idx_exchange_rate_log_pair       ON public.exchange_rate_log (from_currency, to_currency);
CREATE INDEX idx_exchange_rate_log_source     ON public.exchange_rate_log (source_type, source_id);

-- Función trigger: log de TC sobre file_receipt_items
CREATE OR REPLACE FUNCTION public.log_receipt_item_exchange_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_date date;
  v_old_rate numeric;
BEGIN
  -- Sólo si hay TC + moneda de servicio diferente
  IF NEW.exchange_rate IS NULL OR NEW.service_currency IS NULL OR NEW.service_currency = NEW.currency THEN
    RETURN NEW;
  END IF;

  -- En UPDATE, sólo loggear si cambió rate, currency o service_currency
  IF TG_OP = 'UPDATE' THEN
    IF OLD.exchange_rate IS NOT DISTINCT FROM NEW.exchange_rate
       AND OLD.currency IS NOT DISTINCT FROM NEW.currency
       AND OLD.service_currency IS NOT DISTINCT FROM NEW.service_currency THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT payment_date INTO v_payment_date
    FROM public.file_receipts WHERE id = NEW.receipt_id;

  INSERT INTO public.exchange_rate_log (
    user_id, rate_date, from_currency, to_currency, rate,
    source, source_type, source_id
  ) VALUES (
    NEW.user_id,
    COALESCE(v_payment_date, CURRENT_DATE),
    NEW.currency,
    NEW.service_currency,
    NEW.exchange_rate,
    'manual',
    'receipt_item',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_receipt_item_exchange_rate
AFTER INSERT OR UPDATE ON public.file_receipt_items
FOR EACH ROW
EXECUTE FUNCTION public.log_receipt_item_exchange_rate();

-- Backfill histórico
INSERT INTO public.exchange_rate_log (
  user_id, rate_date, from_currency, to_currency, rate,
  source, source_type, source_id, created_at
)
SELECT
  ri.user_id,
  COALESCE(r.payment_date, ri.created_at::date),
  ri.currency,
  ri.service_currency,
  ri.exchange_rate,
  'historical',
  'receipt_item',
  ri.id,
  ri.created_at
FROM public.file_receipt_items ri
LEFT JOIN public.file_receipts r ON r.id = ri.receipt_id
WHERE ri.exchange_rate IS NOT NULL
  AND ri.service_currency IS NOT NULL
  AND ri.service_currency <> ri.currency;