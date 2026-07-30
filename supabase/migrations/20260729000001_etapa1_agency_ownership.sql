-- Etapa 1: Propiedad por Agencia y Seguridad
-- Agrega agency_id a tablas que solo tienen user_id, backfill, y migra policies + numeración

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- 1) AGREGAR agency_id A LAS 3 TABLAS QUE LO NECESITAN
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.file_transfers
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.supplier_credit_transfers
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.wallet_transfers
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2) BACKFILL agency_id DESDE agency_members
-- ═══════════════════════════════════════════════════════════════════

-- file_transfers: copiar user_id → created_by, derivar agency_id
UPDATE public.file_transfers ft
SET
  created_by = COALESCE(ft.created_by, ft.user_id),
  agency_id = COALESCE(ft.agency_id, (
    SELECT am.agency_id FROM public.agency_members am WHERE am.user_id = ft.user_id LIMIT 1
  ))
WHERE ft.agency_id IS NULL;

-- supplier_credit_transfers
UPDATE public.supplier_credit_transfers sct
SET
  created_by = COALESCE(sct.created_by, sct.user_id),
  agency_id = COALESCE(sct.agency_id, (
    SELECT am.agency_id FROM public.agency_members am WHERE am.user_id = sct.user_id LIMIT 1
  ))
WHERE sct.agency_id IS NULL;

-- wallet_transfers
UPDATE public.wallet_transfers wt
SET
  created_by = COALESCE(wt.created_by, wt.user_id),
  agency_id = COALESCE(wt.agency_id, (
    SELECT am.agency_id FROM public.agency_members am WHERE am.user_id = wt.user_id LIMIT 1
  ))
WHERE wt.agency_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 3) CREAR ÍNDICES PARA agency_id
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS file_transfers_agency_idx ON public.file_transfers(agency_id);
CREATE INDEX IF NOT EXISTS supplier_credit_transfers_agency_idx ON public.supplier_credit_transfers(agency_id);
CREATE INDEX IF NOT EXISTS wallet_transfers_agency_idx ON public.wallet_transfers(agency_id);

-- ═══════════════════════════════════════════════════════════════════
-- 4) TRIGGER: AUTOCOMPLETAR agency_id EN INSERTS
-- ═══════════════════════════════════════════════════════════════════

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
  IF NEW.created_by IS NULL AND TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Aplicar trigger a las 3 tablas
DROP TRIGGER IF EXISTS set_agency_id_on_file_transfers ON public.file_transfers;
CREATE TRIGGER set_agency_id_on_file_transfers
  BEFORE INSERT ON public.file_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();

DROP TRIGGER IF EXISTS set_agency_id_on_supplier_credit_transfers ON public.supplier_credit_transfers;
CREATE TRIGGER set_agency_id_on_supplier_credit_transfers
  BEFORE INSERT ON public.supplier_credit_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();

DROP TRIGGER IF EXISTS set_agency_id_on_wallet_transfers ON public.wallet_transfers;
CREATE TRIGGER set_agency_id_on_wallet_transfers
  BEFORE INSERT ON public.wallet_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_agency_id_from_user();

-- ═══════════════════════════════════════════════════════════════════
-- 5) REEMPLAZAR POLICIES: de user_id a agency_id
-- ═══════════════════════════════════════════════════════════════════

-- file_transfers
DROP POLICY IF EXISTS "Users can view their own file transfers" ON public.file_transfers;
DROP POLICY IF EXISTS "Users can insert their own file transfers" ON public.file_transfers;
DROP POLICY IF EXISTS "Users can delete their own file transfers" ON public.file_transfers;

CREATE POLICY "Agency members can view file transfers" ON public.file_transfers
  FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can insert file transfers" ON public.file_transfers
  FOR INSERT WITH CHECK (agency_id = public.current_agency_id() OR agency_id IS NULL);
CREATE POLICY "Agency members can delete file transfers" ON public.file_transfers
  FOR DELETE USING (agency_id = public.current_agency_id());

-- supplier_credit_transfers
DROP POLICY IF EXISTS "Users can view their own supplier credit transfers" ON public.supplier_credit_transfers;
DROP POLICY IF EXISTS "Users can insert their own supplier credit transfers" ON public.supplier_credit_transfers;
DROP POLICY IF EXISTS "Users can delete their own supplier credit transfers" ON public.supplier_credit_transfers;

CREATE POLICY "Agency members can view supplier credit transfers" ON public.supplier_credit_transfers
  FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can insert supplier credit transfers" ON public.supplier_credit_transfers
  FOR INSERT WITH CHECK (agency_id = public.current_agency_id() OR agency_id IS NULL);
CREATE POLICY "Agency members can delete supplier credit transfers" ON public.supplier_credit_transfers
  FOR DELETE USING (agency_id = public.current_agency_id());

-- wallet_transfers
DROP POLICY IF EXISTS "Users can view their own wallet transfers" ON public.wallet_transfers;
DROP POLICY IF EXISTS "Users can insert their own wallet transfers" ON public.wallet_transfers;
DROP POLICY IF EXISTS "Users can delete their own wallet transfers" ON public.wallet_transfers;

CREATE POLICY "Agency members can view wallet transfers" ON public.wallet_transfers
  FOR SELECT USING (agency_id = public.current_agency_id());
CREATE POLICY "Agency members can insert wallet transfers" ON public.wallet_transfers
  FOR INSERT WITH CHECK (agency_id = public.current_agency_id() OR agency_id IS NULL);
CREATE POLICY "Agency members can delete wallet transfers" ON public.wallet_transfers
  FOR DELETE USING (agency_id = public.current_agency_id());

-- ═══════════════════════════════════════════════════════════════════
-- 6) NUMERACIÓN DE RECIBOS POR AGENCIA (no por usuario)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.next_receipt_number(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  next_num integer;
BEGIN
  -- Derivar la agencia del usuario
  SELECT agency_id INTO v_agency_id
  FROM public.agency_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no pertenece a ninguna agencia';
  END IF;

  -- Lock por agencia (no por usuario) para evitar duplicados
  PERFORM pg_advisory_xact_lock(hashtext('receipt_number_' || v_agency_id::text));

  -- Numeración por agencia
  SELECT COALESCE(MAX(receipt_number), 0) + 1
  INTO next_num
  FROM public.file_receipts
  WHERE agency_id = v_agency_id;

  RETURN next_num;
END;
$$;

COMMIT;
