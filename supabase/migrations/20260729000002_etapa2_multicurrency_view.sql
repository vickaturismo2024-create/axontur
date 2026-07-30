-- Etapa 2: Multimoneda — Vista de totales por expediente y moneda
-- Fuente de verdad para totales financieros (reemplaza files.total_price/total_cost)

CREATE OR REPLACE VIEW public.file_totals_by_currency AS
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

-- Dar permisos de lectura
GRANT SELECT ON public.file_totals_by_currency TO authenticated;
GRANT SELECT ON public.file_totals_by_currency TO anon;
