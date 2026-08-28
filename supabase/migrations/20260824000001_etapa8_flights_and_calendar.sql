-- Migración Etapa 8: Vuelos y Calendario
-- 1. Añadir columnas UTC y zonas horarias a flight_segments

ALTER TABLE public.flight_segments
  ADD COLUMN IF NOT EXISTS dep_datetime_utc timestamptz,
  ADD COLUMN IF NOT EXISTS arr_datetime_utc timestamptz,
  ADD COLUMN IF NOT EXISTS origin_timezone text,
  ADD COLUMN IF NOT EXISTS destination_timezone text;

-- 2. Backfill de registros existentes para mantener compatibilidad
UPDATE public.flight_segments
SET dep_datetime_utc = dep_datetime_local
WHERE dep_datetime_utc IS NULL AND dep_datetime_local IS NOT NULL;

UPDATE public.flight_segments
SET arr_datetime_utc = arr_datetime_local
WHERE arr_datetime_utc IS NULL AND arr_datetime_local IS NOT NULL;

-- 3. Función y trigger para sincronizar recordatorios automáticos de Check-in y Salida de vuelo
CREATE OR REPLACE FUNCTION public.sync_flight_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_dep_utc timestamptz;
  v_reminder_date timestamptz;
  v_msg text;
BEGIN
  -- Obtener user_id y agency_id de la reserva asociada
  SELECT user_id, agency_id INTO v_user_id, v_agency_id
  FROM public.reservations
  WHERE id = NEW.reservation_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_dep_utc := COALESCE(NEW.dep_datetime_utc, NEW.dep_datetime_local);

  -- Si hay fecha de despegue y es futura
  IF v_dep_utc IS NOT NULL AND v_dep_utc > now() THEN
    -- Recordatorio 24 horas antes para Check-in
    v_reminder_date := v_dep_utc - interval '24 hours';
    IF v_reminder_date < now() THEN
      v_reminder_date := now() + interval '10 minutes';
    END IF;

    v_msg := 'Check-in abierto: Vuelo ' || COALESCE(NEW.airline_code, '') || ' ' || COALESCE(NEW.flight_number, '') || ' (' || COALESCE(NEW.origin_iata, '') || ' -> ' || COALESCE(NEW.destination_iata, '') || ')';

    -- Insertar recordatorio si no existe uno equivalente pendiente
    IF NOT EXISTS (
      SELECT 1 FROM public.reminders
      WHERE user_id = v_user_id
        AND message = v_msg
        AND completed = false
    ) THEN
      INSERT INTO public.reminders (user_id, agency_id, reminder_date, message, completed)
      VALUES (v_user_id, v_agency_id, v_reminder_date, v_msg, false);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_flight_reminders ON public.flight_segments;
CREATE TRIGGER trg_sync_flight_reminders
AFTER INSERT OR UPDATE OF dep_datetime_utc, dep_datetime_local, airline_code, flight_number, origin_iata, destination_iata
ON public.flight_segments
FOR EACH ROW
EXECUTE FUNCTION public.sync_flight_reminders();
