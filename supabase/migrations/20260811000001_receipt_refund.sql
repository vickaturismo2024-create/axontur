-- ==========================================================
-- DEVOLUCIONES — Agregar receipt_type a file_receipts
-- ==========================================================

-- Agregar columna para distinguir cobros de devoluciones.
-- NULL y 'payment' = cobro normal (retrocompatible con todos los recibos existentes).
-- 'refund' = devolución al cliente.
ALTER TABLE public.file_receipts
  ADD COLUMN IF NOT EXISTS receipt_type TEXT NOT NULL DEFAULT 'payment'
  CHECK (receipt_type IN ('payment', 'refund'));
