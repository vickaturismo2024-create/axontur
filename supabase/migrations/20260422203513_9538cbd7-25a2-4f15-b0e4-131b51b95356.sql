
-- Fijar search_path en las funciones nuevas (warnings del linter)
ALTER FUNCTION public.current_agency_id() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.is_agency_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.set_agency_id_from_user() SET search_path = public;
