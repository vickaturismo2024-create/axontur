-- Fix: set_agency_id_from_user() intentaba setear created_by en tablas que NO tienen esa columna
-- Esto causaba error 42703 en TODOS los INSERTs de clients, suppliers, files, etc.
-- Solución: verificar si la columna existe antes de setearla

CREATE OR REPLACE FUNCTION public.set_agency_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := public.current_agency_id();
  END IF;

  -- Solo setear created_by si la tabla tiene esa columna
  -- (solo file_transfers, supplier_credit_transfers, wallet_transfers la tienen)
  IF TG_OP = 'INSERT' THEN
    BEGIN
      IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
      END IF;
    EXCEPTION WHEN undefined_column THEN
      -- La tabla no tiene columna created_by, ignorar
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;
