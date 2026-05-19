-- ============================================================
-- PARCHE: Auto-crear agencia para usuarios nuevos
-- ============================================================

-- Función trigger: cuando un usuario se registra, se crea su agencia automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_agency_id uuid;
BEGIN
  -- Solo si el usuario no tiene agencia
  IF NOT EXISTS (SELECT 1 FROM public.agency_members WHERE user_id = NEW.id) THEN
    -- Crear agencia
    INSERT INTO public.agencies (name, owner_id)
    VALUES ('Mi Agencia', NEW.id)
    RETURNING id INTO new_agency_id;

    -- Agregar al usuario como admin
    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (new_agency_id, NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_agency ON auth.users;
CREATE TRIGGER on_auth_user_created_agency
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_agency();

-- Backfill: crear agencia para usuarios existentes que no tienen una
DO $$
DECLARE
  r RECORD;
  new_agency_id uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT u.id AS user_id
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.agency_members am WHERE am.user_id = u.id)
  LOOP
    INSERT INTO public.agencies (name, owner_id)
    VALUES ('Mi Agencia', r.user_id)
    RETURNING id INTO new_agency_id;

    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (new_agency_id, r.user_id, 'admin');
  END LOOP;
END;
$$;
