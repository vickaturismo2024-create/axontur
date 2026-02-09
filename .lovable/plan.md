

# Plan: Correccion Definitiva - Calculos y Visualizacion de Opciones de Vuelo

## Diagnostico Real (3 bugs criticos encontrados)

### Bug 1: Todos los vuelos se incluyen en "servicios fijos" (doble conteo)
**Archivo**: `useOccupancyPricingCalculator.ts`, linea 417

```typescript
const mainFlights = quote.flights.filter(f => !f.isOption);
```

Los vuelos del usuario NO tienen `isOption: true`, asi que TODOS se incluyen en `sharedServices`. Luego, al calcular cada opcion de vuelo, se suma `baseWithoutFlights + flightPrice`. Pero `sharedServices` (que se usa en `sharedPerPersonPrice`) ya incluye todos los vuelos, entonces las ocupaciones y otros calculos reciben una base inflada.

**Solucion**: Cuando hay multiples unidades de vuelo (auto-deteccion), excluir TODOS los vuelos de `sharedServices`, no solo los marcados con `isOption`.

### Bug 2: `totalPrice` queda en 0 cuando solo hay flight options
**Archivo**: `useOccupancyPricingCalculator.ts`, linea 831

```typescript
// Cuando no hay occupancyTypesWithOptions:
totalPrice = calculation.grandTotal.price; // = 0 (mainOccupancyPricing esta vacio)
```

Sin ocupaciones de alojamiento, `grandTotal.price = 0`. El return del `applyOccupancyPricing` devuelve `totalPrice: 0`, y eso es lo que se persiste. Aunque `flightOptionsPricing` tiene datos correctos, el precio total global queda en 0.

**Solucion**: Cuando hay flight options sin ocupaciones, usar el precio de la primera opcion de vuelo como `totalPrice`.

### Bug 3: "Calcular Precios" no activa flight options
**Archivo**: `PricingSection.tsx`, linea 47-59

```typescript
if (hasAnyOccupancies) {
  applyOccupancyPricing(occupancyCalculation);
} else {
  applyCalculatedPricing(...); // No incluye flightOptionsPricing!
}
```

El boton "Calcular Precios" solo aplica `applyOccupancyPricing` si hay ocupaciones. Si no hay ocupaciones (caso del usuario: hotel sin configuracion de ocupacion), usa `applyCalculatedPricing` que NO conoce las opciones de vuelo.

**Solucion**: Agregar condicion para `hasFlightOptions`.

---

## Cambios Especificos

### Archivo 1: `src/hooks/useOccupancyPricingCalculator.ts`

**Cambio A - Linea 416-421**: Detectar multiples unidades de vuelo ANTES de calcular sharedServices, y excluir vuelos de la base cuando hay auto-deteccion:

```typescript
// Detectar unidades de vuelo para saber si excluir vuelos de shared
const connGroups = new Map<string, Flight[]>();
const standFlights: Flight[] = [];
for (const flight of quote.flights) {
  if (flight.connectionGroupId) {
    const g = connGroups.get(flight.connectionGroupId) || [];
    g.push(flight);
    connGroups.set(flight.connectionGroupId, g);
  } else {
    standFlights.push(flight);
  }
}
const autoDetectedMultipleFlights = (connGroups.size + standFlights.length) > 1;

// Sumar solo vuelos que NO son opciones alternativas
// Si hay auto-deteccion de multiples vuelos, NO incluir NINGUN vuelo en shared
const mainFlights = autoDetectedMultipleFlights 
  ? [] 
  : quote.flights.filter(f => !f.isOption);
```

**Cambio B - Lineas 830-833**: Calcular `totalPrice` correctamente cuando solo hay flight options:

```typescript
if (calculation.hasOccupancyTypesWithOptions) {
  // ... existing occupancy logic
} else if (calculation.hasFlightOptions && calculation.flightOptionsPricing.length > 0) {
  // Usar primera opcion de vuelo como precio total de referencia
  totalPrice = calculation.flightOptionsPricing[0].totalPrice;
  totalCost = calculation.flightOptionsPricing[0].totalCost;
} else {
  totalPrice = calculation.grandTotal.price;
  totalCost = calculation.grandTotal.cost;
}
```

### Archivo 2: `src/components/quotes/PricingSection.tsx`

**Cambio - Linea 47-59**: Agregar flight options al boton "Calcular Precios":

```typescript
const handleCalculateAutomatic = () => {
  if (hasAnyOccupancies || occupancyCalculation.hasFlightOptions) {
    const occupancyPricingUpdates = applyOccupancyPricing(occupancyCalculation);
    onUpdatePricing(occupancyPricingUpdates);
  } else {
    const calculatedPricing = applyCalculatedPricing(...);
    onUpdatePricing(calculatedPricing);
  }
};
```

### Archivo 3: `src/components/quotes/QuoteWizard.tsx`

Sin cambios adicionales - el `handleSave` ya detecta multiples unidades de vuelo correctamente.

### Archivo 4: `src/components/pdf/PDFDetailsPages.tsx`

Sin cambios necesarios - la logica de renderizado ya es correcta:
- `hasFlightOptionsPricing` verifica `flightOptionsPricing.length > 0`
- Cuando es true, muestra los cuadros individuales
- Cuando es true, oculta el cuadro de precio unico

---

## Flujo Corregido

```text
Usuario: vuelo directo $570 + vuelo con escala $590 + hotel $2600

1. Auto-deteccion: 2 unidades de vuelo (1 standalone + 1 connection group)

2. mainFlights = [] (se excluyen todos porque hay multiples opciones)
   sharedServices = transfers + trains + ferries + ... (SIN vuelos)
   baseWithoutFlights = igual que sharedServices (no hay vuelos)

3. fullBasePerPerson = (sharedServices/travelers) + (hotel/travelers)
   = (0/1) + (2600/1) = $2600

4. flightOptionsPricing:
   - Opcion 1 (directo): $2600 + $570 = $3170/persona
   - Opcion 2 (escala):  $2600 + $590 = $3190/persona

5. applyOccupancyPricing retorna:
   totalPrice: $3170 (primera opcion)
   flightOptionsPricing: [opcion1, opcion2]

6. PDF muestra 2 cuadros en "Valor del Viaje"
```

---

## Resumen de Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useOccupancyPricingCalculator.ts` | Excluir vuelos de sharedServices cuando hay auto-deteccion; calcular totalPrice desde flight options |
| `src/components/quotes/PricingSection.tsx` | Activar applyOccupancyPricing cuando hay flight options |

