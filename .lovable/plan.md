

# Plan: Separar métricas por moneda y excluir presupuestos sin costos completos

## Problemas actuales

1. **Mezcla de monedas**: Los gráficos suman USD y ARS indistintamente. Un presupuesto de $5.000 USD y otro de $5.000.000 ARS se suman como si fueran lo mismo.
2. **Márgenes inflados**: Presupuestos sin costos netos (o con costos parciales) muestran márgenes artificialmente altos del 100% y distorsionan todas las métricas de rentabilidad.

Cada presupuesto tiene `q.trip.currency` (generalmente `"USD"` o `"ARS"`).

## Solución

### 1. Filtro de moneda en Reportes y DashboardCharts

Agregar un selector de moneda (USD / ARS) en la página de Reportes y en DashboardCharts. Solo se muestran los presupuestos de la moneda seleccionada. Por defecto se selecciona la moneda más usada.

### 2. Excluir presupuestos sin costos completos de métricas de rentabilidad

Crear una función helper `hasCompleteCosts(quote)` que verifica:
- Que `totalCost > 0` y `totalPrice > 0`
- Que el margen no sea mayor al 95% (indicador de que faltan costos netos)
- Que al menos el 50% de los servicios tengan costo asignado

Esta función se usa como filtro en:
- Gráficos de margen y rentabilidad (evolución del margen, margen por destino, ingresos vs costos)
- Supplier analytics (margen $ y margen %)
- Export Excel (columnas de margen)

Los gráficos de **volumen** (presupuestos por mes, destinos populares, estados) siguen mostrando todos los presupuestos de la moneda seleccionada.

## Cambios por archivo

| Archivo | Cambio |
|---|---|
| `src/lib/quoteFilters.ts` | **Nuevo**: helper `hasCompleteCosts(quote)` y `getQuoteCurrency(quote)` |
| `src/components/dashboard/DashboardCharts.tsx` | Recibir prop `currency`, filtrar quotes por moneda, usar `hasCompleteCosts` en métricas de rentabilidad |
| `src/pages/Reports.tsx` | Agregar selector de moneda, pasar moneda a DashboardCharts y supplier analytics, filtrar quotes |
| `src/hooks/useSupplierAnalytics.ts` | Recibir moneda como parámetro, filtrar quotes por moneda, excluir servicios sin costo del cálculo de margen |
| `src/lib/exportReports.ts` | Filtrar por moneda seleccionada, indicar moneda en headers de columnas |

## Detalle de la UI

El selector de moneda será un toggle simple (USD | ARS) al lado del título "Reportes", similar a los filtros existentes. Si solo hay presupuestos en una moneda, no se muestra el toggle.

