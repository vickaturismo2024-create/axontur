-- ============================================================
-- MIGRACIÓN DE PRUEBA: Registro de Pago de Celulares
-- ============================================================

DO $$
DECLARE
  target_agency_id uuid;
  target_user_id uuid;
BEGIN
  -- 1. Buscar la primera agencia disponible
  SELECT id, owner_id INTO target_agency_id, target_user_id
  FROM public.agencies
  LIMIT 1;

  -- 2. Si no hay agencias, no hacer nada
  IF target_agency_id IS NULL THEN
    RAISE NOTICE 'No se encontraron agencias en la base de datos para registrar el pago de prueba.';
    RETURN;
  END IF;

  -- 3. Si el usuario no está definido, buscar el primer miembro de esa agencia
  IF target_user_id IS NULL THEN
    SELECT user_id INTO target_user_id
    FROM public.agency_members
    WHERE agency_id = target_agency_id
    LIMIT 1;
  END IF;

  -- 4. Registrar el pago de celulares del mes (-50000 ARS)
  INSERT INTO public.extra_movements (
    agency_id,
    user_id,
    concept,
    amount,
    currency,
    payment_method,
    payment_date,
    notes
  )
  VALUES (
    target_agency_id,
    target_user_id,
    'Pago celulares del mes',
    -50000.00,
    'ARS',
    'cash',
    CURRENT_DATE,
    'Línea de móvil (Movimiento de prueba registrado automáticamente)'
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Pago de prueba registrado exitosamente para la agencia %', target_agency_id;
END;
$$;
