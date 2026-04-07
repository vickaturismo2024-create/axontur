

# Plan: Separar "Valor total" por moneda (ARS y USD)

## Cambio

Modificar el cálculo de métricas y la UI en `src/pages/Dashboard.tsx` para agrupar el valor total por moneda (`quote.trip.currency`).

## Detalle técnico

**Cálculo** (líneas ~38): En lugar de un solo `totalValue`, agrupar por moneda:
```typescript
const totalsByCurrency: Record<string, number> = {};
quotes.forEach(q => {
  const currency = q.trip.currency || 'USD';
  totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + (q.pricing.totalPrice || 0);
});
```

**UI** (líneas ~130-136): Reemplazar la card única de "Valor total" por una que muestre ambas líneas:
- `USD $X,XXX` 
- `ARS $X,XXX`

Si solo hay una moneda, mostrar solo esa. Usar el símbolo `$` con prefijo de moneda para claridad.

## Archivo a modificar

1. `src/pages/Dashboard.tsx` — Cálculo de métricas + renderizado de la card "Valor total"

