-- ==========================================================
-- ETAPA 10 — SEGURIDAD BANCARIA DE PROVEEDORES
-- ==========================================================

-- 1. Agregar campos de verificación a supplier_bank_accounts
ALTER TABLE public.supplier_bank_accounts
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Crear tabla de auditoría para cambios en cuentas bancarias de proveedores
CREATE TABLE IF NOT EXISTS public.supplier_bank_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID REFERENCES public.supplier_bank_accounts(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'CREATED', 'UPDATED', 'VERIFIED', 'DELETED'
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS en supplier_bank_audits
ALTER TABLE public.supplier_bank_audits ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para supplier_bank_audits
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'authenticated users can read bank audits'
  ) THEN
    CREATE POLICY "authenticated users can read bank audits"
      ON public.supplier_bank_audits FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'authenticated users can insert bank audits'
  ) THEN
    CREATE POLICY "authenticated users can insert bank audits"
      ON public.supplier_bank_audits FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Índices de auditoría
CREATE INDEX IF NOT EXISTS idx_supplier_bank_audits_account ON public.supplier_bank_audits(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bank_audits_supplier ON public.supplier_bank_audits(supplier_id);
