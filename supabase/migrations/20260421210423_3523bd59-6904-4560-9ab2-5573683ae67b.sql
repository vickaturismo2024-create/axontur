
-- BLOQUE 2: Estado de recibos + integración con cuentas corrientes
-- BLOQUE 4: Tabla email_logs

-- 1. Agregar columna status a file_receipts
ALTER TABLE public.file_receipts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'issued';

-- Validación de estado mediante trigger (no CHECK constraint para flexibilidad futura)
CREATE OR REPLACE FUNCTION public.validate_receipt_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'issued', 'paid', 'cancelled') THEN
    RAISE EXCEPTION 'Estado de recibo inválido: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_receipt_status_trigger ON public.file_receipts;
CREATE TRIGGER validate_receipt_status_trigger
  BEFORE INSERT OR UPDATE ON public.file_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_receipt_status();

-- 2. Agregar receipt_id a account_movements + FK
ALTER TABLE public.account_movements
  ADD COLUMN IF NOT EXISTS receipt_id uuid REFERENCES public.file_receipts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_account_movements_receipt_id 
  ON public.account_movements(receipt_id) WHERE receipt_id IS NOT NULL;

-- 3. Función para obtener el siguiente número de recibo correlativo (global por agencia/usuario)
CREATE OR REPLACE FUNCTION public.next_receipt_number(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  -- Lock para evitar duplicados en concurrencia
  PERFORM pg_advisory_xact_lock(hashtext('receipt_number_' || p_user_id::text));
  
  SELECT COALESCE(MAX(receipt_number), 0) + 1
  INTO next_num
  FROM public.file_receipts
  WHERE user_id = p_user_id;
  
  RETURN next_num;
END;
$$;

-- 4. Tabla email_logs para tracking de envíos
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
  receipt_id uuid REFERENCES public.file_receipts(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL DEFAULT '',
  template_type text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email logs"
  ON public.email_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email logs"
  ON public.email_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_file_id ON public.email_logs(file_id) WHERE file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_receipt_id ON public.email_logs(receipt_id) WHERE receipt_id IS NOT NULL;
