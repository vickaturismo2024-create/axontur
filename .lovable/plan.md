
# Plan: Corrección del Sistema de Opciones de Vuelo

## Problemas Identificados

### Problema 1: Tramos Conectados (Escalas) como Opciones Separadas
Actualmente, cuando se importa un PNR con escala (ej: Buenos Aires → Miami → Cancún), se crean dos vuelos con `connectionGroupId` compartido. Sin embargo, el calculador de precios itera sobre **cada vuelo individual** marcado como `isOption`, generando tarjetas de precio separadas para cada tramo.

**Código actual (líneas 618-646 de `useOccupancyPricingCalculator.ts`):**
```typescript
for (const flight of optionFlights) {
  // Calcula precio individual para CADA vuelo
  // En vez de agrupar tramos conectados
}
```

**Resultado incorrecto:**
- Opción 1: Buenos Aires → Miami - USD 400
- Opción 2: Miami → Cancún - USD 200
  
**Resultado esperado:**
- Opción 1: Buenos Aires → Miami → Cancún (con escala) - USD 600

### Problema 2: Visualización en PDF
Aunque los cuadros de precio de opciones de vuelo ya muestran el total combinado (servicios fijos + vuelo), cuando hay tramos conectados se muestran como opciones separadas en lugar de una sola.

---

## Solución Propuesta

### Parte 1: Agrupar Tramos Conectados en el Calculador

**Archivo: `src/hooks/useOccupancyPricingCalculator.ts`**

Modificar la sección de cálculo de `flightOptionsPricing` (líneas 565-646) para:

1. Agrupar vuelos opcionales por `connectionGroupId`
2. Si un vuelo no tiene `connectionGroupId`, tratarlo como opción individual
3. Sumar precios de todos los tramos del mismo `connectionGroupId` como UNA opción

Nueva lógica:

```typescript
// Agrupar vuelos opcionales por connectionGroupId
const flightOptionGroups = new Map<string, Flight[]>();
const standaloneOptions: Flight[] = [];

for (const flight of optionFlights) {
  if (flight.connectionGroupId) {
    const group = flightOptionGroups.get(flight.connectionGroupId) || [];
    group.push(flight);
    flightOptionGroups.set(flight.connectionGroupId, group);
  } else {
    standaloneOptions.push(flight);
  }
}

// Generar FlightOptionPricing para cada grupo/opción independiente
// Cada grupo de conexión = 1 opción de vuelo
// Cada vuelo suelto = 1 opción de vuelo
```

### Parte 2: Actualizar la Interfaz FlightOptionPricing

**Archivo: `src/types/quote.ts`**

Agregar campos para manejar tramos conectados:

```typescript
export interface FlightOptionPricing {
  // ... campos existentes ...
  
  // NUEVO: Para opciones con múltiples tramos
  flightIds?: string[]; // IDs de todos los vuelos del grupo
  isConnectionGroup?: boolean; // Es un grupo de tramos conectados
  connectionLabel?: string; // "Buenos Aires → Miami → Cancún"
  segments?: {
    origin: string;
    destination: string;
    date: string;
    departureTime: string;
    arrivalTime: string;
    airline: string;
    flightNumber: string;
  }[];
}
```

### Parte 3: Actualizar Visualización en PDF

**Archivo: `src/components/pdf/PDFDetailsPages.tsx`**

Actualizar la función `renderFlightOptionPriceCard` para mostrar todos los tramos de una conexión:

```
╔═══════════════════════════════════════════════════════════════╗
║ 🏷️ VUELO CON ESCALA                                          ║
║ ✈️ CON ESCALA · 🧳 Artículo Personal + Carry On               ║
║                                                               ║
║ Tramo 1: Buenos Aires (EZE) → Miami (MIA)                     ║
║          15 Dic · 10:30 - 16:45 · American AA789             ║
║                                                               ║
║ Tramo 2: Miami (MIA) → Cancún (CUN)                          ║
║          15 Dic · 18:30 - 20:00 · American AA123             ║
║                                                               ║
║                              TOTAL POR PERSONA                ║
║                              USD 850                          ║
╚═══════════════════════════════════════════════════════════════╝
```

### Parte 4: Actualizar Validaciones

**Archivo: `src/lib/validations.ts`**

Agregar los nuevos campos al esquema `flightOptionPricingSchema`:

```typescript
flightIds: z.array(z.string()).optional(),
isConnectionGroup: z.boolean().optional(),
connectionLabel: z.string().optional(),
segments: z.array(z.object({
  origin: z.string(),
  destination: z.string(),
  date: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  airline: z.string(),
  flightNumber: z.string(),
})).optional(),
```

---

## Flujo de Datos Final

```
1. Usuario carga PNR con escala
   ↓
2. Se crean 2 vuelos con mismo connectionGroupId
   ↓
3. Usuario marca ambos como "opción alternativa"
   ↓
4. Calculador agrupa por connectionGroupId
   ↓
5. Genera 1 FlightOptionPricing con:
   - Suma de precios de ambos tramos
   - Lista de segmentos
   - connectionLabel = "EZE → MIA → CUN"
   ↓
6. PDF muestra 1 cuadro de precio con:
   - Todos los tramos listados
   - Precio total combinado (vuelo + servicios fijos)
```

---

## Ejemplo Concreto

**Datos del presupuesto:**
- Alojamiento: USD 500
- Asistencia: USD 50
- Opción de vuelo A (con escala): 
  - Tramo 1: USD 300
  - Tramo 2: USD 100
- Opción de vuelo B (directo): USD 450

**Resultado esperado en PDF:**

```
┌─ VALOR DEL VIAJE ─────────────────────────────────────────────┐
│                                                               │
│ Elija una de las siguientes opciones de vuelo:                │
│                                                               │
│ ╔═══════════════════════════════════════════════════════════╗ │
│ ║ 🏷️ OPCIÓN 1: VUELO CON ESCALA                            ║ │
│ ║ ✈️ CON ESCALA · 🧳 Art. Personal + Carry On              ║ │
│ ║                                                           ║ │
│ ║ Buenos Aires → Miami → Cancún                             ║ │
│ ║ 2 tramos · Vuelo: USD 400                                 ║ │
│ ║                                                           ║ │
│ ║                          TOTAL POR PERSONA: USD 950       ║ │
│ ║                          (aloj + asist + vuelo)           ║ │
│ ╚═══════════════════════════════════════════════════════════╝ │
│                                                               │
│ ╔═══════════════════════════════════════════════════════════╗ │
│ ║ 🏷️ OPCIÓN 2: VUELO DIRECTO                               ║ │
│ ║ ✈️ VUELO DIRECTO · 🧳 Art. Personal + Carry On + Bodega  ║ │
│ ║                                                           ║ │
│ ║ Buenos Aires → Cancún                                     ║ │
│ ║ Vuelo: USD 450                                            ║ │
│ ║                                                           ║ │
│ ║                          TOTAL POR PERSONA: USD 1,000     ║ │
│ ║                          (aloj + asist + vuelo)           ║ │
│ ╚═══════════════════════════════════════════════════════════╝ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/types/quote.ts` | Agregar campos para tramos conectados en `FlightOptionPricing` |
| `src/lib/validations.ts` | Actualizar esquema `flightOptionPricingSchema` |
| `src/hooks/useOccupancyPricingCalculator.ts` | Agrupar tramos por `connectionGroupId` antes de calcular precios |
| `src/components/pdf/PDFDetailsPages.tsx` | Mostrar tramos múltiples en cuadros de precio |

---

## Orden de Implementación

1. **Actualizar tipos** - Agregar campos nuevos a `FlightOptionPricing`
2. **Actualizar validaciones** - Asegurar que los nuevos campos se persistan
3. **Modificar calculador** - Agrupar tramos conectados antes de generar `FlightOptionPricing`
4. **Actualizar PDF** - Mostrar tramos múltiples en cuadros de precio de forma clara
5. **Pruebas** - Verificar con vuelo con escala + vuelo directo como opciones alternativas
