
# Plan: Corrección del Sistema de Opciones de Vuelo ✅ COMPLETADO

## Cambios Implementados

### ✅ Parte 1: Tipos Actualizados (`src/types/quote.ts`)
- Agregada interfaz `FlightSegment` para representar tramos individuales
- Agregados campos a `FlightOptionPricing`:
  - `flightIds?: string[]` - IDs de todos los vuelos del grupo
  - `isConnectionGroup?: boolean` - Indica si es un grupo de tramos conectados
  - `connectionLabel?: string` - Etiqueta de ruta (ej: "EZE → MIA → CUN")
  - `segments?: FlightSegment[]` - Detalles de cada tramo

### ✅ Parte 2: Validaciones Actualizadas (`src/lib/validations.ts`)
- Agregado esquema `flightSegmentSchema`
- Actualizado `flightOptionPricingSchema` con los nuevos campos

### ✅ Parte 3: Calculador de Precios (`src/hooks/useOccupancyPricingCalculator.ts`)
- Implementada agrupación de vuelos opcionales por `connectionGroupId`
- Los tramos conectados (escalas) ahora generan UNA sola `FlightOptionPricing`
- Se suman los precios de todos los tramos del grupo
- Se construye automáticamente `connectionLabel` y array de `segments`

### ✅ Parte 4: PDF Actualizado (`src/components/pdf/PDFDetailsPages.tsx`)
- `renderFlightOptionPriceCard` ahora muestra:
  - Etiqueta de conexión (ej: "Buenos Aires → Miami → Cancún")
  - Cada tramo con su información detallada
  - Precio total combinado (servicios fijos + vuelo)

## Flujo de Datos

```
1. Usuario carga PNR con escala → 2 vuelos con mismo connectionGroupId
2. Usuario marca ambos como "opción alternativa"
3. Calculador agrupa por connectionGroupId
4. Genera 1 FlightOptionPricing con suma de precios + lista de segmentos
5. PDF muestra 1 cuadro de precio con todos los tramos + total combinado
```

## Ejemplo

**Datos:**
- Alojamiento: $500 + Asistencia: $50 = Base: $550
- Opción A (con escala): Tramo 1 $300 + Tramo 2 $100 = $400
- Opción B (directo): $450

**Resultado en PDF:**
- Opción A: $950/persona (base $550 + vuelo $400)
- Opción B: $1,000/persona (base $550 + vuelo $450)

