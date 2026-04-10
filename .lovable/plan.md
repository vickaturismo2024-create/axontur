

# Plan: Filtrar calendario por presupuestos aprobados

## Cambio
En `src/pages/Calendar.tsx`, modificar el filtro `activeQuotes` para que solo incluya presupuestos con `status === 'approved'` además de los filtros existentes (no archivados, con fechas).

## Detalle
- Línea ~28 de `Calendar.tsx`: agregar `&& q.status === 'approved'` al filtro del `useMemo`
- Actualizar el subtítulo descriptivo para que diga "Vista mensual de los viajes aprobados"

Un solo archivo, un cambio de una línea.

