-- Fix: ownership functions ahora verifican agency_id en vez de user_id
-- Permite que miembros de la misma agencia accedan a datos de otros miembros

-- 1) owns_reservation: verifica que la reserva pertenece a la agencia del usuario
CREATE OR REPLACE FUNCTION public.owns_reservation(_user_id uuid, _reservation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reservations
    WHERE id = _reservation_id
      AND agency_id = public.current_agency_id()
  )
$$;

-- 2) owns_flight_segment: verifica via reservations.agency_id
CREATE OR REPLACE FUNCTION public.owns_flight_segment(_user_id uuid, _segment_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flight_segments fs
    JOIN public.reservations r ON r.id = fs.reservation_id
    WHERE fs.id = _segment_id
      AND r.agency_id = public.current_agency_id()
  )
$$;

-- 3) owns_quote_tag: verifica que el tag pertenece a la agencia
CREATE OR REPLACE FUNCTION public.owns_quote_tag(_user_id uuid, _tag_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_tags
    WHERE id = _tag_id
      AND agency_id = public.current_agency_id()
  )
$$;

-- 4) owns_client_group: verifica que el grupo pertenece a la agencia
CREATE OR REPLACE FUNCTION public.owns_client_group(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_groups
    WHERE id = _group_id
      AND agency_id = public.current_agency_id()
  )
$$;
