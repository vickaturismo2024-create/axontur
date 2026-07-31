-- Etapa 5: Proveedores y Operadores - Extensión de campos, contactos y cuentas bancarias

-- 1. Agregar columnas opcionales a public.suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS cuit_tax_id        text,
  ADD COLUMN IF NOT EXISTS address            text,
  ADD COLUMN IF NOT EXISTS city               text,
  ADD COLUMN IF NOT EXISTS country            text,
  ADD COLUMN IF NOT EXISTS website            text,
  ADD COLUMN IF NOT EXISTS category           text,
  ADD COLUMN IF NOT EXISTS payment_terms_days integer;

-- 2. Crear tabla supplier_contacts (contactos operativos del proveedor)
CREATE TABLE IF NOT EXISTS public.supplier_contacts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     uuid        NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  agency_id       uuid        REFERENCES public.agencies(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  role_department text,       -- ej. "Ventas", "Reservas", "Pagos", "Guardia 24hs"
  email           text,
  phone           text,
  whatsapp        text,
  is_primary      boolean     NOT NULL DEFAULT false,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier_id ON public.supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_agency_id   ON public.supplier_contacts(agency_id);

-- RLS para supplier_contacts
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members can view supplier contacts" ON public.supplier_contacts;
CREATE POLICY "Agency members can view supplier contacts"
  ON public.supplier_contacts FOR SELECT
  USING (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency members can insert supplier contacts" ON public.supplier_contacts;
CREATE POLICY "Agency members can insert supplier contacts"
  ON public.supplier_contacts FOR INSERT
  WITH CHECK (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency members can update supplier contacts" ON public.supplier_contacts;
CREATE POLICY "Agency members can update supplier contacts"
  ON public.supplier_contacts FOR UPDATE
  USING (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency members can delete supplier contacts" ON public.supplier_contacts;
CREATE POLICY "Agency members can delete supplier contacts"
  ON public.supplier_contacts FOR DELETE
  USING (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

-- 3. Crear tabla supplier_bank_accounts (cuentas bancarias para transferencias)
CREATE TABLE IF NOT EXISTS public.supplier_bank_accounts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     uuid        NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  agency_id       uuid        REFERENCES public.agencies(id) ON DELETE CASCADE,
  bank_name       text        NOT NULL,
  account_type    text,       -- ej. "Caja de Ahorro", "Cuenta Corriente"
  currency        text        NOT NULL DEFAULT 'ARS',
  cbu_alias_iban  text,
  account_number  text,
  holder_name     text,
  holder_tax_id   text,
  is_primary      boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_bank_accounts_supplier_id ON public.supplier_bank_accounts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bank_accounts_agency_id   ON public.supplier_bank_accounts(agency_id);

-- RLS para supplier_bank_accounts
ALTER TABLE public.supplier_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members can view supplier bank accounts" ON public.supplier_bank_accounts;
CREATE POLICY "Agency members can view supplier bank accounts"
  ON public.supplier_bank_accounts FOR SELECT
  USING (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency members can insert supplier bank accounts" ON public.supplier_bank_accounts;
CREATE POLICY "Agency members can insert supplier bank accounts"
  ON public.supplier_bank_accounts FOR INSERT
  WITH CHECK (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency members can update supplier bank accounts" ON public.supplier_bank_accounts;
CREATE POLICY "Agency members can update supplier bank accounts"
  ON public.supplier_bank_accounts FOR UPDATE
  USING (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency members can delete supplier bank accounts" ON public.supplier_bank_accounts;
CREATE POLICY "Agency members can delete supplier bank accounts"
  ON public.supplier_bank_accounts FOR DELETE
  USING (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );
