
# Plan: Corrección Definitiva del Cálculo y Visualización de Opciones de Vuelo

## Problemas Encontrados

### Bug 1: `handleSave` no detecta opciones de vuelo automáticas
En `QuoteWizard.tsx` linea 453, la condicion para aplicar calculos automaticos es:
```typescript
const hasFlightOptions = quote.flights.some(f => f.isOption);
```
Pero el calculador ya detecta multiples vuelos automaticamente sin necesidad de `isOption`. Si los vuelos no estan marcados manualmente, los precios nunca se persisten.

**Solucion**: Cambiar la condicion para detectar multiples "unidades de vuelo" (misma logica que el calculador):
```typescript
// Detectar si hay multiples unidades de vuelo (auto-deteccion)
const connectionGroups = new Set(quote.flights.filter(f => f.connectionGroupId).map(f => f.connectionGroupId));
const standaloneCount = quote.flights.filter(f => !f.connectionGroupId).length;
const flightUnitsCount = connectionGroups.size + standaloneCount;
const hasMultipleFlightUnits = flightUnitsCount > 1;
```

### Bug 2: `applyOccupancyPricing` ignora flight options si no hay ocupaciones
En linea 809, la funcion retorna `{}` si no hay ocupaciones configuradas, incluso si hay `flightOptionsPricing` calculados.

**Solucion**: Agregar `calculation.hasFlightOptions` a la condicion de salida:
```typescript
if (!calculation.hasFlightOptions && !calculation.hasOccupancyTypesWithOptions && ...) {
  return {};
}
```
Y asegurar que `flightOptionsPricing` siempre se incluya en el return.

---

## Cambios Especificos

### Archivo 1: `src/hooks/useOccupancyPricingCalculator.ts`

**Linea 809**: Cambiar la condicion de salida de `applyOccupancyPricing`:
```typescript
// ANTES:
if (!calculation.hasOccupancyTypesWithOptions && !calculation.hasMainOccupancies && !calculation.hasOptionOccupancies) {
  return {};
}

// DESPUES:
if (!calculation.hasFlightOptions && !calculation.hasOccupancyTypesWithOptions && !calculation.hasMainOccupancies && !calculation.hasOptionOccupancies) {
  return {};
}
```

Tambien asegurar que cuando solo hay flight options (sin ocupaciones), se calculen totales correctos en el return.

### Archivo 2: `src/components/quotes/QuoteWizard.tsx`

**Linea 451-472**: Cambiar `handleSave` para detectar multiples unidades de vuelo automaticamente:
```typescript
const handleSave = () => {
  // Detectar multiples unidades de vuelo (auto-deteccion como el calculador)
  const connectionGroupIds = new Set(
    quote.flights.filter(f => f.connectionGroupId).map(f => f.connectionGroupId!)
  );
  const standaloneCount = quote.flights.filter(f => !f.connectionGroupId).length;
  const flightUnitsCount = connectionGroupIds.size + standaloneCount;
  const hasMultipleFlightUnits = flightUnitsCount > 1;

  const allLodgings = (quote.lodgings && quote.lodgings.length > 0)
    ? quote.lodgings
    : (quote.lodging?.name ? [quote.lodging] : []);
  const hasOccupancies = allLodgings.some(l => l.useOccupancies && l.occupancies?.length);

  if (hasMultipleFlightUnits || hasOccupancies) {
    const pricingUpdates = applyOccupancyPricing(occupancyCalculation);
    const updatedQuote: Quote = {
      ...quote,
      pricing: { ...quote.pricing, ...pricingUpdates },
    };
    onSave(updatedQuote);
  } else {
    onSave(quote);
  }
};
```

### Archivo 3: `src/components/pdf/PDFDetailsPages.tsx`

**Linea 1561**: Asegurar que el cuadro de precio unico NO se muestre cuando hay `flightOptionsPricing`. Ya esta esta condicion, pero verificar que funcione correctamente. La condicion actual es:
```typescript
!hasFlightOptionsPricing && !hasOccupancyTypesWithOptions && !hasMainOccupancyPricing && (hasTotalPrice || hasPricePerPerson)
```
Esto es correcto, no necesita cambios.

---

## Resumen de Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useOccupancyPricingCalculator.ts` | Agregar `hasFlightOptions` a la condicion de salida de `applyOccupancyPricing` |
| `src/components/quotes/QuoteWizard.tsx` | Detectar multiples unidades de vuelo automaticamente en `handleSave` |

## Resultado Esperado

Con el ejemplo del usuario (vuelo directo $570 + vuelo con escala $590 + hotel $2600):
- Al guardar, se detectan 2+ unidades de vuelo automaticamente
- `applyOccupancyPricing` persiste `flightOptionsPricing` con 2 opciones
- PDF muestra 2 cuadros en "Valor del Viaje":
  - Opcion 1 (directo): $570 + $2600 = $3170 por persona
  - Opcion 2 (escala): $590 + $2600 = $3190 por persona
