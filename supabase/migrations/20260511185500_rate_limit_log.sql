-- Tabla para rate limiting de edge functions costosas
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índice para las queries de conteo por ventana de tiempo
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_user_action_time
  ON public.rate_limit_log (user_id, action, created_at DESC);

-- RLS: cada usuario solo puede ver y crear sus propios registros
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert own rate limit logs"
  ON public.rate_limit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Limpieza automática: borrar registros de más de 24hs para no crecer indefinidamente
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.rate_limit_log
  WHERE created_at < now() - interval '24 hours';
$$;
