-- ============================================================
-- PARCHE: Evitar auto-creación de agencia para invitados
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_agency_id uuid;
BEGIN
  -- Solo si el usuario no tiene agencia registrada en agency_members
  IF NOT EXISTS (SELECT 1 FROM public.agency_members WHERE user_id = NEW.id) THEN
    -- Y si no tiene invitaciones pendientes en agency_invitations para su correo (con control de nulos)
    IF NOT EXISTS (
      SELECT 1 FROM public.agency_invitations 
      WHERE lower(email) = lower(coalesce(NEW.email, '')) AND status = 'pending'
    ) THEN
      -- Crear la agencia por defecto "Mi Agencia"
      INSERT INTO public.agencies (name, owner_id)
      VALUES ('Mi Agencia', NEW.id)
      RETURNING id INTO new_agency_id;

      -- Agregar al usuario como administrador (admin)
      INSERT INTO public.agency_members (agency_id, user_id, role)
      VALUES (new_agency_id, NEW.id, 'admin');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Volver a crear el trigger para asegurar consistencia
DROP TRIGGER IF EXISTS on_auth_user_created_agency ON auth.users;
CREATE TRIGGER on_auth_user_created_agency
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_agency();
