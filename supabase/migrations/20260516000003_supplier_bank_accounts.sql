-- ============================================================
-- MIGRACIÓN 3: Tabla supplier_bank_accounts (nueva)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.supplier_bank_accounts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     uuid        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  supplier_id   uuid        NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  bank_name     text        NOT NULL,
  account_type  text        NOT NULL DEFAULT 'CC',
  currency      text        NOT NULL DEFAULT 'ARS',
  cbu           text,
  alias         text,
  holder_name   text,
  is_primary    boolean     NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_bank_accounts_primary_unique
  ON public.supplier_bank_accounts (supplier_id, currency)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS supplier_bank_accounts_supplier_idx
  ON public.supplier_bank_accounts (supplier_id);

CREATE INDEX IF NOT EXISTS supplier_bank_accounts_agency_idx
  ON public.supplier_bank_accounts (agency_id);

ALTER TABLE public.supplier_bank_accounts
  ADD CONSTRAINT supplier_bank_accounts_type_check
  CHECK (account_type IN ('CC', 'CA', 'virtual', 'otro'));

ALTER TABLE public.supplier_bank_accounts
  ADD CONSTRAINT supplier_bank_accounts_currency_check
  CHECK (currency IN ('ARS', 'USD', 'EUR', 'otro'));

CREATE TRIGGER supplier_bank_accounts_updated_at
  BEFORE UPDATE ON public.supplier_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.supplier_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members can select supplier bank accounts"
  ON public.supplier_bank_accounts FOR SELECT
  USING (agency_id = current_agency_id());

CREATE POLICY "agency members can insert supplier bank accounts"
  ON public.supplier_bank_accounts FOR INSERT
  WITH CHECK (agency_id = current_agency_id());

CREATE POLICY "agency members can update supplier bank accounts"
  ON public.supplier_bank_accounts FOR UPDATE
  USING (agency_id = current_agency_id());

CREATE POLICY "admin can delete supplier bank accounts"
  ON public.supplier_bank_accounts FOR DELETE
  USING (
    agency_id = current_agency_id()
    AND has_role(auth.uid(), 'admin')
  );

COMMENT ON TABLE  public.supplier_bank_accounts              IS 'Cuentas bancarias de proveedores. Una por fila, múltiples por proveedor.';
COMMENT ON COLUMN public.supplier_bank_accounts.is_primary   IS 'Cuenta principal para pagos en esa moneda. Única por proveedor+moneda.';
COMMENT ON COLUMN public.supplier_bank_accounts.account_type IS 'CC=Cuenta Corriente, CA=Caja de Ahorro, virtual=cuenta virtual.';
COMMENT ON COLUMN public.supplier_bank_accounts.holder_name  IS 'Nombre del titular de la cuenta bancaria.';
