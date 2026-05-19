-- ============================================================
-- PARCHE: Aplica las mejoras de Claude sobre las 6 migraciones
-- ya aplicadas (comments, constraints, índices faltantes)
-- ============================================================

-- ── 1. COMMENTS en clients ──────────────────────────────────
COMMENT ON COLUMN public.clients.legacy_id     IS 'ID_CLI del sistema anterior. Solo para migración.';
COMMENT ON COLUMN public.clients.company_name  IS 'Razón social o empresa del cliente (RAZON en sistema viejo).';
COMMENT ON COLUMN public.clients.address_work  IS 'Dirección comercial (DIR_COM en sistema viejo).';
COMMENT ON COLUMN public.clients.civil_status  IS 'Estado civil (CIVIL en sistema viejo).';
COMMENT ON COLUMN public.clients.occupation    IS 'Ocupación (OCUPACION en sistema viejo).';
COMMENT ON COLUMN public.clients.postal_code   IS 'Código postal (POSTAL en sistema viejo).';
COMMENT ON COLUMN public.clients.referred_by   IS 'Promotor o referido (PROMOTOR en sistema viejo).';
COMMENT ON COLUMN public.clients.category      IS 'Categoría del cliente (ID_CAT en sistema viejo).';
COMMENT ON COLUMN public.clients.iva_condition IS 'Condición frente al IVA: CF, RI, Monotributo, etc.';

-- ── 2. COMMENTS en suppliers ────────────────────────────────
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

-- ── 3. Mejoras en supplier_bank_accounts ────────────────────

-- Índice único: solo 1 cuenta primaria por proveedor+moneda
CREATE UNIQUE INDEX IF NOT EXISTS supplier_bank_accounts_primary_unique
  ON public.supplier_bank_accounts (supplier_id, currency)
  WHERE is_primary = true;

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS supplier_bank_accounts_supplier_idx
  ON public.supplier_bank_accounts (supplier_id);
CREATE INDEX IF NOT EXISTS supplier_bank_accounts_agency_idx
  ON public.supplier_bank_accounts (agency_id);

-- CHECK constraints
DO $$ BEGIN
  ALTER TABLE public.supplier_bank_accounts
    ADD CONSTRAINT supplier_bank_accounts_type_check
    CHECK (account_type IN ('CC', 'CA', 'virtual', 'otro'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.supplier_bank_accounts
    ADD CONSTRAINT supplier_bank_accounts_currency_check
    CHECK (currency IN ('ARS', 'USD', 'EUR', 'otro'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reemplazar política DELETE para que solo admin pueda borrar
DROP POLICY IF EXISTS "Agency members can delete bank accounts" ON public.supplier_bank_accounts;
CREATE POLICY "admin can delete supplier bank accounts"
  ON public.supplier_bank_accounts FOR DELETE
  USING (
    agency_id = current_agency_id()
    AND has_role(auth.uid(), 'admin')
  );

-- Comments
COMMENT ON TABLE  public.supplier_bank_accounts              IS 'Cuentas bancarias de proveedores. Una por fila, múltiples por proveedor.';
COMMENT ON COLUMN public.supplier_bank_accounts.is_primary   IS 'Cuenta principal para pagos en esa moneda. Única por proveedor+moneda.';
COMMENT ON COLUMN public.supplier_bank_accounts.account_type IS 'CC=Cuenta Corriente, CA=Caja de Ahorro, virtual=cuenta virtual.';
COMMENT ON COLUMN public.supplier_bank_accounts.holder_name  IS 'Nombre del titular de la cuenta bancaria.';

-- ── 4. Mejoras en files ─────────────────────────────────────

-- Renombrar advance_amount a advance_amount_ars y agregar advance_amount_usd
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS advance_amount_ars numeric DEFAULT 0;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS advance_amount_usd numeric DEFAULT 0;

-- Copiar datos si existía la columna vieja
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='files' AND column_name='advance_amount') THEN
    UPDATE public.files SET advance_amount_ars = advance_amount WHERE advance_amount IS NOT NULL AND advance_amount <> 0;
    ALTER TABLE public.files DROP COLUMN advance_amount;
  END IF;
END $$;

-- Índices adicionales
CREATE INDEX IF NOT EXISTS files_is_liquidated_idx
  ON public.files (agency_id, is_liquidated)
  WHERE is_liquidated = false;

CREATE INDEX IF NOT EXISTS files_expiry_date_idx
  ON public.files (agency_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

-- Comments
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

-- ── 5. COMMENTS en file_passengers y file_supplier_payments ─
COMMENT ON COLUMN public.file_passengers.occupation    IS 'Ocupación del pasajero (OCUPACIO en sistema viejo).';
COMMENT ON COLUMN public.file_passengers.iva_condition IS 'Condición IVA del pasajero (CONDIVA_ en sistema viejo).';
COMMENT ON COLUMN public.file_passengers.cuil_cuit     IS 'CUIL o CUIT del pasajero (CUIT_ en sistema viejo).';

COMMENT ON COLUMN public.file_supplier_payments.reference_number IS 'Número de referencia en el sistema del operador (DETALLE en sistema viejo).';
COMMENT ON COLUMN public.file_supplier_payments.invoice_number   IS 'Número de factura del operador (FACTURAS en sistema viejo).';

-- ── 6. Mejoras en file_operators ────────────────────────────

-- Hacer supplier_name NOT NULL (agregar valor por defecto primero)
UPDATE public.file_operators SET supplier_name = '' WHERE supplier_name IS NULL;
ALTER TABLE public.file_operators ALTER COLUMN supplier_name SET NOT NULL;

-- Hacer columnas numéricas NOT NULL
ALTER TABLE public.file_operators ALTER COLUMN cost_ars SET NOT NULL;
ALTER TABLE public.file_operators ALTER COLUMN price_ars SET NOT NULL;
ALTER TABLE public.file_operators ALTER COLUMN paid_ars SET NOT NULL;
ALTER TABLE public.file_operators ALTER COLUMN cost_usd SET NOT NULL;
ALTER TABLE public.file_operators ALTER COLUMN price_usd SET NOT NULL;
ALTER TABLE public.file_operators ALTER COLUMN paid_usd SET NOT NULL;

-- Índices adicionales
CREATE INDEX IF NOT EXISTS file_operators_file_idx
  ON public.file_operators (file_id);
CREATE INDEX IF NOT EXISTS file_operators_supplier_idx
  ON public.file_operators (supplier_id)
  WHERE supplier_id IS NOT NULL;

-- Reemplazar política DELETE para que solo admin pueda borrar
DROP POLICY IF EXISTS "Agency members can delete file operators" ON public.file_operators;
CREATE POLICY "admin can delete file operators"
  ON public.file_operators FOR DELETE
  USING (
    agency_id = current_agency_id()
    AND has_role(auth.uid(), 'admin')
  );

-- Comments
COMMENT ON TABLE  public.file_operators                  IS 'Operadores/proveedores por expediente con costos y pagos individuales. Basado en lisreservaop12.xlsx.';
COMMENT ON COLUMN public.file_operators.supplier_name    IS 'Nombre del operador. Siempre requerido aunque supplier_id sea null.';
COMMENT ON COLUMN public.file_operators.legacy_ope_id    IS 'ID_OPE del sistema anterior. Para cruzar datos en migración.';
COMMENT ON COLUMN public.file_operators.reference_number IS 'Número de referencia en el sistema del operador (DETALLE en sistema viejo).';
COMMENT ON COLUMN public.file_operators.invoice_number   IS 'Número de factura del operador.';
