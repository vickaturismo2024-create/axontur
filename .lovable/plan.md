
# Plan: Completar Sistema de Opciones de Vuelo

## Problemas Identificados

El sistema actual tiene los siguientes problemas:

### 1. Cálculo de Precios Incorrecto
Los vuelos opcionales (`isOption: true`) se están sumando al total junto con los vuelos principales. Esto es incorrecto porque:
- Los vuelos opcionales son alternativas excluyentes entre sí
- Solo deben sumarse los vuelos principales al precio base
- Las opciones deben mostrarse como alternativas con precio independiente

### 2. Visualización en PDF Incompleta
Las opciones de vuelo se muestran pero falta información clara:
- No se distingue visualmente si es directo o con escala
- No se muestra claramente el tipo de equipaje
- No hay precios totales por opción que incluyan todo el viaje

### 3. Lógica de Servicios Compartidos
El hook `useOccupancyPricingCalculator.ts` suma todos los vuelos en "servicios compartidos", pero debería:
- Sumar solo vuelos principales (`!isOption`)
- Calcular opciones de vuelo separadamente

---

## Solución Propuesta

### Diseño Visual en el PDF

```text
┌─── VUELOS ──────────────────────────────────────────────────┐
│ [Tabla con vuelos principales]                              │
└─────────────────────────────────────────────────────────────┘

┌─── OPCIONES DE VUELO ───────────────────────────────────────┐
│ Elija una de las siguientes opciones:                       │
│                                                             │
│ ┌─ Buenos Aires → Cancún (15 dic) ─────────────────────────┐│
│ │                                                          ││
│ │ ╔═══════════════════════════════════════════════════════╗││
│ │ ║  OPCIÓN 1: Vuelo directo con equipaje                ║││
│ │ ║  ✈️ VUELO DIRECTO                                     ║││
│ │ ║  🧳 2 valijas de 23kg + carry-on                     ║││
│ │ ║                                                       ║││
│ │ ║  Aeromexico AM456                                     ║││
│ │ ║  10:30 - 16:45                                        ║││
│ │ ║                                                       ║││
│ │ ║                              USD 1,200/persona        ║││
│ │ ╚═══════════════════════════════════════════════════════╝││
│ │                                                          ││
│ │ ╔═══════════════════════════════════════════════════════╗││
│ │ ║  OPCIÓN 2: Solo carry-on                             ║││
│ │ ║  ✈️ VUELO DIRECTO                                     ║││
│ │ ║  🧳 Solo carry-on de 10kg                            ║││
│ │ ║                                                       ║││
│ │ ║  Aeromexico AM456                                     ║││
│ │ ║  10:30 - 16:45                                        ║││
│ │ ║                                                       ║││
│ │ ║                              USD 950/persona          ║││
│ │ ╚═══════════════════════════════════════════════════════╝││
│ │                                                          ││
│ │ ╔═══════════════════════════════════════════════════════╗││
│ │ ║  OPCIÓN 3: Con escala en Miami                       ║││
│ │ ║  ✈️ CON ESCALA                                        ║││
│ │ ║  🧳 2 valijas de 23kg + carry-on                     ║││
│ │ ║                                                       ║││
│ │ ║  American AA789                                       ║││
│ │ ║  08:00 - 18:30                                        ║││
│ │ ║                                                       ║││
│ │ ║                              USD 800/persona          ║││
│ │ ╚═══════════════════════════════════════════════════════╝││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Cambios Técnicos

### 1. Actualizar `usePricingCalculator.ts`
Modificar líneas 35-39 para excluir vuelos opcionales del total:

```typescript
// Sumar solo vuelos principales (no opcionales)
const mainFlights = quote.flights.filter(f => !f.isOption);
mainFlights.forEach(f => {
  breakdown.flights.cost += f.cost || 0;
  breakdown.flights.price += f.price || 0;
});
```

### 2. Actualizar `useOccupancyPricingCalculator.ts`
Modificar líneas 411-415 para excluir vuelos opcionales:

```typescript
// Sumar solo vuelos principales
const mainFlights = quote.flights.filter(f => !f.isOption);
mainFlights.forEach(f => {
  breakdown.flights.cost += f.cost || 0;
  breakdown.flights.price += f.price || 0;
});
```

### 3. Mejorar visualización en PDF (`PDFDetailsPages.tsx`)

En las líneas 247-311 (función `renderFlightOptionCard`), mejorar el diseño:

- Agregar badges visuales claros para "DIRECTO" / "CON ESCALA" / "CHARTER"
- Resaltar el tipo de equipaje con icono
- Mostrar el precio por persona de forma prominente
- Mejorar contraste y jerarquía visual

### 4. Agregar campos al Wizard

En `QuoteWizard.tsx`, sección de vuelos:
- Agregar selector visual de tipo de vuelo (radio buttons): Directo / Con escala / Charter
- Mostrar el equipaje de forma más prominente

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/usePricingCalculator.ts` | Excluir vuelos opcionales del cálculo de totales |
| `src/hooks/useOccupancyPricingCalculator.ts` | Excluir vuelos opcionales de servicios compartidos |
| `src/components/pdf/PDFDetailsPages.tsx` | Mejorar diseño visual de opciones de vuelo |
| `src/components/quotes/QuoteWizard.tsx` | Mejorar UI del selector de tipo de vuelo |

---

## Resumen de Comportamiento Final

### Vuelos Principales (isOption = false)
- Se muestran en la tabla normal de vuelos
- Sus precios se suman a los "servicios compartidos"
- Afectan el precio total del viaje

### Vuelos Opcionales (isOption = true)
- Se muestran en sección separada "Opciones de Vuelo"
- Sus precios NO se suman al total
- Cada opción muestra su precio por persona
- El cliente elige UNA opción
- Se agrupan por ruta y fecha

### Visualización Clara
- Badge "VUELO DIRECTO" o "CON ESCALA" o "CHARTER"
- Icono de equipaje con descripción clara
- Precio por persona destacado
- Diseño similar a las opciones de alojamiento
