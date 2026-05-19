-- ============================================================
-- MIGRACIÓN 6: Tabla file_operators (nueva)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.file_operators (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        uuid        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  file_id          uuid        NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  supplier_id      uuid        REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name    text        NOT NULL,
  legacy_ope_id    integer,
  cost_ars         numeric     NOT NULL DEFAULT 0,
  price_ars        numeric     NOT NULL DEFAULT 0,
  paid_ars         numeric     NOT NULL DEFAULT 0,
  cost_usd         numeric     NOT NULL DEFAULT 0,
  price_usd        numeric     NOT NULL DEFAULT 0,
  paid_usd         numeric     NOT NULL DEFAULT 0,
  invoice_number   text,
  reference_number text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS file_operators_file_idx
  ON public.file_operators (file_id);

CREATE INDEX IF NOT EXISTS file_operators_supplier_idx
  ON public.file_operators (supplier_id)
  WHERE supplier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS file_operators_agency_idx
  ON public.file_operators (agency_id);

CREATE TRIGGER file_operators_updated_at
  BEFORE UPDATE ON public.file_operators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.file_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members can select file operators"
  ON public.file_operators FOR SELECT
  USING (agency_id = current_agency_id());

CREATE POLICY "agency members can insert file operators"
  ON public.file_operators FOR INSERT
  WITH CHECK (agency_id = current_agency_id());

CREATE POLICY "agency members can update file operators"
  ON public.file_operators FOR UPDATE
  USING (agency_id = current_agency_id());

CREATE POLICY "admin can delete file operators"
  ON public.file_operators FOR DELETE
  USING (
    agency_id = current_agency_id()
    AND has_role(auth.uid(), 'admin')
  );

COMMENT ON TABLE  public.file_operators                  IS 'Operadores/proveedores por expediente con costos y pagos individuales. Basado en lisreservaop12.xlsx.';
COMMENT ON COLUMN public.file_operators.supplier_name    IS 'Nombre del operador. Siempre requerido aunque supplier_id sea null.';
COMMENT ON COLUMN public.file_operators.legacy_ope_id    IS 'ID_OPE del sistema anterior. Para cruzar datos en migración.';
COMMENT ON COLUMN public.file_operators.reference_number IS 'Número de referencia en el sistema del operador (DETALLE en sistema viejo).';
COMMENT ON COLUMN public.file_operators.invoice_number   IS 'Número de factura del operador.';
