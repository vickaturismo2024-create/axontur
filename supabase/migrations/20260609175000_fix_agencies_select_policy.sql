-- ============================================================
-- PARCHE: Permitir al dueño leer su agencia recién creada (evita error RLS en insert.select)
-- ============================================================

DROP POLICY IF EXISTS "Members can view their agency" ON public.agencies;

CREATE POLICY "Members and owners can view their agency"
  ON public.agencies FOR SELECT
  USING (public.is_agency_member(id, auth.uid()) OR auth.uid() = owner_id);
