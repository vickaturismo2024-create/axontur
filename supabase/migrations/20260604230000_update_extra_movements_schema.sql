-- ============================================================
-- MIGRACIÓN: Tabla de Movimientos Extra e Integración con Caja (account_movements)
-- ============================================================

-- 1. Recrear la tabla extra_movements con columnas consistentes en inglés
DROP TABLE IF EXISTS public.extra_movements CASCADE;

CREATE TABLE public.extra_movements (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid          NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  concept         text          NOT NULL,
  amount          numeric(15,2) NOT NULL,
  currency        text          NOT NULL DEFAULT 'ARS',
  payment_method  text          NOT NULL DEFAULT 'cash',
  payment_date    date          NOT NULL DEFAULT CURRENT_DATE,
  notes           text,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS extra_movements_agency_idx ON public.extra_movements (agency_id);

-- Habilitar RLS
ALTER TABLE public.extra_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS
CREATE POLICY "agency members can select extra_movements"
  ON public.extra_movements FOR SELECT
  USING (agency_id = current_agency_id());

CREATE POLICY "agency members can insert extra_movements"
  ON public.extra_movements FOR INSERT
  WITH CHECK (agency_id = current_agency_id());

CREATE POLICY "agency members can update extra_movements"
  ON public.extra_movements FOR UPDATE
  USING (agency_id = current_agency_id());

CREATE POLICY "agency members can delete extra_movements"
  ON public.extra_movements FOR DELETE
  USING (agency_id = current_agency_id());


-- 2. Modificar account_movements para vincular movimientos extra
ALTER TABLE public.account_movements
  ADD COLUMN IF NOT EXISTS extra_movement_id uuid REFERENCES public.extra_movements(id) ON DELETE CASCADE;

-- Crear índice parcial único para evitar duplicaciones
DROP INDEX IF EXISTS public.account_movements_extra_movement_id_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS account_movements_extra_movement_id_uidx 
  ON public.account_movements (extra_movement_id) 
  WHERE extra_movement_id IS NOT NULL;


-- 3. Trigger de Sincronización Automática con Caja General (account_movements)
CREATE OR REPLACE FUNCTION public.sync_extra_movement_to_account_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.account_movements
      WHERE extra_movement_id = OLD.id;
    RETURN OLD;
  END IF;

  -- INSERT
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.account_movements (
      user_id,
      account_type,
      account_id,
      agency_id,
      amount,
      currency,
      concept,
      movement_date,
      notes,
      extra_movement_id,
      movement_type
    ) VALUES (
      NEW.user_id,
      'extra',              -- account_type
      NEW.agency_id,        -- account_id (vinculado a la agencia completa)
      NEW.agency_id,
      ABS(NEW.amount),
      NEW.currency,
      'Mov. Extra: ' || NEW.concept,
      NEW.payment_date,
      NEW.notes,
      NEW.id,
      CASE WHEN NEW.amount >= 0 THEN 'credit' ELSE 'debit' END
    )
    ON CONFLICT (extra_movement_id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF (TG_OP = 'UPDATE') THEN
    UPDATE public.account_movements
      SET amount = ABS(NEW.amount),
          currency = NEW.currency,
          concept = 'Mov. Extra: ' || NEW.concept,
          movement_date = NEW.payment_date,
          notes = NEW.notes,
          user_id = NEW.user_id,
          agency_id = NEW.agency_id,
          account_id = NEW.agency_id,
          movement_type = CASE WHEN NEW.amount >= 0 THEN 'credit' ELSE 'debit' END
      WHERE extra_movement_id = NEW.id;

    -- Si no existe en la tabla (ej. borrado manual previo), crearlo
    IF NOT FOUND THEN
      INSERT INTO public.account_movements (
        user_id,
        account_type,
        account_id,
        agency_id,
        amount,
        currency,
        concept,
        movement_date,
        notes,
        extra_movement_id,
        movement_type
      ) VALUES (
        NEW.user_id,
        'extra',
        NEW.agency_id,
        NEW.agency_id,
        ABS(NEW.amount),
        NEW.currency,
        'Mov. Extra: ' || NEW.concept,
        NEW.payment_date,
        NEW.notes,
        NEW.id,
        CASE WHEN NEW.amount >= 0 THEN 'credit' ELSE 'debit' END
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Vincular los triggers a la tabla extra_movements
DROP TRIGGER IF EXISTS trg_extra_movement_sync_aiu ON public.extra_movements;
CREATE TRIGGER trg_extra_movement_sync_aiu
  AFTER INSERT OR UPDATE ON public.extra_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_extra_movement_to_account_movement();

DROP TRIGGER IF EXISTS trg_extra_movement_sync_ad ON public.extra_movements;
CREATE TRIGGER trg_extra_movement_sync_ad
  AFTER DELETE ON public.extra_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_extra_movement_to_account_movement();
