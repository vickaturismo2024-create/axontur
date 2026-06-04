-- ============================================================
-- MIGRACIÓN: Reutilización de tablas operativas para Movimientos Extra
-- ============================================================

-- 1. Eliminar la tabla temporaria extra_movements y su columna en account_movements
DROP TABLE IF EXISTS public.extra_movements CASCADE;
ALTER TABLE public.account_movements DROP COLUMN IF EXISTS extra_movement_id CASCADE;

-- 2. Modificar file_receipts para permitir file_id opcional (nullable)
ALTER TABLE public.file_receipts ALTER COLUMN file_id DROP NOT NULL;

-- 3. Modificar file_supplier_payments para permitir file_id opcional (nullable)
ALTER TABLE public.file_supplier_payments ALTER COLUMN file_id DROP NOT NULL;
