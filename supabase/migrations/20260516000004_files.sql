-- ============================================================
-- MIGRACIÓN 4: Columnas legacy en tabla files (expedientes)
-- ============================================================

ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS legacy_id           integer,
  ADD COLUMN IF NOT EXISTS expiry_date         date,
  ADD COLUMN IF NOT EXISTS return_date         date,
  ADD COLUMN IF NOT EXISTS closed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS opened_by_code      text,
  ADD COLUMN IF NOT EXISTS closed_by_code      text,
  ADD COLUMN IF NOT EXISTS is_liquidated       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS liquidated_at       timestamptz,
  ADD COLUMN IF NOT EXISTS department          text,
  ADD COLUMN IF NOT EXISTS operational_notes   text,
  ADD COLUMN IF NOT EXISTS promoter            text,
  ADD COLUMN IF NOT EXISTS secondary_seller    text,
  ADD COLUMN IF NOT EXISTS advance_amount_ars  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_amount_usd  numeric DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS files_legacy_id_agency_unique
  ON public.files (agency_id, legacy_id)
  WHERE legacy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS files_is_liquidated_idx
  ON public.files (agency_id, is_liquidated)
  WHERE is_liquidated = false;

CREATE INDEX IF NOT EXISTS files_expiry_date_idx
  ON public.files (agency_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

COMMENT ON COLUMN public.files.legacy_id          IS 'ID_RES del sistema anterior. Solo para migración.';
COMMENT ON COLUMN public.files.expiry_date        IS 'Fecha de vencimiento del expediente (FECHA_VTO).';
COMMENT ON COLUMN public.files.return_date        IS 'Fecha de regreso del viaje (FECHA_REGRESO).';
COMMENT ON COLUMN public.files.closed_at          IS 'Fecha y hora de cierre del expediente (FECHA_CIERRE).';
COMMENT ON COLUMN public.files.opened_by_code     IS 'Código de usuario que abrió el expediente en sistema viejo.';
COMMENT ON COLUMN public.files.closed_by_code     IS 'Código de usuario que cerró el expediente en sistema viejo.';
COMMENT ON COLUMN public.files.is_liquidated      IS 'True si el expediente fue liquidado (LIQUIS).';
COMMENT ON COLUMN public.files.liquidated_at      IS 'Fecha de liquidación (FECLIQ).';
COMMENT ON COLUMN public.files.department         IS 'Departamento o área (DEPTO en sistema viejo).';
COMMENT ON COLUMN public.files.operational_notes  IS 'Notas operativas internas (OPERATIVO en sistema viejo).';
COMMENT ON COLUMN public.files.promoter           IS 'Promotor o referido que originó el expediente.';
COMMENT ON COLUMN public.files.secondary_seller   IS 'Vendedor secundario (VEND2 en sistema viejo).';
COMMENT ON COLUMN public.files.advance_amount_ars IS 'Adelanto en ARS (ADEL en sistema viejo).';
COMMENT ON COLUMN public.files.advance_amount_usd IS 'Adelanto en USD.';
