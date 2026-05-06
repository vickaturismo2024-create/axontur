CREATE OR REPLACE FUNCTION public.assign_user_to_agency(_email text, _role app_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_agency_id uuid;
  v_user_id uuid;
  v_existing uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  v_agency_id := public.current_agency_id();
  IF v_agency_id IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  IF _email IS NULL OR length(trim(_email)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  SELECT id INTO v_user_id FROM auth.users
    WHERE lower(email) = lower(trim(_email))
    LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  SELECT id INTO v_existing FROM public.agency_members WHERE user_id = v_user_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_member');
  END IF;

  INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (v_agency_id, v_user_id, _role);

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'role', _role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_user_to_agency(text, app_role) TO authenticated;