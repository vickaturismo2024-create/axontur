
# Plan: Sistema de Opciones de Vuelos (Similar a Alojamientos)

## Objetivo

Implementar un sistema de opciones para vuelos similar al de alojamientos, permitiendo:
- **Opciones alternativas de vuelo**: Directo vs con escala
- **Opciones de equipaje**: Carry-on vs equipaje completo con diferentes precios
- **Agrupación visual en PDF**: Mostrar las opciones de vuelo de forma clara para el cliente

---

## Diseño del Sistema

### Concepto

Los vuelos se podrán marcar como "opciones" y agruparse. Por ejemplo:

```text
Grupo: Buenos Aires → Cancún (15 dic)
├── Opción 1: Vuelo directo con equipaje completo - USD 1,200
├── Opción 2: Vuelo directo solo carry-on - USD 950
└── Opción 3: Vuelo con escala + equipaje - USD 800
```

### Nuevos campos en Flight

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `isOption` | boolean | Indica si es una opción alternativa |
| `optionLabel` | string | Etiqueta (ej: "Opción 1", "Vuelo directo") |
| `groupId` | string | ID del grupo de opciones al que pertenece |
| `flightType` | string | "direct" / "stopover" / "charter" |

---

## Cambios Técnicos

### 1. Actualizar tipos (`src/types/quote.ts`)

```typescript
export interface Flight {
  id: string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  airline: string;
  flightNumber: string;
  luggage: string;
  notes: string;
  cost?: number;
  price?: number;
  // NUEVO: Sistema de opciones
  isOption?: boolean;
  optionLabel?: string;
  groupId?: string;
  flightType?: 'direct' | 'stopover' | 'charter';
}

// NUEVO: Grupo de opciones de vuelo
export interface FlightGroup {
  id: string;
  origin: string;
  destination: string;
  date: string;
  optionIds: string[];
}
```

### 2. Crear hook de grupos de vuelos (`src/hooks/useFlightGroups.ts`)

Similar a `useLodgingGroups.ts`:
- Agrupar vuelos por origen/destino/fecha
- Sugerir grupos automáticamente
- Funciones para aplicar y organizar grupos

### 3. Actualizar validaciones (`src/lib/validations.ts`)

Agregar campos nuevos al `flightSchema`:
```typescript
export const flightSchema = z.object({
  // ... campos existentes ...
  isOption: z.boolean().optional(),
  optionLabel: z.string().optional(),
  groupId: z.string().optional(),
  flightType: z.enum(['direct', 'stopover', 'charter']).optional(),
});
```

### 4. Actualizar wizard de vuelos (`src/components/quotes/QuoteWizard.tsx`)

- Agregar checkbox "Es una opción alternativa"
- Agregar campo "Etiqueta de la opción"
- Agregar selector de tipo de vuelo
- Botón "Agregar opción de vuelo"

### 5. Actualizar PDF (`src/components/pdf/PDFDetailsPages.tsx`)

Mostrar vuelos principales separados de opciones de vuelo:

```text
┌─── VUELOS ──────────────────────────────────────────────────┐
│ [Tabla con vuelos principales]                              │
└─────────────────────────────────────────────────────────────┘

┌─── OPCIONES DE VUELO ───────────────────────────────────────┐
│ Elija una de las siguientes opciones:                       │
│                                                             │
│ ┌─ Buenos Aires → Cancún (15 dic) ─────────────────────────┐│
│ │                                                          ││
│ │ 🏷️ Opción 1: Vuelo directo + 2 valijas                  ││
│ │    Aeromexico AM456 · 10:30 - 16:45 · USD 1,200         ││
│ │                                                          ││
│ │ 🏷️ Opción 2: Vuelo directo solo carry-on               ││
│ │    Aeromexico AM456 · 10:30 - 16:45 · USD 950           ││
│ │                                                          ││
│ │ 🏷️ Opción 3: Con escala en Miami                        ││
│ │    American AA789 · 08:00 - 18:30 · USD 800             ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 6. Actualizar cálculo de precios (`src/hooks/useOccupancyPricingCalculator.ts`)

Cuando hay opciones de vuelo, el cálculo debe considerar:
- Vuelos principales: se suman a los servicios fijos
- Opciones de vuelo: se muestran como alternativas que afectan el precio final

---

## Flujo de Usuario

### Paso 1: Agregar vuelo principal
El agente agrega el vuelo que va en el presupuesto por defecto.

### Paso 2: Agregar opciones de vuelo
1. Click en "Agregar opción de vuelo"
2. Se crea un nuevo vuelo marcado como opción
3. El agente puede personalizar la etiqueta (ej: "Vuelo directo", "Solo carry-on")
4. Ingresa los datos y precios diferentes

### Paso 3: Agrupación automática
Los vuelos con misma ruta y fecha se agrupan automáticamente para mostrar en el PDF.

### Paso 4: Vista previa
El PDF muestra las opciones de vuelo de forma clara para que el cliente pueda elegir.

---

## Impacto en Precios por Ocupación

Cuando hay opciones de vuelo, el precio final debe mostrar todas las combinaciones posibles:

```text
┌─── HABITACIÓN DOBLE ────────────────────────────────────────┐
│                                                             │
│ Con vuelo directo + equipaje completo:     USD 3,500       │
│ Con vuelo directo solo carry-on:           USD 3,250       │
│ Con vuelo con escala:                      USD 3,050       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Sin embargo, para una primera versión, propongo:
1. **Primera fase**: Mostrar opciones de vuelo en sección separada sin combinar con precios por ocupación
2. **Segunda fase**: Integrar opciones de vuelo en el cálculo combinado (si lo deseas)

---

## Archivos a Modificar/Crear

| Archivo | Acción |
|---------|--------|
| `src/types/quote.ts` | Agregar campos a `Flight` + crear `FlightGroup` |
| `src/hooks/useFlightGroups.ts` | **CREAR** - Hook similar a `useLodgingGroups` |
| `src/lib/validations.ts` | Actualizar `flightSchema` |
| `src/components/quotes/QuoteWizard.tsx` | Agregar UI para opciones de vuelo |
| `src/components/pdf/PDFDetailsPages.tsx` | Agregar sección de opciones de vuelo |

---

## Orden de Implementación

1. **Actualizar tipos** - Agregar campos nuevos a `Flight` y crear `FlightGroup`
2. **Actualizar validaciones** - Asegurar que los nuevos campos se guarden correctamente
3. **Crear hook de grupos** - Lógica para agrupar vuelos por ruta/fecha
4. **Actualizar wizard** - UI para marcar vuelos como opciones
5. **Actualizar PDF** - Mostrar opciones de vuelo agrupadas
6. **Pruebas** - Verificar guardado, preview y exportación

---

## Ejemplo Visual en el Wizard

```text
┌──────────────────────────────────────────────────────────────┐
│ Tramo 1                                                 [🗑️] │
├──────────────────────────────────────────────────────────────┤
│ ☐ Es una opción alternativa                                  │
│                                                              │
│ Origen: [Buenos Aires (EZE)]  Destino: [Cancún (CUN)]       │
│ Fecha: [2024-12-15]           Horarios: [10:30] - [16:45]   │
│ Aerolínea: [Aeromexico]       Vuelo: [AM456]                │
│ Tipo: [● Directo ○ Con escala ○ Charter]                    │
│ Equipaje: [2 valijas de 23kg + carry-on                ]    │
│                                                              │
│ Costo neto: [950.00]          Precio venta: [1200.00]       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 🏷️ Opción 2: Solo carry-on                             [🗑️] │
├──────────────────────────────────────────────────────────────┤
│ ☑ Es una opción alternativa                                  │
│ Etiqueta: [Solo carry-on                               ]    │
│                                                              │
│ [... mismos campos ...]                                      │
│                                                              │
│ Equipaje: [Solo carry-on de 10kg                       ]    │
│ Costo neto: [700.00]          Precio venta: [950.00]        │
└──────────────────────────────────────────────────────────────┘

[+ Agregar vuelo]  [+ Agregar opción de vuelo]  [📋 Parsear PNR]
```
