-- Tabla de invitaciones a la agencia
CREATE TABLE public.agency_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'vendedor',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | cancelled | expired
  invited_by UUID NOT NULL,
  accepted_by UUID,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_invitations_agency ON public.agency_invitations(agency_id);
CREATE INDEX idx_agency_invitations_email ON public.agency_invitations(lower(email));
CREATE INDEX idx_agency_invitations_token ON public.agency_invitations(token);

ALTER TABLE public.agency_invitations ENABLE ROW LEVEL SECURITY;

-- Admins de la agencia ven invitaciones
CREATE POLICY "Admins can view invitations"
ON public.agency_invitations FOR SELECT
USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Admins crean invitaciones
CREATE POLICY "Admins can create invitations"
ON public.agency_invitations FOR INSERT
WITH CHECK (
  agency_id = current_agency_id()
  AND has_role(auth.uid(), 'admin'::app_role)
  AND auth.uid() = invited_by
);

-- Admins actualizan (cancelar / reenviar)
CREATE POLICY "Admins can update invitations"
ON public.agency_invitations FOR UPDATE
USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Admins eliminan
CREATE POLICY "Admins can delete invitations"
ON public.agency_invitations FOR DELETE
USING (agency_id = current_agency_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_agency_invitations_updated_at
BEFORE UPDATE ON public.agency_invitations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para aceptar invitación (SECURITY DEFINER porque inserta en agency_members)
CREATE OR REPLACE FUNCTION public.accept_agency_invitation(_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.agency_invitations;
  v_user_email TEXT;
  v_existing_member UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_invitation FROM public.agency_invitations
    WHERE token = _token LIMIT 1;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invitation_' || v_invitation.status);
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE public.agency_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RETURN jsonb_build_object('success', false, 'error', 'invitation_expired');
  END IF;

  IF lower(v_invitation.email) <> lower(v_user_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_mismatch', 'expected', v_invitation.email);
  END IF;

  -- Si ya es miembro de alguna agencia, bloquear (1 user = 1 agencia)
  SELECT id INTO v_existing_member FROM public.agency_members WHERE user_id = auth.uid() LIMIT 1;
  IF v_existing_member IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_member');
  END IF;

  INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (v_invitation.agency_id, auth.uid(), v_invitation.role);

  UPDATE public.agency_invitations
    SET status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
    WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'agency_id', v_invitation.agency_id, 'role', v_invitation.role);
END;
$$;

-- Función pública para previsualizar invitación por token (sin login)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.agency_invitations;
  v_agency_name TEXT;
BEGIN
  SELECT * INTO v_inv FROM public.agency_invitations WHERE token = _token LIMIT 1;
  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  SELECT name INTO v_agency_name FROM public.agencies WHERE id = v_inv.agency_id;
  RETURN jsonb_build_object(
    'found', true,
    'email', v_inv.email,
    'role', v_inv.role,
    'status', v_inv.status,
    'expires_at', v_inv.expires_at,
    'agency_name', v_agency_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_agency_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon, authenticated;