
# Plan: Sistema de Opciones de Vuelo - IMPLEMENTADO

## Estado: ✅ COMPLETADO

## Cambios Realizados

### 1. `src/hooks/useFlightGroups.ts` - Agrupación de Tramos Conectados
- Nuevo tipo `FlightOptionDisplay` que puede contener múltiples vuelos (tramos de escala)
- El hook ahora agrupa vuelos con el mismo `connectionGroupId` como UNA opción
- Vuelos individuales sin conexión se muestran como opciones separadas
- Retorna `flightOptions: FlightOptionDisplay[]` para uso en el PDF

### 2. `src/components/pdf/PDFDetailsPages.tsx` - Renderizado Unificado
- La sección "Opciones de Vuelo" ahora usa `flightOptions` en lugar de vuelos individuales
- Conexiones muestran todos los tramos en un solo cuadro:
  - Label de conexión: "EZE → MIA → CUN"
  - Cada tramo con sus detalles (fecha, horario, aerolínea)
  - Badge "CON ESCALA" automático
- Los cuadros de "Valor del Viaje" se muestran correctamente para cada opción

### 3. `src/components/quotes/QuoteWizard.tsx` - Auto-persistencia de Precios
- Usa `useOccupancyPricingCalculator` para calcular precios automáticamente
- Al guardar, si hay vuelos opcionales u ocupaciones, aplica los cálculos
- `flightOptionsPricing` se persiste automáticamente en la BD

### 4. `src/hooks/useOccupancyPricingCalculator.ts` - Ya Estaba Implementado
- Agrupa vuelos por `connectionGroupId`
- Suma precios de todos los tramos de una conexión
- Genera `FlightOptionPricing` con:
  - `connectionLabel`: Ruta completa
  - `segments`: Detalles de cada tramo
  - `pricePerPerson`: Total base + vuelo

## Flujo Final

```
1. Usuario carga PNR con escala (2 tramos) → Se crean con mismo connectionGroupId
2. En sección "Opciones de Vuelo": 1 cuadro con todos los tramos
3. Al guardar: flightOptionsPricing se calcula y persiste automáticamente
4. En sección "Valor del Viaje": Cuadros separados para cada opción con precio total

## Problemas Identificados

Revisando el código actual, encontré **dos problemas principales**:

### Problema 1: Tramos Conectados se Muestran Separadamente
En la sección "Opciones de Vuelo" del PDF (`PDFDetailsPages.tsx`, líneas 230-427), los vuelos opcionales se muestran individualmente usando `renderFlightOptionCard`. El hook `useFlightGroups` agrupa por `groupId` (opciones alternativas de la misma ruta), pero **no considera `connectionGroupId`** (tramos que son parte de una escala).

**Resultado actual:**
- Se muestran 2 cuadros separados: "Buenos Aires → Miami" y "Miami → Cancún"

**Resultado esperado:**
- Se muestra 1 cuadro unificado: "Buenos Aires → Miami → Cancún (con escala)"

### Problema 2: Los Cuadros de Precio No Aparecen en el PDF
El calculador `useOccupancyPricingCalculator` calcula correctamente `flightOptionsPricing`, pero estos datos solo se persisten cuando el usuario hace clic en "Recalcular precios" en la sección de Pricing. Si el usuario no hace esto, `quote.pricing.flightOptionsPricing` está vacío y no se muestran los cuadros.

---

## Solución

### Parte 1: Agrupar Tramos Conectados en la Sección de Vuelos

**Archivo: `src/hooks/useFlightGroups.ts`**

Modificar para considerar `connectionGroupId`:
- Agrupar vuelos con el mismo `connectionGroupId` como una sola "opción de vuelo"
- Mostrar todos los tramos dentro de un solo cuadro visual

```typescript
// En organizeFlightsByGroups, primero agrupar por connectionGroupId
const connectionGroups = new Map<string, Flight[]>();
const nonConnectedFlights: Flight[] = [];

flights.filter(f => f.isOption).forEach(flight => {
  if (flight.connectionGroupId) {
    const group = connectionGroups.get(flight.connectionGroupId) || [];
    group.push(flight);
    connectionGroups.set(flight.connectionGroupId, group);
  } else {
    nonConnectedFlights.push(flight);
  }
});
```

### Parte 2: Actualizar Renderizado en PDF

**Archivo: `src/components/pdf/PDFDetailsPages.tsx`**

Crear una nueva función `renderConnectionFlightCard` que muestre todos los tramos de una conexión como una sola opción:

```
┌─────────────────────────────────────────────────────────┐
│ 🏷️ OPCIÓN 1: VUELO CON ESCALA                         │
│ ✈️ CON ESCALA · 🧳 Art. Personal + Carry On            │
│                                                         │
│ ┌─ Tramo 1 ─────────────────────────────────────────┐  │
│ │ Buenos Aires (EZE) → Miami (MIA)                  │  │
│ │ 15 Dic · 10:30 - 16:45 · American AA789           │  │
│ └───────────────────────────────────────────────────┘  │
│ ┌─ Tramo 2 ─────────────────────────────────────────┐  │
│ │ Miami (MIA) → Cancún (CUN)                        │  │
│ │ 15 Dic · 18:30 - 20:00 · American AA123           │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│                        Precio total: USD 400/persona    │
└─────────────────────────────────────────────────────────┘
```

### Parte 3: Auto-calcular `flightOptionsPricing` al Guardar

**Archivo: `src/components/quotes/QuoteWizard.tsx`**

Antes de guardar el quote, verificar si hay vuelos opcionales y auto-aplicar el cálculo de precios:

```typescript
const handleSave = () => {
  // Si hay vuelos opcionales, aplicar cálculo automático
  const optionFlights = quote.flights.filter(f => f.isOption);
  if (optionFlights.length > 0) {
    const occupancyPricingUpdates = applyOccupancyPricing(occupancyCalculation);
    finalQuote.pricing = { ...finalQuote.pricing, ...occupancyPricingUpdates };
  }
  onSave(finalQuote);
};
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useFlightGroups.ts` | Agregar agrupación por `connectionGroupId` |
| `src/components/pdf/PDFDetailsPages.tsx` | Renderizar tramos conectados como una sola opción |
| `src/components/quotes/QuoteWizard.tsx` | Auto-aplicar cálculo de precios al guardar |

---

## Flujo Final Esperado

```
1. Usuario carga PNR con escala (2 tramos)
   ↓
2. Sistema detecta que tienen mismo connectionGroupId
   ↓
3. En sección "Opciones de Vuelo":
   - Se muestra 1 cuadro con todos los tramos
   - Badge "CON ESCALA"
   - Precio suma de ambos tramos
   ↓
4. En sección "Valor del Viaje":
   - Cuadro 1: "Opción con escala" → Base + $400 = $950
   - Cuadro 2: "Opción directa" → Base + $450 = $1,000
   ↓
5. Al guardar, flightOptionsPricing se persiste automáticamente
```

---

## Ejemplo Visual Final

**Sección Opciones de Vuelo:**

```
┌─── OPCIONES DE VUELO ───────────────────────────────────────┐
│                                                              │
│ ╔════════════════════════════════════════════════════════╗  │
│ ║ 🏷️ OPCIÓN 1: CON ESCALA EN MIAMI                      ║  │
│ ║ ✈️ CON ESCALA · 🧳 Art. Personal + Carry On            ║  │
│ ║                                                        ║  │
│ ║ Tramo 1: EZE → MIA                                     ║  │
│ ║ 15 Dic · 10:30-16:45 · AA789                          ║  │
│ ║                                                        ║  │
│ ║ Tramo 2: MIA → CUN                                     ║  │
│ ║ 15 Dic · 18:30-20:00 · AA123                          ║  │
│ ║                                                        ║  │
│ ║                          USD 400/persona               ║  │
│ ╚════════════════════════════════════════════════════════╝  │
│                                                              │
│ ╔════════════════════════════════════════════════════════╗  │
│ ║ 🏷️ OPCIÓN 2: VUELO DIRECTO                            ║  │
│ ║ ✈️ VUELO DIRECTO · 🧳 Art. Personal + Carry On + Bod. ║  │
│ ║                                                        ║  │
│ ║ EZE → CUN                                              ║  │
│ ║ 15 Dic · 10:00-16:00 · AM456                          ║  │
│ ║                                                        ║  │
│ ║                          USD 450/persona               ║  │
│ ╚════════════════════════════════════════════════════════╝  │
└──────────────────────────────────────────────────────────────┘
```

**Sección Valor del Viaje:**

```
┌─── VALOR DEL VIAJE ─────────────────────────────────────────┐
│                                                              │
│ Elija una de las siguientes opciones:                        │
│                                                              │
│ ╔════════════════════════════════════════════════════════╗  │
│ ║ 🏷️ OPCIÓN 1: CON ESCALA EN MIAMI                      ║  │
│ ║ ✈️ CON ESCALA · 🧳 Art. Personal + Carry On            ║  │
│ ║                                                        ║  │
│ ║ EZE → MIA → CUN                                        ║  │
│ ║ 2 tramos                                               ║  │
│ ║                                                        ║  │
│ ║                    TOTAL POR PERSONA                   ║  │
│ ║                    USD 3,190                           ║  │
│ ╚════════════════════════════════════════════════════════╝  │
│                                                              │
│ ╔════════════════════════════════════════════════════════╗  │
│ ║ 🏷️ OPCIÓN 2: VUELO DIRECTO                            ║  │
│ ║ ✈️ VUELO DIRECTO · 🧳 Art. Personal + Carry On + Bod. ║  │
│ ║                                                        ║  │
│ ║ EZE → CUN                                              ║  │
│ ║                                                        ║  │
│ ║                    TOTAL POR PERSONA                   ║  │
│ ║                    USD 3,170                           ║  │
│ ╚════════════════════════════════════════════════════════╝  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Orden de Implementación

1. **Actualizar `useFlightGroups.ts`** - Agregar soporte para `connectionGroupId`
2. **Actualizar `PDFDetailsPages.tsx`** - Renderizar conexiones como una sola opción
3. **Actualizar `QuoteWizard.tsx`** - Auto-calcular precios al guardar
4. **Pruebas** - Verificar con vuelo con escala + vuelo directo
