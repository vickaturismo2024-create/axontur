
-- ============================================================
-- FASE A — Multi-tenant: Agencias y miembros
-- ============================================================

-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'vendedor');

-- 2. Tabla de agencias
CREATE TABLE public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Mi Agencia',
  cuit text,
  address text,
  phone text,
  email text,
  logo_url text,
  website text,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- 3. Tabla de miembros
CREATE TABLE public.agency_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'vendedor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id) -- 1 usuario = 1 agencia (por ahora)
);

ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_agency_members_agency_id ON public.agency_members(agency_id);
CREATE INDEX idx_agency_members_user_id ON public.agency_members(user_id);

-- 4. Funciones helper SECURITY DEFINER (evitan recursión RLS)
CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_agency_member(_agency_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE agency_id = _agency_id AND user_id = _user_id
  )
$$;

-- 5. RLS para agencies
CREATE POLICY "Members can view their agency"
  ON public.agencies FOR SELECT
  USING (public.is_agency_member(id, auth.uid()));

CREATE POLICY "Admins can update their agency"
  ON public.agencies FOR UPDATE
  USING (public.is_agency_member(id, auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can insert agencies"
  ON public.agencies FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- 6. RLS para agency_members
CREATE POLICY "Members can view their agency members"
  ON public.agency_members FOR SELECT
  USING (agency_id = public.current_agency_id());

CREATE POLICY "Admins can insert members"
  ON public.agency_members FOR INSERT
  WITH CHECK (
    agency_id = public.current_agency_id() AND public.has_role(auth.uid(), 'admin')
    OR
    -- Permite el primer insert (cuando uno crea su agencia)
    NOT EXISTS (SELECT 1 FROM public.agency_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update members"
  ON public.agency_members FOR UPDATE
  USING (agency_id = public.current_agency_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete members"
  ON public.agency_members FOR DELETE
  USING (agency_id = public.current_agency_id() AND public.has_role(auth.uid(), 'admin'));

-- 7. Trigger updated_at en agencies
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8. Agregar columna agency_id a todas las tablas operativas
-- ============================================================
ALTER TABLE public.quotes ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.files ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.file_receipts ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.file_receipt_items ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.file_services ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.file_supplier_payments ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.file_passengers ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.account_movements ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.templates ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.quote_tags ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.quote_versions ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.client_groups ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.client_notes ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.reservations ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.reminders ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.email_logs ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.exchange_rate_log ADD COLUMN agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;

-- ============================================================
-- 9. Backfill: crear agencias desde profiles existentes
-- ============================================================
INSERT INTO public.agencies (name, cuit, address, phone, email, logo_url, website, owner_id)
SELECT
  COALESCE(NULLIF(TRIM(p.agency_name), ''), 'Mi Agencia'),
  p.cuit, p.address, p.phone, p.email, p.logo_url, p.website,
  p.user_id
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.agencies a WHERE a.owner_id = p.user_id);

-- Para usuarios SIN profile pero con datos (por las dudas)
INSERT INTO public.agencies (name, owner_id)
SELECT DISTINCT 'Mi Agencia', q.user_id
FROM public.quotes q
WHERE NOT EXISTS (SELECT 1 FROM public.agencies a WHERE a.owner_id = q.user_id);

-- Insertar a cada owner como admin
INSERT INTO public.agency_members (agency_id, user_id, role)
SELECT a.id, a.owner_id, 'admin'::public.app_role
FROM public.agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_members m WHERE m.user_id = a.owner_id
);

-- ============================================================
-- 10. Backfill agency_id en todas las tablas
-- ============================================================
UPDATE public.quotes q SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = q.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.clients t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.suppliers t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.files t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.file_receipts t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.file_receipt_items t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.file_services t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.file_supplier_payments t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.file_passengers t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.account_movements t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.payments t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.templates t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.quote_tags t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.quote_versions t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.client_groups t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.client_notes t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.reservations t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.reminders t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.email_logs t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;
UPDATE public.exchange_rate_log t SET agency_id = (SELECT id FROM public.agencies WHERE owner_id = t.user_id LIMIT 1) WHERE agency_id IS NULL;

-- ============================================================
-- 11. Índices para performance en queries por agency_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_quotes_agency_id ON public.quotes(agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON public.clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_agency_id ON public.suppliers(agency_id);
CREATE INDEX IF NOT EXISTS idx_files_agency_id ON public.files(agency_id);
CREATE INDEX IF NOT EXISTS idx_file_receipts_agency_id ON public.file_receipts(agency_id);
CREATE INDEX IF NOT EXISTS idx_file_services_agency_id ON public.file_services(agency_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_agency_id ON public.account_movements(agency_id);
CREATE INDEX IF NOT EXISTS idx_reservations_agency_id ON public.reservations(agency_id);

-- ============================================================
-- 12. Actualizar RLS: ahora se filtra por agency_id (mantiene retro-compat)
-- ============================================================
-- Las políticas viejas siguen activas pero AGREGAMOS soporte por agencia.
-- Los inserts nuevos llenarán agency_id automáticamente vía trigger.

-- Trigger genérico: si no se pasa agency_id, autocompletar con la del usuario
CREATE OR REPLACE FUNCTION public.set_agency_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := public.current_agency_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicar trigger a todas las tablas con agency_id
CREATE TRIGGER set_agency_id_quotes BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_clients BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_suppliers BEFORE INSERT ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_files BEFORE INSERT ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_file_receipts BEFORE INSERT ON public.file_receipts FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_file_receipt_items BEFORE INSERT ON public.file_receipt_items FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_file_services BEFORE INSERT ON public.file_services FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_file_supplier_payments BEFORE INSERT ON public.file_supplier_payments FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_file_passengers BEFORE INSERT ON public.file_passengers FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_account_movements BEFORE INSERT ON public.account_movements FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_payments BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_templates BEFORE INSERT ON public.templates FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_quote_tags BEFORE INSERT ON public.quote_tags FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_quote_versions BEFORE INSERT ON public.quote_versions FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_client_groups BEFORE INSERT ON public.client_groups FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_client_notes BEFORE INSERT ON public.client_notes FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_reservations BEFORE INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_reminders BEFORE INSERT ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_email_logs BEFORE INSERT ON public.email_logs FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();
CREATE TRIGGER set_agency_id_exchange_rate_log BEFORE INSERT ON public.exchange_rate_log FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();

-- ============================================================
-- 13. Reemplazar políticas RLS: pasar de user_id a agency_id
-- ============================================================
-- QUOTES
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;
CREATE POLICY "Agency members can view quotes" ON public.quotes FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update quotes" ON public.quotes FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete quotes" ON public.quotes FOR DELETE USING (agency_id = public.current_agency_id());

-- CLIENTS
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
CREATE POLICY "Agency members can view clients" ON public.clients FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update clients" ON public.clients FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete clients" ON public.clients FOR DELETE USING (agency_id = public.current_agency_id());

-- SUPPLIERS
DROP POLICY IF EXISTS "Users can view their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can create their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update their own suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete their own suppliers" ON public.suppliers;
CREATE POLICY "Agency members can view suppliers" ON public.suppliers FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create suppliers" ON public.suppliers FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update suppliers" ON public.suppliers FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete suppliers" ON public.suppliers FOR DELETE USING (agency_id = public.current_agency_id());

-- FILES
DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
DROP POLICY IF EXISTS "Users can create their own files" ON public.files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;
CREATE POLICY "Agency members can view files" ON public.files FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create files" ON public.files FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update files" ON public.files FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete files" ON public.files FOR DELETE USING (agency_id = public.current_agency_id());

-- FILE_RECEIPTS
DROP POLICY IF EXISTS "Users can view their own file receipts" ON public.file_receipts;
DROP POLICY IF EXISTS "Users can create their own file receipts" ON public.file_receipts;
DROP POLICY IF EXISTS "Users can update their own file receipts" ON public.file_receipts;
DROP POLICY IF EXISTS "Users can delete their own file receipts" ON public.file_receipts;
CREATE POLICY "Agency members can view file receipts" ON public.file_receipts FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create file receipts" ON public.file_receipts FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update file receipts" ON public.file_receipts FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete file receipts" ON public.file_receipts FOR DELETE USING (agency_id = public.current_agency_id());

-- FILE_RECEIPT_ITEMS
DROP POLICY IF EXISTS "Users can view their own receipt items" ON public.file_receipt_items;
DROP POLICY IF EXISTS "Users can create their own receipt items" ON public.file_receipt_items;
DROP POLICY IF EXISTS "Users can update their own receipt items" ON public.file_receipt_items;
DROP POLICY IF EXISTS "Users can delete their own receipt items" ON public.file_receipt_items;
CREATE POLICY "Agency members can view receipt items" ON public.file_receipt_items FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create receipt items" ON public.file_receipt_items FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update receipt items" ON public.file_receipt_items FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete receipt items" ON public.file_receipt_items FOR DELETE USING (agency_id = public.current_agency_id());

-- FILE_SERVICES
DROP POLICY IF EXISTS "Users can view their own file services" ON public.file_services;
DROP POLICY IF EXISTS "Users can create their own file services" ON public.file_services;
DROP POLICY IF EXISTS "Users can update their own file services" ON public.file_services;
DROP POLICY IF EXISTS "Users can delete their own file services" ON public.file_services;
CREATE POLICY "Agency members can view file services" ON public.file_services FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create file services" ON public.file_services FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update file services" ON public.file_services FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete file services" ON public.file_services FOR DELETE USING (agency_id = public.current_agency_id());

-- FILE_SUPPLIER_PAYMENTS
DROP POLICY IF EXISTS "Users can view their own supplier payments" ON public.file_supplier_payments;
DROP POLICY IF EXISTS "Users can create their own supplier payments" ON public.file_supplier_payments;
DROP POLICY IF EXISTS "Users can update their own supplier payments" ON public.file_supplier_payments;
DROP POLICY IF EXISTS "Users can delete their own supplier payments" ON public.file_supplier_payments;
CREATE POLICY "Agency members can view supplier payments" ON public.file_supplier_payments FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create supplier payments" ON public.file_supplier_payments FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update supplier payments" ON public.file_supplier_payments FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete supplier payments" ON public.file_supplier_payments FOR DELETE USING (agency_id = public.current_agency_id());

-- FILE_PASSENGERS
DROP POLICY IF EXISTS "Users can view their own file passengers" ON public.file_passengers;
DROP POLICY IF EXISTS "Users can create their own file passengers" ON public.file_passengers;
DROP POLICY IF EXISTS "Users can update their own file passengers" ON public.file_passengers;
DROP POLICY IF EXISTS "Users can delete their own file passengers" ON public.file_passengers;
CREATE POLICY "Agency members can view file passengers" ON public.file_passengers FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create file passengers" ON public.file_passengers FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update file passengers" ON public.file_passengers FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete file passengers" ON public.file_passengers FOR DELETE USING (agency_id = public.current_agency_id());

-- ACCOUNT_MOVEMENTS
DROP POLICY IF EXISTS "Users can view their own movements" ON public.account_movements;
DROP POLICY IF EXISTS "Users can create their own movements" ON public.account_movements;
DROP POLICY IF EXISTS "Users can update their own movements" ON public.account_movements;
DROP POLICY IF EXISTS "Users can delete their own movements" ON public.account_movements;
CREATE POLICY "Agency members can view movements" ON public.account_movements FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create movements" ON public.account_movements FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update movements" ON public.account_movements FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete movements" ON public.account_movements FOR DELETE USING (agency_id = public.current_agency_id());

-- PAYMENTS
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;
CREATE POLICY "Agency members can view payments" ON public.payments FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update payments" ON public.payments FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete payments" ON public.payments FOR DELETE USING (agency_id = public.current_agency_id());

-- TEMPLATES
DROP POLICY IF EXISTS "Users can view their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates;
CREATE POLICY "Agency members can view templates" ON public.templates FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create templates" ON public.templates FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update templates" ON public.templates FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete templates" ON public.templates FOR DELETE USING (agency_id = public.current_agency_id());

-- QUOTE_TAGS
DROP POLICY IF EXISTS "Users can view their own tags" ON public.quote_tags;
DROP POLICY IF EXISTS "Users can create their own tags" ON public.quote_tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.quote_tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.quote_tags;
CREATE POLICY "Agency members can view tags" ON public.quote_tags FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create tags" ON public.quote_tags FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update tags" ON public.quote_tags FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete tags" ON public.quote_tags FOR DELETE USING (agency_id = public.current_agency_id());

-- QUOTE_VERSIONS
DROP POLICY IF EXISTS "Users can view their own quote versions" ON public.quote_versions;
DROP POLICY IF EXISTS "Users can create their own quote versions" ON public.quote_versions;
DROP POLICY IF EXISTS "Users can delete their own quote versions" ON public.quote_versions;
CREATE POLICY "Agency members can view quote versions" ON public.quote_versions FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create quote versions" ON public.quote_versions FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can delete quote versions" ON public.quote_versions FOR DELETE USING (agency_id = public.current_agency_id());

-- CLIENT_GROUPS
DROP POLICY IF EXISTS "Users can view their own groups" ON public.client_groups;
DROP POLICY IF EXISTS "Users can create their own groups" ON public.client_groups;
DROP POLICY IF EXISTS "Users can update their own groups" ON public.client_groups;
DROP POLICY IF EXISTS "Users can delete their own groups" ON public.client_groups;
CREATE POLICY "Agency members can view groups" ON public.client_groups FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create groups" ON public.client_groups FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update groups" ON public.client_groups FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete groups" ON public.client_groups FOR DELETE USING (agency_id = public.current_agency_id());

-- CLIENT_NOTES
DROP POLICY IF EXISTS "Users can view their own client notes" ON public.client_notes;
DROP POLICY IF EXISTS "Users can create their own client notes" ON public.client_notes;
DROP POLICY IF EXISTS "Users can update their own client notes" ON public.client_notes;
DROP POLICY IF EXISTS "Users can delete their own client notes" ON public.client_notes;
CREATE POLICY "Agency members can view client notes" ON public.client_notes FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create client notes" ON public.client_notes FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update client notes" ON public.client_notes FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete client notes" ON public.client_notes FOR DELETE USING (agency_id = public.current_agency_id());

-- RESERVATIONS
DROP POLICY IF EXISTS "Users can view their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can create their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can update their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can delete their own reservations" ON public.reservations;
CREATE POLICY "Agency members can view reservations" ON public.reservations FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create reservations" ON public.reservations FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update reservations" ON public.reservations FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete reservations" ON public.reservations FOR DELETE USING (agency_id = public.current_agency_id());

-- REMINDERS
DROP POLICY IF EXISTS "Users can view their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can create their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.reminders;
CREATE POLICY "Agency members can view reminders" ON public.reminders FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
CREATE POLICY "Agency members can update reminders" ON public.reminders FOR UPDATE USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can delete reminders" ON public.reminders FOR DELETE USING (agency_id = public.current_agency_id());

-- EMAIL_LOGS
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Users can insert their own email logs" ON public.email_logs;
CREATE POLICY "Agency members can view email logs" ON public.email_logs FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can insert email logs" ON public.email_logs FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));

-- EXCHANGE_RATE_LOG
DROP POLICY IF EXISTS "Users can view their rate log" ON public.exchange_rate_log;
DROP POLICY IF EXISTS "Users can create their rate log" ON public.exchange_rate_log;
CREATE POLICY "Agency members can view rate log" ON public.exchange_rate_log FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can create rate log" ON public.exchange_rate_log FOR INSERT WITH CHECK (auth.uid() = user_id AND (agency_id = public.current_agency_id() OR agency_id IS NULL));
