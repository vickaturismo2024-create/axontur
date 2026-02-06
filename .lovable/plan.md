
# Plan: Corrección del Cálculo y Visualización de Opciones de Vuelo

## Diagnóstico del Problema

Revisando el código, identifiqué las siguientes causas del problema:

### Causa 1: Los vuelos no están marcados como "isOption"
El calculador en `useOccupancyPricingCalculator.ts` (líneas 566-731) solo procesa vuelos que tienen `isOption: true`. Si los vuelos del usuario no están marcados como opciones alternativas, no se genera `flightOptionsPricing`.

**Código actual (línea 566):**
```typescript
const optionFlights = quote.flights.filter(f => f.isOption);
```

### Causa 2: Falta de cálculo cuando hay vuelos opcionales pero ninguno con connectionGroupId
El código actual asume que todos los vuelos opcionales tienen `isOption: true`. Si el usuario tiene dos vuelos (uno directo y uno con escala) pero NO los marcó como "opción alternativa", no se calculan los precios combinados.

### Causa 3: El PDF verifica `quote.pricing.flightOptionsPricing`
La condición en PDFDetailsPages.tsx (línea 1106) verifica:
```typescript
const hasFlightOptionsPricing = quote.pricing?.flightOptionsPricing && quote.pricing.flightOptionsPricing.length > 0;
```

Si `flightOptionsPricing` no se persiste (porque los vuelos no se marcaron como opciones), no se muestran los cuadros.

---

## Solución Propuesta

### Parte 1: Cambiar la Lógica de Detección de Opciones de Vuelo

**Archivo: `src/hooks/useOccupancyPricingCalculator.ts`**

Modificar la lógica para detectar opciones de vuelo de dos maneras:
1. **Explícita**: Vuelos marcados con `isOption: true` (actual)
2. **Implícita**: Si hay más de un vuelo para la misma ruta/fecha, todos son tratados como opciones

Nueva lógica:
```typescript
// Agrupar vuelos por ruta y fecha para detectar opciones implícitas
const flightsByRoute = new Map<string, Flight[]>();

for (const flight of quote.flights) {
  // Normalizar ruta: "origen-destino-fecha" o el origin/dest final si es conexión
  const routeKey = `${flight.origin.toLowerCase()}-${getFinalDestination(flight, quote.flights)}-${flight.date}`;
  const group = flightsByRoute.get(routeKey) || [];
  group.push(flight);
  flightsByRoute.set(routeKey, group);
}

// Si hay más de un vuelo para una ruta = son opciones
for (const [routeKey, flights] of flightsByRoute) {
  if (flights.length > 1) {
    // Todos son opciones alternativas para esa ruta
    flights.forEach(f => {
      // Tratar como opción para calcular precios
    });
  }
}
```

### Parte 2: Calcular Precios Siempre que Haya Múltiples Vuelos

**Archivo: `src/hooks/useOccupancyPricingCalculator.ts`**

Agregar una detección más inteligente:

```typescript
// Detectar si hay múltiples opciones de vuelo (explícitas o implícitas)
const allFlights = quote.flights;
const hasExplicitOptions = allFlights.some(f => f.isOption);

// Agrupar vuelos conectados (escalas)
const connectionGroups = new Map<string, Flight[]>();
const standaloneFlights: Flight[] = [];

for (const flight of allFlights) {
  if (flight.connectionGroupId) {
    const group = connectionGroups.get(flight.connectionGroupId) || [];
    group.push(flight);
    connectionGroups.set(flight.connectionGroupId, group);
  } else {
    standaloneFlights.push(flight);
  }
}

// Construir array de "opciones de vuelo completas"
// - Cada grupo de conexión = 1 opción
// - Cada vuelo standalone = 1 opción
const flightOptionsUnits = [
  ...Array.from(connectionGroups.entries()).map(([id, flights]) => ({
    id,
    flights,
    isConnection: true
  })),
  ...standaloneFlights.map(f => ({
    id: f.id,
    flights: [f],
    isConnection: false
  }))
];

// Si hay más de 1 unidad de vuelo, calcular precios para cada una
if (flightOptionsUnits.length > 1) {
  // Calcular FlightOptionPricing para cada unidad
}
```

### Parte 3: Agregar Opción "Marcar como Opción Alternativa" en QuoteWizard

**Archivo: `src/components/quotes/QuoteWizard.tsx`**

En la sección de vuelos, agregar un switch para marcar vuelos como opciones de forma más visible:

```typescript
// Switch para marcar como opción alternativa
<div className="flex items-center gap-2">
  <Switch
    checked={flight.isOption || false}
    onCheckedChange={(checked) => updateFlight(flight.id, { isOption: checked })}
  />
  <Label>Opción alternativa</Label>
</div>
```

### Parte 4: Mejorar la Sección de Valor del Viaje en PDF

**Archivo: `src/components/pdf/PDFDetailsPages.tsx`**

Asegurar que cuando hay `flightOptionsPricing`, NO se muestre también el cuadro de precio único (evitar duplicación):

```typescript
// Si hay opciones de vuelo, NO mostrar el precio total general
const showSinglePriceCard = !hasFlightOptionsPricing && !hasOccupancyTypesWithOptions && ...;
```

---

## Flujo Esperado con la Corrección

```
1. Usuario carga dos vuelos:
   - Vuelo directo Aerolíneas: $570
   - Vuelo con escala Copa: $590 (2 tramos)

2. Sistema detecta que hay múltiples opciones de vuelo

3. Calculador genera flightOptionsPricing:
   - Opción 1: Directo → Base ($2600) + Vuelo ($570) = $3170
   - Opción 2: Con escala → Base ($2600) + Vuelo ($590) = $3190

4. PDF muestra en "Valor del Viaje":
   ╔═══════════════════════════════════════════════════════════╗
   ║ 🏷️ OPCIÓN 1: VUELO DIRECTO                               ║
   ║ ✈️ VUELO DIRECTO · 🧳 Art. Personal + Carry On           ║
   ║                                                           ║
   ║ Buenos Aires → Cancún                                     ║
   ║                                                           ║
   ║                    TOTAL POR PERSONA: USD 3,170           ║
   ╚═══════════════════════════════════════════════════════════╝

   ╔═══════════════════════════════════════════════════════════╗
   ║ 🏷️ OPCIÓN 2: VUELO CON ESCALA                            ║
   ║ ✈️ CON ESCALA · 🧳 Art. Personal + Carry On              ║
   ║                                                           ║
   ║ Buenos Aires → Panamá → Cancún                            ║
   ║ 2 tramos                                                  ║
   ║                                                           ║
   ║                    TOTAL POR PERSONA: USD 3,190           ║
   ╚═══════════════════════════════════════════════════════════╝
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useOccupancyPricingCalculator.ts` | Detectar automáticamente múltiples opciones de vuelo y calcular precios combinados |
| `src/components/quotes/QuoteWizard.tsx` | Mejorar la UI para marcar vuelos como opciones de forma más clara |
| `src/components/pdf/PDFDetailsPages.tsx` | Evitar mostrar precio único cuando hay opciones de vuelo |

---

## Orden de Implementación

1. **Modificar calculador** - Detectar múltiples vuelos como opciones automáticamente
2. **Actualizar PDF** - Asegurar que se muestren solo los cuadros de opciones cuando corresponde
3. **Mejorar UI del wizard** - Hacer más visible el switch de "opción alternativa"
4. **Pruebas** - Verificar con el caso del usuario (vuelo directo + vuelo con escala)
