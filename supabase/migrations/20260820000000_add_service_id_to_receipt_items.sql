-- ==========================================================
-- VINCULACIÓN DE RECIBOS CON SERVICIOS
-- ==========================================================

-- Agregar columna service_id a file_receipt_items para asociar
-- cada línea de pago/devolución a un servicio específico del expediente.
ALTER TABLE public.file_receipt_items
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.file_services(id) ON DELETE SET NULL;

-- Índice para mejorar el rendimiento de consultas agregadas por servicio
CREATE INDEX IF NOT EXISTS idx_file_receipt_items_service_id ON public.file_receipt_items (service_id);
