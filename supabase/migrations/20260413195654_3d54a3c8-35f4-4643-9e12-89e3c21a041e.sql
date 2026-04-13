
-- =============================================
-- TABLE: files (Expedientes / Reservas)
-- =============================================
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  file_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'confirmed',
  client_name TEXT NOT NULL DEFAULT '',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  destination TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  travelers INTEGER NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'USD',
  total_price NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  internal_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own files" ON public.files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own files" ON public.files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own files" ON public.files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own files" ON public.files FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-increment file_number per user
CREATE OR REPLACE FUNCTION public.set_file_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.file_number := COALESCE(
    (SELECT MAX(file_number) FROM public.files WHERE user_id = NEW.user_id), 0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_file_number_trigger BEFORE INSERT ON public.files FOR EACH ROW EXECUTE FUNCTION public.set_file_number();

-- =============================================
-- TABLE: file_services
-- =============================================
CREATE TABLE public.file_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  service_type TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  confirmation_number TEXT DEFAULT '',
  cost NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  service_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.file_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own file services" ON public.file_services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own file services" ON public.file_services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own file services" ON public.file_services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own file services" ON public.file_services FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_file_services_updated_at BEFORE UPDATE ON public.file_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: file_passengers
-- =============================================
CREATE TABLE public.file_passengers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  dni TEXT DEFAULT '',
  passport TEXT DEFAULT '',
  passport_expiry DATE,
  birth_date DATE,
  nationality TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.file_passengers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own file passengers" ON public.file_passengers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own file passengers" ON public.file_passengers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own file passengers" ON public.file_passengers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own file passengers" ON public.file_passengers FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_file_passengers_updated_at BEFORE UPDATE ON public.file_passengers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: file_receipts
-- =============================================
CREATE TABLE public.file_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  receipt_number INTEGER NOT NULL DEFAULT 1,
  client_name TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT DEFAULT '',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  concept TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.file_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own file receipts" ON public.file_receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own file receipts" ON public.file_receipts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own file receipts" ON public.file_receipts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own file receipts" ON public.file_receipts FOR DELETE USING (auth.uid() = user_id);

-- Auto-increment receipt_number per user
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.receipt_number := COALESCE(
    (SELECT MAX(receipt_number) FROM public.file_receipts WHERE user_id = NEW.user_id), 0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_receipt_number_trigger BEFORE INSERT ON public.file_receipts FOR EACH ROW EXECUTE FUNCTION public.set_receipt_number();
