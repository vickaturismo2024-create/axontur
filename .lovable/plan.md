
# Plan: Sistema de Ocupación Diferenciada para Grupos

## Problema a Resolver

Actualmente, el sistema asume que todos los pasajeros pagan lo mismo. Sin embargo, en viajes grupales (ej: 5 amigos: 2 parejas + 1 soltero), los costos de alojamiento varían según el tipo de habitación:
- **Parejas** en habitación doble: dividen el costo entre 2
- **Solteros** en habitación single: pagan el costo completo

Los servicios compartidos (vuelos, traslados, excursiones, seguro) sí se dividen igualmente entre todos.

---

## Solución Propuesta

### Concepto: "Configuración de Ocupación"

Se agregará un sistema que permite definir diferentes **tipos de ocupación** dentro del mismo presupuesto:

```text
┌────────────────────────────────────────────────────────────────┐
│ 🛏️ CONFIGURACIÓN DE OCUPACIÓN                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Total pasajeros: 5                                             │
│                                                                │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ HABITACIÓN DOBLE                                        │    │
│ │ Cantidad de habitaciones: [2]                           │    │
│ │ Pasajeros que ocupan: 4 (2 por hab.)                    │    │
│ │ Costo/noche: USD [150] → Precio/noche: USD [200]        │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ HABITACIÓN SINGLE                                       │    │
│ │ Cantidad de habitaciones: [1]                           │    │
│ │ Pasajeros que ocupan: 1                                 │    │
│ │ Costo/noche: USD [120] → Precio/noche: USD [160]        │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                │
│ [+ Agregar tipo de habitación]                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Cambios Técnicos

### 1. Nuevas Interfaces en `src/types/quote.ts`

```typescript
// Tipo de ocupación/habitación dentro de un alojamiento
export interface RoomOccupancy {
  id: string;
  roomType: 'single' | 'double' | 'triple' | 'quadruple' | 'custom';
  customTypeName?: string; // Para tipos personalizados
  roomCount: number; // Cantidad de habitaciones de este tipo
  guestsPerRoom: number; // Pasajeros por habitación (1 para single, 2 para doble, etc.)
  costPerNight?: number; // Costo neto por noche por habitación
  pricePerNight?: number; // Precio de venta por noche por habitación
  totalCost?: number; // Para modo pricing = 'total'
  totalPrice?: number; // Para modo pricing = 'total'
}

// Actualizar Lodging para soportar múltiples ocupaciones
export interface Lodging {
  // ... campos existentes ...
  
  // Nuevo: lista de tipos de ocupación
  occupancies?: RoomOccupancy[];
  // Si está vacío, se usa el sistema legacy (roomType + pricePerNight)
}

// Precio calculado por tipo de ocupación
export interface OccupancyPricing {
  occupancyType: string; // "Habitación Doble", "Habitación Single"
  guestCount: number; // Cantidad de pasajeros en este tipo
  sharedServicesPerPerson: number; // Porción de servicios fijos
  lodgingPerPerson: number; // Costo de alojamiento por persona
  totalPerPerson: number; // Total por persona para este tipo
  totalForType: number; // Total para todas las personas de este tipo
}
```

### 2. Actualizar la Interfaz `Pricing`

```typescript
export interface Pricing {
  // ... campos existentes ...
  
  // Nuevo: desglose por tipo de ocupación
  occupancyPricing?: OccupancyPricing[];
  
  // Flag para activar cálculo por ocupación
  useOccupancyPricing?: boolean;
}
```

### 3. Crear Hook `useOccupancyPricingCalculator.ts`

Lógica de cálculo:

```typescript
function calculateOccupancyPricing(quote: Quote): OccupancyPricing[] {
  const totalTravelers = quote.trip.travelers;
  const sharedServicesTotal = calculateSharedServices(quote); // vuelos, traslados, etc.
  const sharedPerPerson = sharedServicesTotal / totalTravelers;
  
  const results: OccupancyPricing[] = [];
  
  // Para cada alojamiento con ocupaciones definidas
  for (const lodging of allLodgings) {
    for (const occupancy of lodging.occupancies || []) {
      const guestCount = occupancy.roomCount * occupancy.guestsPerRoom;
      const lodgingTotal = occupancy.pricePerNight * lodging.nights * occupancy.roomCount;
      const lodgingPerPerson = lodgingTotal / guestCount;
      
      results.push({
        occupancyType: getOccupancyLabel(occupancy),
        guestCount,
        sharedServicesPerPerson: sharedPerPerson,
        lodgingPerPerson,
        totalPerPerson: sharedPerPerson + lodgingPerPerson,
        totalForType: (sharedPerPerson + lodgingPerPerson) * guestCount,
      });
    }
  }
  
  return results;
}
```

**Ejemplo de cálculo:**

| Concepto | Hab. Doble (4 pax) | Hab. Single (1 pax) |
|----------|-------------------|---------------------|
| Vuelos (USD 1000 ÷ 5) | USD 200/persona | USD 200/persona |
| Traslados (USD 250 ÷ 5) | USD 50/persona | USD 50/persona |
| Excursiones (USD 500 ÷ 5) | USD 100/persona | USD 100/persona |
| Seguro (USD 150 ÷ 5) | USD 30/persona | USD 30/persona |
| **Subtotal compartido** | **USD 380/persona** | **USD 380/persona** |
| Alojamiento (13 noches) | USD 200/n × 13 ÷ 2 = USD 1300/persona | USD 160/n × 13 = USD 2080/persona |
| **TOTAL POR PERSONA** | **USD 1680** | **USD 2460** |

---

### 4. Actualizar `QuoteWizard.tsx` - Sección Alojamiento

Agregar UI para configurar ocupaciones:

```text
┌────────────────────────────────────────────────────────────────┐
│ 🏨 Hotel Marriott Cartagena *****                              │
│ Check-in: 15 Feb | Check-out: 28 Feb | 13 noches               │
├────────────────────────────────────────────────────────────────┤
│ 🛏️ Tipos de Habitación                                        │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Tipo: [Doble ▾]  Cantidad: [2]  Pasajeros/hab: [2]         │ │
│ │ Costo/noche: [$ 150]  Precio/noche: [$ 200]                │ │
│ │ → 4 pasajeros | 13 noches | Total: USD 5,200               │ │
│ │                                              [🗑️ Eliminar] │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Tipo: [Single ▾]  Cantidad: [1]  Pasajeros/hab: [1]        │ │
│ │ Costo/noche: [$ 120]  Precio/noche: [$ 160]                │ │
│ │ → 1 pasajero | 13 noches | Total: USD 2,080                │ │
│ │                                              [🗑️ Eliminar] │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ [+ Agregar tipo de habitación]                                 │
│                                                                │
│ Validación: ✅ 5 pasajeros asignados (total: 5)               │
└────────────────────────────────────────────────────────────────┘
```

---

### 5. Actualizar `PricingSection.tsx`

Mostrar desglose por tipo de ocupación:

```text
┌────────────────────────────────────────────────────────────────┐
│ 💰 PRECIO POR TIPO DE PASAJERO                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 🛏️ HABITACIÓN DOBLE (4 pasajeros)                        │   │
│ │                                                          │   │
│ │ Servicios compartidos:          USD 380 × 4 = USD 1,520  │   │
│ │ Alojamiento (USD 200/n × 13 ÷ 2): USD 1,300 × 4 = USD 5,200│   │
│ │ ─────────────────────────────────────────────────────────│   │
│ │ PRECIO POR PERSONA:                         USD 1,680    │   │
│ │ SUBTOTAL GRUPO (4 pax):                     USD 6,720    │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 🛏️ HABITACIÓN SINGLE (1 pasajero)                        │   │
│ │                                                          │   │
│ │ Servicios compartidos:                      USD 380      │   │
│ │ Alojamiento (USD 160/n × 13):               USD 2,080    │   │
│ │ ─────────────────────────────────────────────────────────│   │
│ │ PRECIO POR PERSONA:                         USD 2,460    │   │
│ │ SUBTOTAL GRUPO (1 pax):                     USD 2,460    │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ ═══════════════════════════════════════════════════════════    │
│ TOTAL VIAJE:                                  USD 9,180        │
│ Margen: USD 1,200 (15%)                                        │
└────────────────────────────────────────────────────────────────┘
```

---

### 6. Actualizar `PDFDetailsPages.tsx`

Mostrar precios diferenciados en el PDF:

```text
┌────────────────────────────────────────────────────────────────┐
│ 💰 VALOR DEL VIAJE                                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Servicios incluidos para todos los pasajeros:                  │
│ • Vuelos, traslados, excursiones, asistencia                   │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Precio por persona en HABITACIÓN DOBLE                   │   │
│ │ (compartiendo con otro pasajero)                         │   │
│ │                                                          │   │
│ │                              USD 1,680 por persona       │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Precio por persona en HABITACIÓN SINGLE                  │   │
│ │ (uso individual)                                         │   │
│ │                                                          │   │
│ │                              USD 2,460 por persona       │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ Formas de pago: Transferencia, efectivo                        │
└────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar/Crear

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/types/quote.ts` | Modificar | Agregar `RoomOccupancy`, `OccupancyPricing`, actualizar `Lodging` y `Pricing` |
| `src/lib/validations.ts` | Modificar | Agregar schemas para nuevas estructuras |
| `src/hooks/useOccupancyPricingCalculator.ts` | Crear | Hook para calcular precios por tipo de ocupación |
| `src/hooks/usePricingCalculator.ts` | Modificar | Integrar cálculo de ocupaciones |
| `src/components/quotes/QuoteWizard.tsx` | Modificar | UI para configurar ocupaciones en sección alojamiento |
| `src/components/quotes/PricingSection.tsx` | Modificar | Mostrar desglose por ocupación |
| `src/components/pdf/PDFDetailsPages.tsx` | Modificar | Renderizar precios diferenciados |
| `src/components/pdf/PDFCoverPage.tsx` | Modificar | Mostrar composición del grupo (ej: "2 dobles + 1 single") |

---

## Flujo de Usuario

1. **Datos Generales**: Usuario ingresa 5 pasajeros
2. **Alojamiento**: Al agregar un hotel, ve sección "Tipos de Habitación"
3. **Configurar ocupaciones**: Agrega "2 habitaciones dobles" y "1 single"
4. **Validación automática**: Sistema verifica que la suma = 5 pasajeros
5. **Precio**: En sección Precio, ve desglose automático por tipo
6. **PDF**: Cliente ve claramente cuánto paga según su tipo de habitación

---

## Retrocompatibilidad

- Si `occupancies` está vacío o undefined, el sistema usa el comportamiento actual (`roomType` + `pricePerNight` dividido entre todos los pasajeros)
- Presupuestos existentes seguirán funcionando sin cambios
- El nuevo sistema es opcional y se activa al agregar ocupaciones

---

## Sección Técnica

### Estructura de datos en Supabase

Los nuevos campos se almacenarán dentro del campo `lodgings` (jsonb), que ya existe:

```json
{
  "lodgings": [
    {
      "id": "...",
      "name": "Hotel Marriott Cartagena",
      "nights": 13,
      "occupancies": [
        {
          "id": "occ-1",
          "roomType": "double",
          "roomCount": 2,
          "guestsPerRoom": 2,
          "costPerNight": 150,
          "pricePerNight": 200
        },
        {
          "id": "occ-2",
          "roomType": "single",
          "roomCount": 1,
          "guestsPerRoom": 1,
          "costPerNight": 120,
          "pricePerNight": 160
        }
      ]
    }
  ]
}
```

### Fórmula de cálculo

```typescript
// Servicios compartidos (por persona)
const sharedPerPerson = (flights + transfers + activities + insurance + otherShared) / totalTravelers;

// Alojamiento por persona según ocupación
const lodgingPerPerson = (pricePerNight * nights * roomCount) / (roomCount * guestsPerRoom);

// Total por persona
const totalPerPerson = sharedPerPerson + lodgingPerPerson;
```

### Validaciones

1. La suma de pasajeros en todas las ocupaciones debe igualar `trip.travelers`
2. Si hay discrepancia, mostrar advertencia visual
3. Permitir configuración parcial (algunos pasajeros sin asignar) con advertencia
