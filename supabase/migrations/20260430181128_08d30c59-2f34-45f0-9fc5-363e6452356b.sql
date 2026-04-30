-- 1. Listar miembros con email real
CREATE OR REPLACE FUNCTION public.get_agency_members_with_email(_agency_id uuid)
RETURNS TABLE(id uuid, user_id uuid, email text, role app_role, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_agency_member(_agency_id, auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
    SELECT m.id, m.user_id, u.email::text, m.role, m.created_at
    FROM public.agency_members m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.agency_id = _agency_id
    ORDER BY m.created_at;
END;
$$;

-- 2. Reactivar invitación (admin only)
CREATE OR REPLACE FUNCTION public.reactivate_invitation(_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.agency_invitations;
  v_new_token text;
BEGIN
  SELECT * INTO v_inv FROM public.agency_invitations WHERE id = _invitation_id;
  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF NOT (v_inv.agency_id = public.current_agency_id() AND public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  IF v_inv.status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_accepted');
  END IF;

  v_new_token := encode(extensions.gen_random_bytes(24), 'hex');

  UPDATE public.agency_invitations
    SET status = 'pending',
        expires_at = now() + interval '7 days',
        token = v_new_token,
        updated_at = now()
    WHERE id = _invitation_id;

  RETURN jsonb_build_object('success', true, 'token', v_new_token);
END;
$$;