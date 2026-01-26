

# Plan: Reestructurar Precios por Tipo de Ocupación con Opciones de Alojamiento

## Problema Actual

El sistema muestra los precios separados por alojamiento, creando múltiples cuadros confusos. Cuando hay opciones alternativas de alojamiento, cada opción se muestra como un bloque separado con sus propios tipos de ocupación.

**Ejemplo actual (confuso):**
```
┌── Alojamiento Principal ──┐
│ Single: USD 2,460         │
│ Doble: USD 1,680          │
└───────────────────────────┘

┌── Opción 1: Hotel A ──────┐
│ Single: USD 2,500         │
│ Doble: USD 1,700          │
└───────────────────────────┘

┌── Opción 2: Hotel B ──────┐
│ Single: USD 2,300         │
│ Doble: USD 1,600          │
└───────────────────────────┘
```

## Solución Propuesta

Reorganizar para mostrar **un cuadro por tipo de ocupación**, con todas las opciones de alojamiento dentro del mismo cuadro.

**Ejemplo deseado (claro):**
```text
┌─────────────────────────────────────────────────────────────────┐
│ 🛏️ HABITACIÓN SINGLE (1 pasajero por habitación)              │
├─────────────────────────────────────────────────────────────────┤
│ Servicios fijos por persona:              USD 380              │
│ Alojamientos únicos (destino A):          USD 500              │
├─────────────────────────────────────────────────────────────────┤
│ Opciones de alojamiento (elija una):                           │
│                                                                 │
│   • Opción 1 - Hotel Premium:             USD 2,080            │
│     TOTAL POR PERSONA:                    USD 2,960            │
│                                                                 │
│   • Opción 2 - Hotel Económico:           USD 1,500            │
│     TOTAL POR PERSONA:                    USD 2,380            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🛏️ HABITACIÓN DOBLE (2 pasajeros por habitación)              │
├─────────────────────────────────────────────────────────────────┤
│ Servicios fijos por persona:              USD 380              │
│ Alojamientos únicos (destino A):          USD 250              │
├─────────────────────────────────────────────────────────────────┤
│ Opciones de alojamiento (elija una):                           │
│                                                                 │
│   • Opción 1 - Hotel Premium:             USD 1,300            │
│     TOTAL POR PERSONA:                    USD 1,930            │
│                                                                 │
│   • Opción 2 - Hotel Económico:           USD 950              │
│     TOTAL POR PERSONA:                    USD 1,580            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Lógica de Cálculo Propuesta

### Componentes del precio por persona:

1. **Servicios fijos** (igual para todos): 
   - Vuelos + Transfers + Trenes + Ferries + Autos + Actividades + Crucero + Seguro
   - Dividido entre total de pasajeros

2. **Alojamientos únicos** (sin opciones alternativas):
   - Hoteles que NO son opciones (`isOption = false`)
   - Se suman al precio base de cada tipo de ocupación

3. **Opciones alternativas** (mutuamente excluyentes):
   - Hoteles marcados como opciones (`isOption = true`)
   - Se muestran dentro del cuadro de cada tipo de ocupación
   - El cliente elige UNA opción

### Fórmula:

```
Para cada TIPO DE OCUPACIÓN (single, doble, etc.):

  precio_base = servicios_fijos_por_persona + alojamientos_unicos_por_persona

  Para cada OPCIÓN de alojamiento:
    precio_opcion = precio_de_esta_opcion_por_persona
    TOTAL_POR_PERSONA = precio_base + precio_opcion
```

---

## Cambios Técnicos

### 1. Nueva estructura de datos

```typescript
// Nuevo tipo para representar precio por ocupación con opciones
interface OccupancyTypeWithOptions {
  roomType: 'single' | 'double' | 'triple' | 'quadruple' | 'custom';
  occupancyLabel: string; // "Habitación Single", "Habitación Doble"
  guestsPerRoom: number;
  totalRooms: number; // Total de habitaciones de este tipo
  totalGuests: number; // Total de pasajeros en este tipo
  
  // Base fija (servicios + alojamientos únicos)
  sharedServicesPerPerson: number;
  mainLodgingPerPerson: number; // Alojamientos sin opciones
  basePerPerson: number; // sharedServices + mainLodging
  
  // Opciones alternativas de alojamiento
  lodgingOptions: {
    lodgingId: string;
    lodgingName: string;
    optionLabel: string;
    lodgingPerPerson: number;
    totalPerPerson: number; // base + lodgingPerPerson
    // Internos (no se muestran en PDF)
    lodgingCostPerPerson: number;
    totalCostPerPerson: number;
    marginPerPerson: number;
    marginPercentage: number;
  }[];
  
  // Si no hay opciones, precio único
  singlePrice?: {
    totalPerPerson: number;
    totalCostPerPerson: number;
    marginPerPerson: number;
    marginPercentage: number;
  };
}
```

### 2. Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `src/types/quote.ts` | Agregar `OccupancyTypeWithOptions` y actualizar `Pricing` |
| `src/hooks/useOccupancyPricingCalculator.ts` | Reescribir para agrupar por tipo de ocupación |
| `src/components/quotes/PricingSection.tsx` | Mostrar nueva estructura agrupada |
| `src/components/pdf/PDFDetailsPages.tsx` | Renderizar cuadros por tipo de ocupación |

### 3. Nuevo algoritmo de cálculo

```typescript
function calculateOccupancyWithOptions(quote: Quote) {
  const totalTravelers = quote.trip.travelers;
  
  // 1. Calcular servicios fijos por persona
  const sharedServices = calculateSharedServices(quote);
  const sharedPerPerson = sharedServices / totalTravelers;
  
  // 2. Separar alojamientos
  const allLodgings = quote.lodgings || [];
  const mainLodgings = allLodgings.filter(l => !l.isOption);
  const optionLodgings = allLodgings.filter(l => l.isOption);
  
  // 3. Identificar todos los tipos de ocupación usados
  const occupancyTypes = new Map<string, OccupancyTypeWithOptions>();
  
  // Agregar tipos de alojamientos principales
  for (const lodging of mainLodgings) {
    if (!lodging.useOccupancies || !lodging.occupancies) continue;
    for (const occ of lodging.occupancies) {
      // Agregar o actualizar tipo
      addToOccupancyType(occupancyTypes, occ, lodging, 'main');
    }
  }
  
  // Agregar tipos de opciones alternativas
  for (const lodging of optionLodgings) {
    if (!lodging.useOccupancies || !lodging.occupancies) continue;
    for (const occ of lodging.occupancies) {
      addToOccupancyType(occupancyTypes, occ, lodging, 'option');
    }
  }
  
  // 4. Calcular precios finales para cada tipo
  return Array.from(occupancyTypes.values());
}
```

---

## Validaciones Necesarias

1. **Consistencia de tipos de ocupación**: Si tengo opciones alternativas, todas deben tener los mismos tipos de ocupación (si Hotel A tiene single y doble, Hotel B también debe tenerlos)

2. **Cantidad de pasajeros**: La suma de pasajeros en todos los tipos debe igualar el total de viajeros

3. **Advertencias**: Si una opción no tiene un tipo de ocupación que otra sí tiene, mostrar advertencia

---

## Flujo de Usuario Actualizado

1. **Agregar alojamiento principal** (ej: Hotel en Bogotá)
   - Configurar ocupaciones: 2 dobles + 1 single = 5 pasajeros
   
2. **Agregar opciones alternativas** (ej: para Cartagena)
   - Opción 1: Hotel Marriott - configurar mismas ocupaciones
   - Opción 2: Hotel Hilton - configurar mismas ocupaciones

3. **Sección Precios**: Ver desglose automático agrupado por tipo de ocupación

4. **PDF Final**: El cliente ve claramente:
   - "Si viajas en habitación SINGLE, pagarás $X con Hotel Marriott o $Y con Hotel Hilton"
   - "Si viajas en habitación DOBLE, pagarás $A con Hotel Marriott o $B con Hotel Hilton"

---

## Ejemplo Visual del PDF

```text
╔═════════════════════════════════════════════════════════════════╗
║                    💰 VALOR DEL VIAJE                           ║
╠═════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  Servicios incluidos: Vuelos, traslados, excursiones,          ║
║  asistencia al viajero                                          ║
║                                                                 ║
║ ┌─────────────────────────────────────────────────────────────┐ ║
║ │ 🛏️ PRECIO POR PERSONA EN HABITACIÓN SINGLE                 │ ║
║ │                                                             │ ║
║ │ Servicios fijos:                        USD 380             │ ║
║ │ Hotel Bogotá (incluido):                USD 520             │ ║
║ │ ────────────────────────────────────────────────            │ ║
║ │ Subtotal base:                          USD 900             │ ║
║ │                                                             │ ║
║ │ 📋 Opciones para Cartagena:                                 │ ║
║ │                                                             │ ║
║ │   • Hotel Marriott          USD 2,080                       │ ║
║ │     TOTAL:                  USD 2,980 por persona           │ ║
║ │                                                             │ ║
║ │   • Hotel Hilton            USD 1,800                       │ ║
║ │     TOTAL:                  USD 2,700 por persona           │ ║
║ └─────────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║ ┌─────────────────────────────────────────────────────────────┐ ║
║ │ 🛏️ PRECIO POR PERSONA EN HABITACIÓN DOBLE                  │ ║
║ │                                                             │ ║
║ │ Servicios fijos:                        USD 380             │ ║
║ │ Hotel Bogotá (incluido):                USD 260             │ ║
║ │ ────────────────────────────────────────────────            │ ║
║ │ Subtotal base:                          USD 640             │ ║
║ │                                                             │ ║
║ │ 📋 Opciones para Cartagena:                                 │ ║
║ │                                                             │ ║
║ │   • Hotel Marriott          USD 1,300                       │ ║
║ │     TOTAL:                  USD 1,940 por persona           │ ║
║ │                                                             │ ║
║ │   • Hotel Hilton            USD 1,100                       │ ║
║ │     TOTAL:                  USD 1,740 por persona           │ ║
║ └─────────────────────────────────────────────────────────────┘ ║
║                                                                 ║
║  Forma de pago: Transferencia, efectivo o tarjeta              ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Sección Técnica

### Nueva interfaz en types/quote.ts

```typescript
// Opción de alojamiento dentro de un tipo de ocupación
export interface LodgingOptionForOccupancy {
  lodgingId: string;
  lodgingName: string;
  optionLabel: string;
  destination?: string;
  lodgingPricePerPerson: number;
  totalPricePerPerson: number;
  // Internos
  lodgingCostPerPerson: number;
  totalCostPerPerson: number;
  marginPerPerson: number;
  marginPercentage: number;
}

// Tipo de ocupación con todas sus opciones
export interface OccupancyTypeWithOptions {
  id: string;
  roomType: 'single' | 'double' | 'triple' | 'quadruple' | 'custom';
  occupancyLabel: string;
  guestsPerRoom: number;
  totalRooms: number;
  totalGuests: number;
  
  // Base (servicios fijos + alojamientos obligatorios)
  sharedServicesPerPerson: number;
  sharedServicesCostPerPerson: number;
  mainLodgingPricePerPerson: number;
  mainLodgingCostPerPerson: number;
  basePricePerPerson: number;
  baseCostPerPerson: number;
  
  // Opciones alternativas (si existen)
  hasOptions: boolean;
  lodgingOptions: LodgingOptionForOccupancy[];
  
  // Precio único (si no hay opciones)
  singleTotalPerPerson?: number;
  singleTotalCostPerPerson?: number;
  marginPerPerson?: number;
  marginPercentage?: number;
}
```

### Actualización del Pricing interface

```typescript
export interface Pricing {
  // ... campos existentes ...
  
  // Nuevo: precios agrupados por tipo de ocupación
  occupancyTypesWithOptions?: OccupancyTypeWithOptions[];
}
```

### Algoritmo principal

```typescript
// En useOccupancyPricingCalculator.ts

// 1. Mapear tipos de ocupación únicos (single, double, etc.)
const occupancyTypesMap = new Map<string, {
  roomType: RoomType;
  mainLodgings: { lodging: Lodging; occupancy: RoomOccupancy }[];
  optionLodgings: { lodging: Lodging; occupancy: RoomOccupancy }[];
}>();

// 2. Poblar con alojamientos principales
for (const lodging of mainLodgings) {
  for (const occupancy of lodging.occupancies || []) {
    const key = occupancy.roomType;
    if (!occupancyTypesMap.has(key)) {
      occupancyTypesMap.set(key, { roomType: key, mainLodgings: [], optionLodgings: [] });
    }
    occupancyTypesMap.get(key)!.mainLodgings.push({ lodging, occupancy });
  }
}

// 3. Poblar con opciones alternativas
for (const lodging of optionLodgings) {
  for (const occupancy of lodging.occupancies || []) {
    const key = occupancy.roomType;
    if (!occupancyTypesMap.has(key)) {
      occupancyTypesMap.set(key, { roomType: key, mainLodgings: [], optionLodgings: [] });
    }
    occupancyTypesMap.get(key)!.optionLodgings.push({ lodging, occupancy });
  }
}

// 4. Calcular precios para cada tipo
const result: OccupancyTypeWithOptions[] = [];
for (const [roomType, data] of occupancyTypesMap) {
  // Sumar alojamientos principales
  let mainLodgingPrice = 0;
  let mainLodgingCost = 0;
  let totalGuests = 0;
  let totalRooms = 0;
  
  for (const { lodging, occupancy } of data.mainLodgings) {
    const nights = lodging.nights || 0;
    const guests = occupancy.roomCount * occupancy.guestsPerRoom;
    totalGuests += guests;
    totalRooms += occupancy.roomCount;
    
    // Calcular precio por persona para este alojamiento
    const lodgingTotal = (occupancy.pricePerNight || 0) * nights * occupancy.roomCount;
    mainLodgingPrice += lodgingTotal / guests;
    
    const lodgingCost = (occupancy.costPerNight || 0) * nights * occupancy.roomCount;
    mainLodgingCost += lodgingCost / guests;
  }
  
  // Calcular cada opción alternativa
  const options: LodgingOptionForOccupancy[] = [];
  for (const { lodging, occupancy } of data.optionLodgings) {
    const nights = lodging.nights || 0;
    const guests = occupancy.roomCount * occupancy.guestsPerRoom;
    
    const optLodgingTotal = (occupancy.pricePerNight || 0) * nights * occupancy.roomCount;
    const optLodgingPerPerson = optLodgingTotal / guests;
    
    const totalPerPerson = sharedPerPerson + mainLodgingPrice + optLodgingPerPerson;
    
    options.push({
      lodgingId: lodging.id!,
      lodgingName: lodging.name,
      optionLabel: lodging.optionLabel || 'Opción',
      lodgingPricePerPerson: optLodgingPerPerson,
      totalPricePerPerson: totalPerPerson,
      // ... costos y márgenes
    });
  }
  
  result.push({
    id: crypto.randomUUID(),
    roomType,
    occupancyLabel: getOccupancyLabel({ roomType }),
    guestsPerRoom: getGuestsPerRoomType(roomType),
    totalRooms,
    totalGuests,
    sharedServicesPerPerson: sharedPerPerson,
    mainLodgingPricePerPerson: mainLodgingPrice,
    basePricePerPerson: sharedPerPerson + mainLodgingPrice,
    hasOptions: options.length > 0,
    lodgingOptions: options,
    // Si no hay opciones, precio único
    singleTotalPerPerson: options.length === 0 
      ? sharedPerPerson + mainLodgingPrice 
      : undefined,
    // ...
  });
}
```

### Orden de ejecución

1. Actualizar `src/types/quote.ts` con nuevas interfaces
2. Reescribir `src/hooks/useOccupancyPricingCalculator.ts` con nuevo algoritmo
3. Actualizar `src/components/quotes/PricingSection.tsx` para mostrar nueva estructura
4. Actualizar `src/components/pdf/PDFDetailsPages.tsx` para renderizar cuadros por tipo de ocupación

