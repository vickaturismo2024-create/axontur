CREATE OR REPLACE FUNCTION public.validate_file_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('confirmed', 'in_progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Estado de expediente inválido: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_file_status_trigger ON public.files;
CREATE TRIGGER validate_file_status_trigger
  BEFORE INSERT OR UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_file_status();