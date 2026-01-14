-- Create templates table
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  colors JSONB NOT NULL DEFAULT '{"primary": "#1e3a5f", "secondary": "#d4c4a8", "accent": "#c9a227", "background": "#ffffff", "cardBackground": "#f8f9fa"}'::jsonb,
  fonts JSONB NOT NULL DEFAULT '{"heading": "Playfair Display", "body": "Inter"}'::jsonb,
  styles JSONB NOT NULL DEFAULT '{"borderRadius": "12px", "cardShadow": true, "separatorStyle": "line", "borderStyle": "none", "borderWidth": "1px", "backgroundPattern": "none", "cardStyle": "elevated"}'::jsonb,
  whatsapp_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
  footer_text TEXT DEFAULT 'Vicka Turismo | Tel: +54 11 2345-6789',
  sections_toggles JSONB NOT NULL DEFAULT '{"flights": true, "lodging": true, "transfers": true, "insurance": true, "itinerary": true}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  client JSONB NOT NULL DEFAULT '{"name": "", "phone": "", "email": ""}'::jsonb,
  trip JSONB NOT NULL DEFAULT '{"destination": "", "startDate": "", "endDate": "", "travelers": 1, "currency": "USD"}'::jsonb,
  cover JSONB NOT NULL DEFAULT '{"title": "PRESUPUESTO DE VIAJE", "subtitle": "", "imageUrl": ""}'::jsonb,
  flights JSONB NOT NULL DEFAULT '[]'::jsonb,
  lodging JSONB NOT NULL DEFAULT '{}'::jsonb,
  transfers JSONB NOT NULL DEFAULT '[]'::jsonb,
  insurance JSONB NOT NULL DEFAULT '{}'::jsonb,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  itinerary_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for now - no auth required)
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this app doesn't have authentication)
CREATE POLICY "Allow public read templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Allow public insert templates" ON public.templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update templates" ON public.templates FOR UPDATE USING (true);
CREATE POLICY "Allow public delete templates" ON public.templates FOR DELETE USING (true);

CREATE POLICY "Allow public read quotes" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Allow public insert quotes" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update quotes" ON public.quotes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete quotes" ON public.quotes FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template
INSERT INTO public.templates (name, logo_url, colors, fonts, styles, whatsapp_agents, footer_text, sections_toggles, is_default)
VALUES (
  'Elegante Clásico',
  '',
  '{"primary": "#1e3a5f", "secondary": "#d4c4a8", "accent": "#c9a227", "background": "#ffffff", "cardBackground": "#f8f9fa"}'::jsonb,
  '{"heading": "Playfair Display", "body": "Inter"}'::jsonb,
  '{"borderRadius": "12px", "cardShadow": true, "separatorStyle": "line", "borderStyle": "none", "borderWidth": "1px", "backgroundPattern": "none", "cardStyle": "elevated"}'::jsonb,
  '[{"name": "Victoria", "phone": "5491123456789"}, {"name": "Juan Cruz", "phone": "5491198765432"}]'::jsonb,
  'Vicka Turismo | Tel: +54 11 2345-6789 | @vickaturismo',
  '{"flights": true, "lodging": true, "transfers": true, "insurance": true, "itinerary": true}'::jsonb,
  true
);