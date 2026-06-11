-- Create table for file-to-file client balance transfers
CREATE TABLE IF NOT EXISTS public.file_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    dest_file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    amount numeric NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'USD',
    payment_method text NOT NULL DEFAULT 'transfer',
    user_id uuid NOT NULL REFERENCES auth.users(id),
    notes text DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for file-to-file supplier credit transfers
CREATE TABLE IF NOT EXISTS public.supplier_credit_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    source_file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    dest_file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    amount numeric NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'USD',
    payment_method text NOT NULL DEFAULT 'transfer',
    user_id uuid NOT NULL REFERENCES auth.users(id),
    notes text DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create table for internal wallet/box transfers
CREATE TABLE IF NOT EXISTS public.wallet_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    from_method text NOT NULL,
    to_method text NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'ARS',
    notes text DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Alter supplier payments to track linked receipts (for credit card passthrough)
ALTER TABLE public.file_supplier_payments 
ADD COLUMN IF NOT EXISTS linked_receipt_id uuid NULL REFERENCES public.file_receipts(id) ON DELETE SET NULL;

-- Enable RLS for all new tables
ALTER TABLE public.file_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_credit_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;

-- Policies for file_transfers
CREATE POLICY "Users can view their own file transfers" ON public.file_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own file transfers" ON public.file_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own file transfers" ON public.file_transfers FOR DELETE USING (auth.uid() = user_id);

-- Policies for supplier_credit_transfers
CREATE POLICY "Users can view their own supplier credit transfers" ON public.supplier_credit_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own supplier credit transfers" ON public.supplier_credit_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own supplier credit transfers" ON public.supplier_credit_transfers FOR DELETE USING (auth.uid() = user_id);

-- Policies for wallet_transfers
CREATE POLICY "Users can view their own wallet transfers" ON public.wallet_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wallet transfers" ON public.wallet_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own wallet transfers" ON public.wallet_transfers FOR DELETE USING (auth.uid() = user_id);
