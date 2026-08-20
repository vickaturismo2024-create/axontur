-- Agregar columna service_id a file_supplier_payments
ALTER TABLE public.file_supplier_payments
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.file_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_file_supplier_payments_service_id ON public.file_supplier_payments (service_id);
