-- 1. Constraint único para idempotencia (si no existe ya)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_movements_source_payment_id_key'
  ) THEN
    ALTER TABLE public.account_movements
      ADD CONSTRAINT account_movements_source_payment_id_key UNIQUE (source_payment_id);
  END IF;
END$$;

-- 2. Función espejo de la de proveedores
CREATE OR REPLACE FUNCTION public.sync_receipt_to_account_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_file_number integer;
  v_concept text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.account_movements
      WHERE source_payment_id = OLD.id AND account_type = 'client';
    RETURN OLD;
  END IF;

  SELECT client_id, file_number INTO v_client_id, v_file_number
    FROM public.files WHERE id = NEW.file_id;

  -- Sin cliente enlazado: no se genera CC
  IF v_client_id IS NULL THEN
    IF (TG_OP = 'UPDATE') THEN
      DELETE FROM public.account_movements
        WHERE source_payment_id = OLD.id AND account_type = 'client';
    END IF;
    RETURN NEW;
  END IF;

  -- Recibo cancelado: limpiar movimiento
  IF NEW.status = 'cancelled' THEN
    DELETE FROM public.account_movements
      WHERE source_payment_id = NEW.id AND account_type = 'client';
    RETURN NEW;
  END IF;

  v_concept := 'Cobro recibo #' || NEW.receipt_number || ' · expediente #' || COALESCE(v_file_number::text, '-');

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.account_movements (
      user_id, account_type, account_id, file_id,
      movement_type, amount, currency, concept,
      movement_date, source_payment_id, receipt_id
    ) VALUES (
      NEW.user_id, 'client', v_client_id, NEW.file_id,
      'credit', NEW.amount, NEW.currency, v_concept,
      COALESCE(NEW.payment_date, CURRENT_DATE), NEW.id, NEW.id
    )
    ON CONFLICT (source_payment_id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- UPDATE
  UPDATE public.account_movements
    SET amount = NEW.amount,
        currency = NEW.currency,
        concept = v_concept,
        account_id = v_client_id,
        movement_date = COALESCE(NEW.payment_date, CURRENT_DATE),
        user_id = NEW.user_id,
        file_id = NEW.file_id,
        receipt_id = NEW.id
    WHERE source_payment_id = NEW.id AND account_type = 'client';

  IF NOT FOUND THEN
    INSERT INTO public.account_movements (
      user_id, account_type, account_id, file_id,
      movement_type, amount, currency, concept,
      movement_date, source_payment_id, receipt_id
    ) VALUES (
      NEW.user_id, 'client', v_client_id, NEW.file_id,
      'credit', NEW.amount, NEW.currency, v_concept,
      COALESCE(NEW.payment_date, CURRENT_DATE), NEW.id, NEW.id
    )
    ON CONFLICT (source_payment_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_receipt_to_account_movement ON public.file_receipts;
CREATE TRIGGER trg_sync_receipt_to_account_movement
AFTER INSERT OR UPDATE OR DELETE ON public.file_receipts
FOR EACH ROW EXECUTE FUNCTION public.sync_receipt_to_account_movement();