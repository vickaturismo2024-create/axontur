-- ==========================================================
-- ETAPA 11 — CUENTAS CORRIENTES: RECONSTRUCCIÓN FUNCIONAL
-- ==========================================================

-- 1. Tabla de aplicaciones financieras (allocations)
-- Relaciona cobros/pagos con las obligaciones que cancelan
CREATE TABLE IF NOT EXISTS public.financial_allocations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id       UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    source_type     TEXT NOT NULL,  -- 'receipt', 'supplier_payment', 'credit_note'
    source_id       UUID NOT NULL,  -- ID del cobro/pago origen
    target_type     TEXT NOT NULL,  -- 'file', 'file_service'
    target_id       UUID NOT NULL,  -- ID del expediente o servicio destino
    amount          NUMERIC NOT NULL DEFAULT 0,
    currency        TEXT NOT NULL DEFAULT 'USD',
    exchange_rate   NUMERIC DEFAULT 1,
    notes           TEXT,
    created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraint: amount must be positive
ALTER TABLE public.financial_allocations
  ADD CONSTRAINT chk_allocation_amount_positive CHECK (amount > 0);

-- 2. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_fin_alloc_agency    ON public.financial_allocations(agency_id);
CREATE INDEX IF NOT EXISTS idx_fin_alloc_source    ON public.financial_allocations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_fin_alloc_target    ON public.financial_allocations(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_fin_alloc_currency  ON public.financial_allocations(currency);

-- 3. RLS
ALTER TABLE public.financial_allocations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agency members can view allocations'
  ) THEN
    CREATE POLICY "Agency members can view allocations"
      ON public.financial_allocations FOR SELECT
      USING (agency_id = public.current_agency_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agency members can insert allocations'
  ) THEN
    CREATE POLICY "Agency members can insert allocations"
      ON public.financial_allocations FOR INSERT
      WITH CHECK (agency_id = public.current_agency_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agency members can update allocations'
  ) THEN
    CREATE POLICY "Agency members can update allocations"
      ON public.financial_allocations FOR UPDATE
      USING (agency_id = public.current_agency_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agency members can delete allocations'
  ) THEN
    CREATE POLICY "Agency members can delete allocations"
      ON public.financial_allocations FOR DELETE
      USING (agency_id = public.current_agency_id());
  END IF;
END $$;
