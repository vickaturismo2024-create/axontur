

# Fix: Cálculo de margen porcentual sobre precio de venta

## Problema

El porcentaje de margen se calcula como `margin / totalCost * 100` (markup sobre costo), cuando debería ser `margin / totalPrice * 100` (margen sobre precio de venta).

Ejemplo real: Avril tiene costo US$43.22, venta US$66.50, ganancia US$23.28.
- Actual: 23.28 / 43.22 = **53.9%** (incorrecto)
- Correcto: 23.28 / 66.50 = **35.0%**

## Cambio

| Archivo | Línea | Cambio |
|---|---|---|
| `src/hooks/useSupplierAnalytics.ts` | 104 | `val.totalCost > 0 ? (margin / val.totalCost) * 100` → `val.totalPrice > 0 ? (margin / val.totalPrice) * 100` |

Un cambio de una sola línea.

