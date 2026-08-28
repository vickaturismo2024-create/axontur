-- Migración Etapa 10: Calidad y Entrega (Monitoreo de Errores)
-- 1. Crear tabla para registro de fallos del sistema / frontend

CREATE TABLE IF NOT EXISTS public.system_errors_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_name text,
  error_message text NOT NULL,
  error_stack text,
  component_stack text,
  route text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Índices de consulta y auditoría
CREATE INDEX IF NOT EXISTS idx_system_errors_agency_id ON public.system_errors_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_system_errors_created_at ON public.system_errors_log(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.system_errors_log ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Seguridad (RLS)
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.system_errors_log;
CREATE POLICY "Anyone can insert error logs"
  ON public.system_errors_log
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view errors from their agency" ON public.system_errors_log;
CREATE POLICY "Users can view errors from their agency"
  ON public.system_errors_log
  FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.agency_members WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );
