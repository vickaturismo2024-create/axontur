-- ============================================================
-- MIGRACIÓN 5: Columnas en file_passengers y file_supplier_payments
-- ============================================================

ALTER TABLE public.file_passengers
  ADD COLUMN IF NOT EXISTS occupation    text,
  ADD COLUMN IF NOT EXISTS iva_condition text,
  ADD COLUMN IF NOT EXISTS cuil_cuit     text;

COMMENT ON COLUMN public.file_passengers.occupation    IS 'Ocupación del pasajero (OCUPACIO en sistema viejo).';
COMMENT ON COLUMN public.file_passengers.iva_condition IS 'Condición IVA del pasajero (CONDIVA_ en sistema viejo).';
COMMENT ON COLUMN public.file_passengers.cuil_cuit     IS 'CUIL o CUIT del pasajero (CUIT_ en sistema viejo).';

ALTER TABLE public.file_supplier_payments
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS invoice_number   text;

COMMENT ON COLUMN public.file_supplier_payments.reference_number IS 'Número de referencia en el sistema del operador (DETALLE en sistema viejo).';
COMMENT ON COLUMN public.file_supplier_payments.invoice_number   IS 'Número de factura del operador (FACTURAS en sistema viejo).';
