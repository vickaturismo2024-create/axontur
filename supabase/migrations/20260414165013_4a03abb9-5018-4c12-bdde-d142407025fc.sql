
-- 1. Add payment_due_date to file_services
ALTER TABLE public.file_services ADD COLUMN payment_due_date date DEFAULT NULL;

-- 2. Create file_receipt_items table
CREATE TABLE public.file_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_method text DEFAULT 'transfer',
  exchange_rate numeric DEFAULT NULL,
  service_currency text DEFAULT NULL,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.file_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own receipt items" ON public.file_receipt_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own receipt items" ON public.file_receipt_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own receipt items" ON public.file_receipt_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own receipt items" ON public.file_receipt_items FOR DELETE USING (auth.uid() = user_id);

-- 3. Create file_supplier_payments table
CREATE TABLE public.file_supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  user_id uuid NOT NULL,
  supplier_id uuid DEFAULT NULL,
  supplier_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'transfer',
  reference text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.file_supplier_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own supplier payments" ON public.file_supplier_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own supplier payments" ON public.file_supplier_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own supplier payments" ON public.file_supplier_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own supplier payments" ON public.file_supplier_payments FOR DELETE USING (auth.uid() = user_id);
