-- Etapa 3 p2: Documentos financieros - auditoría y contramovimientos
-- Solo agrega columnas nuevas, NO modifica ni elimina nada existente

-- 1. Columna para vincular contramovimientos con su movimiento original
ALTER TABLE public.account_movements
  ADD COLUMN IF NOT EXISTS reversal_of UUID REFERENCES public.account_movements(id);

-- 2. Columnas de auditoría de anulación en file_receipts
ALTER TABLE public.file_receipts
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 3. Estado y auditoría de anulación en file_supplier_payments
ALTER TABLE public.file_supplier_payments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 4. Índice para buscar contramovimientos
CREATE INDEX IF NOT EXISTS idx_account_movements_reversal
  ON public.account_movements(reversal_of)
  WHERE reversal_of IS NOT NULL;
