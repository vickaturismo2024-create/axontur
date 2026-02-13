ALTER TABLE public.templates ADD COLUMN agency_name TEXT DEFAULT 'Mi Agencia';
UPDATE public.templates SET agency_name = 'Vicka Turismo' WHERE agency_name = 'Mi Agencia';