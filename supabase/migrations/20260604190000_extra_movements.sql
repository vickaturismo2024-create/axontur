-- ============================================================
-- MIGRACIÓN: Tabla de Movimientos Extra de Caja (No Operativos)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.extra_movements (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid          NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  concepto        text          NOT NULL,
  monto           numeric(15,2) NOT NULL,
  moneda          text          NOT NULL DEFAULT 'ARS',
  medio_pago      text          NOT NULL DEFAULT 'cash',
  fecha           date          NOT NULL DEFAULT CURRENT_DATE,
  notes           text,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS extra_movements_agency_idx ON public.extra_movements (agency_id);

-- Habilitar RLS
ALTER TABLE public.extra_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS
DROP POLICY IF EXISTS "agency members can select extra_movements" ON public.extra_movements;
CREATE POLICY "agency members can select extra_movements"
  ON public.extra_movements FOR SELECT
  USING (agency_id = current_agency_id());

DROP POLICY IF EXISTS "agency members can insert extra_movements" ON public.extra_movements;
CREATE POLICY "agency members can insert extra_movements"
  ON public.extra_movements FOR INSERT
  WITH CHECK (agency_id = current_agency_id());

DROP POLICY IF EXISTS "agency members can update extra_movements" ON public.extra_movements;
CREATE POLICY "agency members can update extra_movements"
  ON public.extra_movements FOR UPDATE
  USING (agency_id = current_agency_id());

DROP POLICY IF EXISTS "agency members can delete extra_movements" ON public.extra_movements;
CREATE POLICY "agency members can delete extra_movements"
  ON public.extra_movements FOR DELETE
  USING (agency_id = current_agency_id());
