-- ============================================================
-- MIGRACIÓN 2: Columnas legacy en tabla suppliers
-- ============================================================

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS legacy_id       integer,
  ADD COLUMN IF NOT EXISTS email           text,
  ADD COLUMN IF NOT EXISTS website         text,
  ADD COLUMN IF NOT EXISTS legal_name      text,
  ADD COLUMN IF NOT EXISTS iva_condition   text,
  ADD COLUMN IF NOT EXISTS cuit            text,
  ADD COLUMN IF NOT EXISTS postal_code     text,
  ADD COLUMN IF NOT EXISTS province        text,
  ADD COLUMN IF NOT EXISTS is_airline      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS amadeus_code    text,
  ADD COLUMN IF NOT EXISTS iata_code       text,
  ADD COLUMN IF NOT EXISTS is_active       boolean DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_legacy_id_agency_unique
  ON public.suppliers (agency_id, legacy_id)
  WHERE legacy_id IS NOT NULL;

COMMENT ON COLUMN public.suppliers.legacy_id     IS 'ID_OPE del sistema anterior. Solo para migración.';
COMMENT ON COLUMN public.suppliers.email         IS 'Email de contacto del proveedor.';
COMMENT ON COLUMN public.suppliers.website       IS 'Sitio web del proveedor.';
COMMENT ON COLUMN public.suppliers.legal_name    IS 'Razón social (RAZON en sistema viejo).';
COMMENT ON COLUMN public.suppliers.iva_condition IS 'Condición IVA: RI, CF, Monotributo, Exento.';
COMMENT ON COLUMN public.suppliers.cuit          IS 'CUIT/CUIL del proveedor (NUM_IVA en sistema viejo).';
COMMENT ON COLUMN public.suppliers.postal_code   IS 'Código postal.';
COMMENT ON COLUMN public.suppliers.province      IS 'Provincia (PROVINCIA en sistema viejo).';
COMMENT ON COLUMN public.suppliers.is_airline    IS 'True si es aerolínea (AEREO en sistema viejo).';
COMMENT ON COLUMN public.suppliers.amadeus_code  IS 'Código Amadeus del proveedor.';
COMMENT ON COLUMN public.suppliers.iata_code     IS 'Código IATA (CODIGOAER en sistema viejo).';
COMMENT ON COLUMN public.suppliers.is_active     IS 'False si está en desuso (inverso de DESUSO en sistema viejo).';
