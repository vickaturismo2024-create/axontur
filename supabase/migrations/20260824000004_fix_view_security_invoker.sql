-- Corrección de Seguridad: Aplicar SECURITY INVOKER a las vistas
-- Esto soluciona la alerta crítica en Supabase y fuerza a que la vista 
-- aplique las políticas RLS del usuario que la consulta, en lugar de 
-- saltarse la seguridad con los privilegios del creador.

CREATE OR REPLACE VIEW public.file_totals_by_currency WITH (security_invoker = true) AS
SELECT
  f.agency_id,
  s.file_id,
  s.currency,
  SUM(COALESCE(s.price, 0))::numeric(18,2) AS total_price,
  SUM(COALESCE(s.cost, 0))::numeric(18,2) AS total_cost
FROM public.file_services s
JOIN public.files f ON f.id = s.file_id
WHERE COALESCE(s.status, '') <> 'cancelled'
GROUP BY f.agency_id, s.file_id, s.currency;

-- Mantener permisos de lectura (la seguridad RLS ya bloqueará lectura indebida gracias a security_invoker)
GRANT SELECT ON public.file_totals_by_currency TO authenticated;
GRANT SELECT ON public.file_totals_by_currency TO anon;
