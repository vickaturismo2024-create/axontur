
-- ============================================
-- Fase B: Restricciones por rol Admin/Vendedor
-- ============================================

-- Helper: refuerzo de DELETE en tablas sensibles (solo admin)

-- quotes
DROP POLICY IF EXISTS "Agency members can delete quotes" ON public.quotes;
CREATE POLICY "Admins can delete quotes" ON public.quotes
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- clients
DROP POLICY IF EXISTS "Agency members can delete clients" ON public.clients;
CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- files
DROP POLICY IF EXISTS "Agency members can delete files" ON public.files;
CREATE POLICY "Admins can delete files" ON public.files
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- file_receipts
DROP POLICY IF EXISTS "Agency members can delete file receipts" ON public.file_receipts;
CREATE POLICY "Admins can delete file receipts" ON public.file_receipts
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- file_receipt_items
DROP POLICY IF EXISTS "Agency members can delete receipt items" ON public.file_receipt_items;
CREATE POLICY "Admins can delete receipt items" ON public.file_receipt_items
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- file_supplier_payments
DROP POLICY IF EXISTS "Agency members can delete supplier payments" ON public.file_supplier_payments;
CREATE POLICY "Admins can delete supplier payments" ON public.file_supplier_payments
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- reservations
DROP POLICY IF EXISTS "Agency members can delete reservations" ON public.reservations;
CREATE POLICY "Admins can delete reservations" ON public.reservations
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- quote_tags
DROP POLICY IF EXISTS "Agency members can delete tags" ON public.quote_tags;
CREATE POLICY "Admins can delete tags" ON public.quote_tags
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- client_groups
DROP POLICY IF EXISTS "Agency members can delete groups" ON public.client_groups;
CREATE POLICY "Admins can delete groups" ON public.client_groups
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- quote_versions
DROP POLICY IF EXISTS "Agency members can delete quote versions" ON public.quote_versions;
CREATE POLICY "Admins can delete quote versions" ON public.quote_versions
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- file_passengers
DROP POLICY IF EXISTS "Agency members can delete file passengers" ON public.file_passengers;
CREATE POLICY "Admins can delete file passengers" ON public.file_passengers
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- file_services
DROP POLICY IF EXISTS "Agency members can delete file services" ON public.file_services;
CREATE POLICY "Admins can delete file services" ON public.file_services
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- payments (pagos del presupuesto)
DROP POLICY IF EXISTS "Agency members can delete payments" ON public.payments;
CREATE POLICY "Admins can delete payments" ON public.payments
  FOR DELETE USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'));

-- ============================================
-- account_movements: INSERT/UPDATE/DELETE manual SOLO admin
-- (los movimientos automáticos generados por triggers SECURITY DEFINER siguen pasando)
-- ============================================

DROP POLICY IF EXISTS "Agency members can create movements" ON public.account_movements;
CREATE POLICY "Admins can create movements" ON public.account_movements
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (agency_id = current_agency_id() OR agency_id IS NULL)
    AND has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Agency members can update movements" ON public.account_movements;
CREATE POLICY "Admins can update movements" ON public.account_movements
  FOR UPDATE USING (
    agency_id = current_agency_id() AND has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Agency members can delete movements" ON public.account_movements;
CREATE POLICY "Admins can delete movements" ON public.account_movements
  FOR DELETE USING (
    agency_id = current_agency_id() AND has_role(auth.uid(), 'admin')
  );
