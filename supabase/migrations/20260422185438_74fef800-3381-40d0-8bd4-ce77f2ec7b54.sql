-- 1. Add source_payment_id column to account_movements
ALTER TABLE public.account_movements
  ADD COLUMN IF NOT EXISTS source_payment_id uuid;

-- Unique partial index to prevent duplicate sync rows
CREATE UNIQUE INDEX IF NOT EXISTS account_movements_source_payment_id_uidx
  ON public.account_movements (source_payment_id)
  WHERE source_payment_id IS NOT NULL;

-- 2. Sync function
CREATE OR REPLACE FUNCTION public.sync_supplier_payment_to_account_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file_number integer;
  v_concept text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.account_movements
      WHERE source_payment_id = OLD.id;
    RETURN OLD;
  END IF;

  -- INSERT or UPDATE
  IF NEW.supplier_id IS NULL THEN
    -- If updating from a row that previously had supplier_id, clean up
    IF (TG_OP = 'UPDATE') THEN
      DELETE FROM public.account_movements
        WHERE source_payment_id = OLD.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Resolve file number for concept
  SELECT file_number INTO v_file_number
    FROM public.files WHERE id = NEW.file_id;
  v_concept := 'Pago expediente #' || COALESCE(v_file_number::text, '-');

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.account_movements (
      user_id, account_type, account_id, file_id,
      movement_type, amount, currency, concept, reference,
      movement_date, source_payment_id
    ) VALUES (
      NEW.user_id, 'supplier', NEW.supplier_id, NEW.file_id,
      'debit', NEW.amount, NEW.currency, v_concept, NULLIF(NEW.reference, ''),
      COALESCE(NEW.payment_date, CURRENT_DATE), NEW.id
    )
    ON CONFLICT (source_payment_id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF (TG_OP = 'UPDATE') THEN
    -- If supplier_id changed, drop old movement and recreate
    IF OLD.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
      DELETE FROM public.account_movements WHERE source_payment_id = OLD.id;
      INSERT INTO public.account_movements (
        user_id, account_type, account_id, file_id,
        movement_type, amount, currency, concept, reference,
        movement_date, source_payment_id
      ) VALUES (
        NEW.user_id, 'supplier', NEW.supplier_id, NEW.file_id,
        'debit', NEW.amount, NEW.currency, v_concept, NULLIF(NEW.reference, ''),
        COALESCE(NEW.payment_date, CURRENT_DATE), NEW.id
      )
      ON CONFLICT (source_payment_id) DO NOTHING;
    ELSE
      UPDATE public.account_movements
        SET amount = NEW.amount,
            currency = NEW.currency,
            file_id = NEW.file_id,
            concept = v_concept,
            reference = NULLIF(NEW.reference, ''),
            movement_date = COALESCE(NEW.payment_date, CURRENT_DATE),
            account_id = NEW.supplier_id,
            user_id = NEW.user_id
        WHERE source_payment_id = NEW.id;

      -- If no row existed yet (e.g. payment originally had no supplier_id), create it
      IF NOT FOUND THEN
        INSERT INTO public.account_movements (
          user_id, account_type, account_id, file_id,
          movement_type, amount, currency, concept, reference,
          movement_date, source_payment_id
        ) VALUES (
          NEW.user_id, 'supplier', NEW.supplier_id, NEW.file_id,
          'debit', NEW.amount, NEW.currency, v_concept, NULLIF(NEW.reference, ''),
          COALESCE(NEW.payment_date, CURRENT_DATE), NEW.id
        )
        ON CONFLICT (source_payment_id) DO NOTHING;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Triggers
DROP TRIGGER IF EXISTS trg_supplier_payment_sync_aiu ON public.file_supplier_payments;
CREATE TRIGGER trg_supplier_payment_sync_aiu
  AFTER INSERT OR UPDATE ON public.file_supplier_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_supplier_payment_to_account_movement();

DROP TRIGGER IF EXISTS trg_supplier_payment_sync_ad ON public.file_supplier_payments;
CREATE TRIGGER trg_supplier_payment_sync_ad
  AFTER DELETE ON public.file_supplier_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_supplier_payment_to_account_movement();

-- 4. Backfill existing payments
DO $$
DECLARE
  r RECORD;
  v_file_number integer;
BEGIN
  FOR r IN
    SELECT fsp.*
    FROM public.file_supplier_payments fsp
    WHERE fsp.supplier_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.account_movements am
        WHERE am.source_payment_id = fsp.id
      )
  LOOP
    SELECT file_number INTO v_file_number FROM public.files WHERE id = r.file_id;
    INSERT INTO public.account_movements (
      user_id, account_type, account_id, file_id,
      movement_type, amount, currency, concept, reference,
      movement_date, source_payment_id, created_at
    ) VALUES (
      r.user_id, 'supplier', r.supplier_id, r.file_id,
      'debit', r.amount, r.currency,
      'Pago expediente #' || COALESCE(v_file_number::text, '-'),
      NULLIF(r.reference, ''),
      COALESCE(r.payment_date, r.created_at::date, CURRENT_DATE),
      r.id, r.created_at
    )
    ON CONFLICT (source_payment_id) DO NOTHING;
  END LOOP;
END $$;