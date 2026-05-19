-- ============================================================
-- MIGRACIÓN 1: Columnas legacy en tabla clients
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS legacy_id         integer,
  ADD COLUMN IF NOT EXISTS company_name      text,
  ADD COLUMN IF NOT EXISTS address_work      text,
  ADD COLUMN IF NOT EXISTS civil_status      text,
  ADD COLUMN IF NOT EXISTS occupation        text,
  ADD COLUMN IF NOT EXISTS postal_code       text,
  ADD COLUMN IF NOT EXISTS referred_by       text,
  ADD COLUMN IF NOT EXISTS category          text,
  ADD COLUMN IF NOT EXISTS iva_condition     text;

CREATE UNIQUE INDEX IF NOT EXISTS clients_legacy_id_agency_unique
  ON public.clients (agency_id, legacy_id)
  WHERE legacy_id IS NOT NULL;

COMMENT ON COLUMN public.clients.legacy_id     IS 'ID_CLI del sistema anterior. Solo para migración.';
COMMENT ON COLUMN public.clients.company_name  IS 'Razón social o empresa del cliente (RAZON en sistema viejo).';
COMMENT ON COLUMN public.clients.address_work  IS 'Dirección comercial (DIR_COM en sistema viejo).';
COMMENT ON COLUMN public.clients.civil_status  IS 'Estado civil (CIVIL en sistema viejo).';
COMMENT ON COLUMN public.clients.occupation    IS 'Ocupación (OCUPACION en sistema viejo).';
COMMENT ON COLUMN public.clients.postal_code   IS 'Código postal (POSTAL en sistema viejo).';
COMMENT ON COLUMN public.clients.referred_by   IS 'Promotor o referido (PROMOTOR en sistema viejo).';
COMMENT ON COLUMN public.clients.category      IS 'Categoría del cliente (ID_CAT en sistema viejo).';
COMMENT ON COLUMN public.clients.iva_condition IS 'Condición frente al IVA: CF, RI, Monotributo, etc.';
