-- ==========================================================
-- ETAPA 9 — IMPORTACIÓN SEGURA Y TRAZABILIDAD
-- ==========================================================

-- 1. Crear bucket de storage 'import_documents' para PDFs originales
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'import_documents',
  'import_documents',
  true,
  20971520,  -- 20MB
  ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para import_documents
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'authenticated users can upload import documents'
  ) THEN
    CREATE POLICY "authenticated users can upload import documents"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'import_documents'
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'authenticated users can read import documents'
  ) THEN
    CREATE POLICY "authenticated users can read import documents"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'import_documents'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- 2. Crear tabla file_imports_log para trazabilidad de importación
CREATE TABLE IF NOT EXISTS public.file_imports_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    source_filename TEXT NOT NULL,
    source_file_url TEXT,
    raw_text TEXT,
    parsed_json JSONB,
    warnings_ignored JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.file_imports_log ENABLE ROW LEVEL SECURITY;

-- Política RLS por agencia para file_imports_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view agency import logs'
  ) THEN
    CREATE POLICY "Users can view agency import logs"
      ON public.file_imports_log FOR SELECT
      USING (
        agency_id IN (
          SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
        )
        OR created_by = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert agency import logs'
  ) THEN
    CREATE POLICY "Users can insert agency import logs"
      ON public.file_imports_log FOR INSERT
      WITH CHECK (
        auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_file_imports_log_agency ON public.file_imports_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_file_imports_log_file ON public.file_imports_log(file_id);
