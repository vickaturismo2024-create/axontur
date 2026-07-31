-- Etapa 4: Tarjetas - Operaciones de cobro, cuotas, recargos y comisiones
-- Mantiene compatibilidad total con tablas existentes

CREATE TABLE IF NOT EXISTS public.receipt_card_operations (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id               uuid        NOT NULL REFERENCES public.file_receipts(id) ON DELETE CASCADE,
  agency_id                uuid        REFERENCES public.agencies(id) ON DELETE CASCADE,
  card_type                text        NOT NULL DEFAULT 'credit',
  brand                    text        NOT NULL DEFAULT 'Visa',
  bank                     text,
  cardholder_name          text,
  last_four                text,
  installments             integer     NOT NULL DEFAULT 1,
  calculation_method       text        NOT NULL DEFAULT 'percentage',
  base_amount              numeric     NOT NULL DEFAULT 0,
  surcharge_percentage     numeric     DEFAULT 0,
  surcharge_amount         numeric     NOT NULL DEFAULT 0,
  total_charged            numeric     NOT NULL DEFAULT 0,
  installment_amount       numeric     NOT NULL DEFAULT 0,
  processor_fee_percentage numeric     DEFAULT 0,
  processor_fee_amount     numeric     DEFAULT 0,
  net_amount               numeric     DEFAULT 0,
  settlement_date          date,
  status                   text        NOT NULL DEFAULT 'pending',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_receipt_card_ops_receipt_id ON public.receipt_card_operations(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_card_ops_agency_id ON public.receipt_card_operations(agency_id);

-- RLS (Row Level Security)
ALTER TABLE public.receipt_card_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members can view card operations" ON public.receipt_card_operations;
CREATE POLICY "Agency members can view card operations"
  ON public.receipt_card_operations FOR SELECT
  USING (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency members can insert card operations" ON public.receipt_card_operations;
CREATE POLICY "Agency members can insert card operations"
  ON public.receipt_card_operations FOR INSERT
  WITH CHECK (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency members can update card operations" ON public.receipt_card_operations;
CREATE POLICY "Agency members can update card operations"
  ON public.receipt_card_operations FOR UPDATE
  USING (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Agency members can delete card operations" ON public.receipt_card_operations;
CREATE POLICY "Agency members can delete card operations"
  ON public.receipt_card_operations FOR DELETE
  USING (
    agency_id = public.current_agency_id()
    OR agency_id IN (SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid())
  );
