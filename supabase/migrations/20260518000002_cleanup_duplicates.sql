-- ============================================================
-- Limpieza: eliminar columna redundante y ajustar legacy_id
-- ============================================================

-- 1. Eliminar operational_notes (duplica la función de internal_notes)
ALTER TABLE public.files DROP COLUMN IF EXISTS operational_notes;

-- 2. files.legacy_id ya existe como text (migración 20260416).
--    Asegurar que el UNIQUE index por agencia funcione correctamente.
--    (El index files_legacy_id_agency_unique ya fue creado en el parche anterior)
--    No hay cambios necesarios — se mantiene como text.
