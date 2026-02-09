

# Plan: Aplicar calculo en vivo a la vista previa del PDF

## Problema raiz

El calculo de precios se ejecuta en vivo con `useOccupancyPricingCalculator`, pero solo se aplica al quote cuando el usuario hace click en "Guardar". La vista previa del PDF (`PDFPreview`) muestra los datos de pricing guardados en la base de datos (datos viejos, antes del fix). Por eso sigue mostrando 2 opciones de vuelo aunque el codigo nuevo ya las agrupa correctamente.

## Solucion

En `QuoteWizard.tsx`, crear una version del quote con el pricing recalculado en vivo y pasar ESA version al `PDFPreview`, en vez del quote con datos viejos.

---

## Cambios

### Archivo: `src/components/quotes/QuoteWizard.tsx`

1. Crear un `useMemo` que genere un `previewQuote` aplicando el calculo de ocupacion/vuelos al quote actual:

```typescript
const previewQuote = useMemo(() => {
  const allLodgings = (quote.lodgings && quote.lodgings.length > 0)
    ? quote.lodgings
    : (quote.lodging?.name ? [quote.lodging] : []);
  const hasOccupancies = allLodgings.some(l => l.useOccupancies && l.occupancies?.length);
  const hasMultipleFlightUnits = occupancyCalculation.hasFlightOptions;
  
  if (hasMultipleFlightUnits || hasOccupancies) {
    const pricingUpdates = applyOccupancyPricing(occupancyCalculation);
    return {
      ...quote,
      pricing: { ...quote.pricing, ...pricingUpdates },
    };
  }
  return quote;
}, [quote, occupancyCalculation]);
```

2. Reemplazar `quote` por `previewQuote` en las 2 llamadas a `PDFPreview` (lineas 2336 y 2384):

```tsx
<PDFPreview quote={previewQuote} template={currentTemplate} />
```

## Resultado esperado

- La vista previa refleja los calculos en tiempo real (no los datos guardados)
- Con el fix anterior de auto-deteccion de ida/vuelta, los 2 vuelos se agrupan como 1 unidad
- La vista previa muestra un solo precio, no 2 opciones
- Al guardar, se persiste el mismo calculo que ya se ve en la preview
