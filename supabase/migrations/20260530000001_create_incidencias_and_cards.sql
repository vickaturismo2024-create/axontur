-- ============================================================
-- MIGRACIÓN: Módulo de Incidencias y Tarjetas de la Agencia (Idempotente)
-- ============================================================

-- 1. Crear tabla file_incidencias
CREATE TABLE IF NOT EXISTS public.file_incidencias (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  file_id         uuid        NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  descripcion     text        NOT NULL,
  fecha           timestamptz NOT NULL DEFAULT now(),
  estado_gestion  text        NOT NULL DEFAULT 'pendiente',
  impacto_caja    boolean     NOT NULL DEFAULT false,
  monto           numeric(15,2) NOT NULL DEFAULT 0.00,
  moneda          text        NOT NULL DEFAULT 'ARS',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT file_incidencias_estado_check CHECK (estado_gestion IN ('pendiente', 'en_gestion', 'resuelto'))
);

CREATE INDEX IF NOT EXISTS file_incidencias_file_idx ON public.file_incidencias (file_id);
CREATE INDEX IF NOT EXISTS file_incidencias_agency_idx ON public.file_incidencias (agency_id);

-- Eliminar y recrear trigger de updated_at para incidencias
DROP TRIGGER IF EXISTS file_incidencias_updated_at ON public.file_incidencias;
CREATE TRIGGER file_incidencias_updated_at
  BEFORE UPDATE ON public.file_incidencias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Crear tabla agency_cards
CREATE TABLE IF NOT EXISTS public.agency_cards (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     uuid        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  alias         text        NOT NULL,
  banco         text,
  vencimiento   text,
  ultimos_4     text,
  nro_tarjeta   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_cards_agency_idx ON public.agency_cards (agency_id);

-- Eliminar y recrear trigger de updated_at para tarjetas
DROP TRIGGER IF EXISTS agency_cards_updated_at ON public.agency_cards;
CREATE TRIGGER agency_cards_updated_at
  BEFORE UPDATE ON public.agency_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Modificar account_movements para vincular incidencias
ALTER TABLE public.account_movements
  ADD COLUMN IF NOT EXISTS incidence_id uuid REFERENCES public.file_incidencias(id) ON DELETE CASCADE;

-- Eliminar índice si ya existiera para evitar colisión
DROP INDEX IF EXISTS public.account_movements_incidence_id_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS account_movements_incidence_id_uidx 
  ON public.account_movements (incidence_id) 
  WHERE incidence_id IS NOT NULL;

-- 4. Trigger de Integridad y Sincronización Automática con Caja (account_movements)
CREATE OR REPLACE FUNCTION public.process_incidence_cash_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_user_id UUID;
BEGIN
  -- Obtenemos el client_id y user_id del expediente
  SELECT client_id, user_id INTO v_client_id, v_user_id
  FROM public.files
  WHERE id = COALESCE(NEW.file_id, OLD.file_id);

  -- Si es UPDATE o DELETE, y antes tenía impacto en caja pero ahora no (o se borró la incidencia)
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    IF (TG_OP = 'DELETE' OR NEW.impacto_caja = false OR NEW.monto <= 0) THEN
      DELETE FROM public.account_movements WHERE incidence_id = OLD.id;
    END IF;
  END IF;

  -- Si es INSERT o UPDATE, y tiene impacto en caja y monto > 0
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF (NEW.impacto_caja = true AND NEW.monto > 0) THEN
      -- Upsert contable en la cuenta del cliente
      INSERT INTO public.account_movements (
        incidence_id,
        account_id,
        account_type,
        agency_id,
        amount,
        currency,
        file_id,
        movement_date,
        movement_type,
        concept,
        notes,
        user_id
      ) VALUES (
        NEW.id,
        v_client_id,
        'client',
        NEW.agency_id,
        NEW.monto,
        NEW.moneda,
        NEW.file_id,
        NEW.fecha::date,
        'debit', -- Las incidencias representan costos/egresos por defecto
        'Incidencia: ' || NEW.descripcion,
        'Movimiento contable generado automáticamente por incidencia.',
        COALESCE(NEW.created_by, v_user_id)
      )
      ON CONFLICT (incidence_id) DO UPDATE SET
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        movement_date = EXCLUDED.movement_date,
        concept = EXCLUDED.concept,
        user_id = EXCLUDED.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar y recrear trigger de sincronización de caja
DROP TRIGGER IF EXISTS trg_file_incidencias_cash_movement ON public.file_incidencias;
CREATE TRIGGER trg_file_incidencias_cash_movement
  AFTER INSERT OR UPDATE OR DELETE
  ON public.file_incidencias
  FOR EACH ROW
  EXECUTE FUNCTION public.process_incidence_cash_movement();

-- 5. Habilitar RLS y Configurar Políticas de Seguridad

-- RLS para file_incidencias
ALTER TABLE public.file_incidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency members can select incidencias" ON public.file_incidencias;
CREATE POLICY "agency members can select incidencias"
  ON public.file_incidencias FOR SELECT
  USING (agency_id = current_agency_id());

DROP POLICY IF EXISTS "agency members can insert incidencias" ON public.file_incidencias;
CREATE POLICY "agency members can insert incidencias"
  ON public.file_incidencias FOR INSERT
  WITH CHECK (agency_id = current_agency_id());

DROP POLICY IF EXISTS "agency members can update incidencias" ON public.file_incidencias;
CREATE POLICY "agency members can update incidencias"
  ON public.file_incidencias FOR UPDATE
  USING (agency_id = current_agency_id());

DROP POLICY IF EXISTS "admin can delete incidencias" ON public.file_incidencias;
CREATE POLICY "admin can delete incidencias"
  ON public.file_incidencias FOR DELETE
  USING (
    agency_id = current_agency_id()
    AND has_role(auth.uid(), 'admin')
  );

-- RLS para agency_cards
ALTER TABLE public.agency_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency members can select cards" ON public.agency_cards;
CREATE POLICY "agency members can select cards"
  ON public.agency_cards FOR SELECT
  USING (agency_id = current_agency_id());

DROP POLICY IF EXISTS "agency members can insert cards" ON public.agency_cards;
CREATE POLICY "agency members can insert cards"
  ON public.agency_cards FOR INSERT
  WITH CHECK (agency_id = current_agency_id());

DROP POLICY IF EXISTS "agency members can update cards" ON public.agency_cards;
CREATE POLICY "agency members can update cards"
  ON public.agency_cards FOR UPDATE
  USING (agency_id = current_agency_id());

DROP POLICY IF EXISTS "admin can delete cards" ON public.agency_cards;
CREATE POLICY "admin can delete cards"
  ON public.agency_cards FOR DELETE
  USING (
    agency_id = current_agency_id()
    AND has_role(auth.uid(), 'admin')
  );
