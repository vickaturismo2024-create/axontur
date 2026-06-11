-- ============================================================
-- MIGRACIÓN DE CONSOLIDACIÓN: Asegurar columnas y tablas del último esquema
-- ============================================================

-- 1. Columnas nuevas de redes/contacto en la tabla templates
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS agency_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS agency_instagram text DEFAULT '',
  ADD COLUMN IF NOT EXISTS agency_tagline text DEFAULT '';

-- 2. Columnas de personalización de recibos en la tabla profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS receipt_header_layout text DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS receipt_primary_color text DEFAULT '#1E3A5F',
  ADD COLUMN IF NOT EXISTS receipt_accent_color text DEFAULT '#BA7EF2',
  ADD COLUMN IF NOT EXISTS receipt_header_image_url text DEFAULT '';

-- 3. Columnas de metadatos en la tabla file_services
ALTER TABLE public.file_services 
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS airline text,
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS cabin_class text,
  ADD COLUMN IF NOT EXISTS regime text,
  ADD COLUMN IF NOT EXISTS room_type text,
  ADD COLUMN IF NOT EXISTS pickup_location text,
  ADD COLUMN IF NOT EXISTS dropoff_location text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS departure_time text,
  ADD COLUMN IF NOT EXISTS arrival_time text,
  ADD COLUMN IF NOT EXISTS luggage text,
  ADD COLUMN IF NOT EXISTS luggage_type text,
  ADD COLUMN IF NOT EXISTS hotel_category text,
  ADD COLUMN IF NOT EXISTS ship_name text,
  ADD COLUMN IF NOT EXISTS embarkation_port text,
  ADD COLUMN IF NOT EXISTS disembarkation_port text,
  ADD COLUMN IF NOT EXISTS deck text,
  ADD COLUMN IF NOT EXISTS cabin_number text,
  ADD COLUMN IF NOT EXISTS coverage text,
  ADD COLUMN IF NOT EXISTS insurance_plan text;

-- 4. Modificaciones a tablas de caja operativas (hacer opcionales los expedientes en recibos y pagos)
ALTER TABLE public.file_receipts 
  ALTER COLUMN file_id DROP NOT NULL;

ALTER TABLE public.file_supplier_payments 
  ALTER COLUMN file_id DROP NOT NULL;

-- 5. Crear la tabla de tarjetas de la agencia (agency_cards) si no existe
CREATE TABLE IF NOT EXISTS public.agency_cards (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     uuid        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  alias         text        NOT NULL,
  banco         text,
  vencimiento   text,
  ultimos_4     text,
  nro_tarjeta   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_cards_agency_idx ON public.agency_cards (agency_id);

-- 6. Crear la tabla de incidencias de expedientes (file_incidencias) si no existe
CREATE TABLE IF NOT EXISTS public.file_incidencias (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  file_id         uuid        NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  descripcion     text        NOT NULL,
  fecha           timestamptz NOT NULL DEFAULT now(),
  estado_gestion  text        NOT NULL DEFAULT 'pendiente',
  impacto_caja    boolean     NOT NULL DEFAULT false,
  monto           numeric(15,2) NOT NULL DEFAULT 0.00,
  moneda          text        NOT NULL DEFAULT 'ARS',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT file_incidencias_estado_check CHECK (estado_gestion IN ('pendiente', 'en_gestion', 'resuelto'))
);

CREATE INDEX IF NOT EXISTS file_incidencias_file_idx ON public.file_incidencias (file_id);
CREATE INDEX IF NOT EXISTS file_incidencias_agency_idx ON public.file_incidencias (agency_id);

-- 7. Agregar columna de incidencia a account_movements
ALTER TABLE public.account_movements
  ADD COLUMN IF NOT EXISTS incidence_id uuid REFERENCES public.file_incidencias(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS account_movements_incidence_id_uidx 
  ON public.account_movements (incidence_id) 
  WHERE incidence_id IS NOT NULL;
