-- Change update_updated_at_column function from SECURITY DEFINER to SECURITY INVOKER
-- This follows the principle of least privilege since the function only needs to call now()
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;