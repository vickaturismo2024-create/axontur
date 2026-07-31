-- Migration: Fix receipt numbering to be strictly consecutive per agency
-- Fixes the set_receipt_number() trigger function which was previously calculating MAX(receipt_number) per user_id

-- 1. Ensure all file_receipts have agency_id populated via agency_members
UPDATE public.file_receipts fr
SET agency_id = am.agency_id
FROM public.agency_members am
WHERE fr.user_id = am.user_id
  AND fr.agency_id IS NULL;

-- Fallback for agency owners if not in agency_members
UPDATE public.file_receipts fr
SET agency_id = a.id
FROM public.agencies a
WHERE fr.user_id = a.owner_id
  AND fr.agency_id IS NULL;

-- 2. Update set_receipt_number() trigger function to calculate per agency_id
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_id uuid;
  v_max_num integer;
BEGIN
  -- Determine agency_id
  v_agency_id := NEW.agency_id;

  IF v_agency_id IS NULL THEN
    SELECT agency_id INTO v_agency_id
    FROM public.agency_members
    WHERE user_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF v_agency_id IS NULL THEN
    SELECT id INTO v_agency_id
    FROM public.agencies
    WHERE owner_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF v_agency_id IS NOT NULL THEN
    NEW.agency_id := v_agency_id;
    
    -- Transactional advisory lock per agency to prevent concurrent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('receipt_number_' || v_agency_id::text));

    -- If receipt_number is null, zero, or already exists in this agency, assign next MAX + 1
    IF NEW.receipt_number IS NULL OR NEW.receipt_number <= 0 OR EXISTS (
      SELECT 1 FROM public.file_receipts 
      WHERE agency_id = v_agency_id AND receipt_number = NEW.receipt_number AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      SELECT COALESCE(MAX(receipt_number), 0) + 1
      INTO v_max_num
      FROM public.file_receipts
      WHERE agency_id = v_agency_id;

      NEW.receipt_number := v_max_num;
    END IF;
  ELSE
    -- Fallback per user if no agency is found
    IF NEW.receipt_number IS NULL OR NEW.receipt_number <= 0 THEN
      SELECT COALESCE(MAX(receipt_number), 0) + 1
      INTO v_max_num
      FROM public.file_receipts
      WHERE user_id = NEW.user_id;

      NEW.receipt_number := v_max_num;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Re-create trigger to ensure it runs BEFORE INSERT
DROP TRIGGER IF EXISTS set_receipt_number_trigger ON public.file_receipts;
CREATE TRIGGER set_receipt_number_trigger
  BEFORE INSERT ON public.file_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_receipt_number();

-- 3. Update next_receipt_number(p_user_id) RPC function to return agency-wide next number
CREATE OR REPLACE FUNCTION public.next_receipt_number(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  next_num integer;
BEGIN
  -- Derive agency
  SELECT agency_id INTO v_agency_id
  FROM public.agency_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_agency_id IS NULL THEN
    SELECT id INTO v_agency_id
    FROM public.agencies
    WHERE owner_id = p_user_id
    LIMIT 1;
  END IF;

  IF v_agency_id IS NULL THEN
    SELECT COALESCE(MAX(receipt_number), 0) + 1
    INTO next_num
    FROM public.file_receipts
    WHERE user_id = p_user_id;
    RETURN next_num;
  END IF;

  -- Lock for transaction safety
  PERFORM pg_advisory_xact_lock(hashtext('receipt_number_' || v_agency_id::text));

  SELECT COALESCE(MAX(receipt_number), 0) + 1
  INTO next_num
  FROM public.file_receipts
  WHERE agency_id = v_agency_id;

  RETURN next_num;
END;
$$;
