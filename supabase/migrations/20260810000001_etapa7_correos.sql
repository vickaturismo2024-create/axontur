-- ==========================================================
-- ETAPA 7 — CORREOS OPERATIVOS (COMUNICACIONES DE EXPEDIENTE)
-- ==========================================================

-- 1. Tabla principal de comunicaciones
CREATE TABLE IF NOT EXISTS public.file_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    from_address TEXT NOT NULL,
    to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de strings o objetos
    cc_addresses JSONB DEFAULT '[]'::jsonb,
    bcc_addresses JSONB DEFAULT '[]'::jsonb,
    subject TEXT,
    html_body TEXT,
    text_body TEXT,
    message_id TEXT, -- ID del proveedor de correo (ej. Resend ID)
    in_reply_to TEXT, -- ID al que responde
    thread_id TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'pending', 'sent', 'delivered', 'failed', 'received')),
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de adjuntos de correos
CREATE TABLE IF NOT EXISTS public.file_communication_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_id UUID NOT NULL REFERENCES public.file_communications(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Ruta en el bucket de Supabase Storage
    file_name TEXT NOT NULL,
    file_size INTEGER,
    content_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.file_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_communication_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas para file_communications
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agency members can view communications') THEN
    CREATE POLICY "Agency members can view communications"
      ON public.file_communications FOR SELECT
      USING (
        agency_id IN (
          SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agency members can insert communications') THEN
    CREATE POLICY "Agency members can insert communications"
      ON public.file_communications FOR INSERT
      WITH CHECK (
        agency_id IN (
          SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can insert incoming communications') THEN
    CREATE POLICY "Service role can insert incoming communications"
      ON public.file_communications FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can update communications') THEN
    CREATE POLICY "Service role can update communications"
      ON public.file_communications FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Políticas para file_communication_attachments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agency members can view attachments') THEN
    CREATE POLICY "Agency members can view attachments"
      ON public.file_communication_attachments FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.file_communications c
          WHERE c.id = communication_id
          AND c.agency_id IN (
            SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agency members can insert attachments') THEN
    CREATE POLICY "Agency members can insert attachments"
      ON public.file_communication_attachments FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.file_communications c
          WHERE c.id = communication_id
          AND c.agency_id IN (
            SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can insert attachments') THEN
    CREATE POLICY "Service role can insert attachments"
      ON public.file_communication_attachments FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_file_comm_agency ON public.file_communications(agency_id);
CREATE INDEX IF NOT EXISTS idx_file_comm_file ON public.file_communications(file_id);
CREATE INDEX IF NOT EXISTS idx_file_comm_msgid ON public.file_communications(message_id);
CREATE INDEX IF NOT EXISTS idx_file_comm_attach_comm ON public.file_communication_attachments(communication_id);
