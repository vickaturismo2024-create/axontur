

# Fix: Auto-detectar ida/vuelta incluyendo vuelos ya vinculados

## Problema raiz encontrado

Los vuelos ya tienen `connectionGroupId` asignados (ej: `conn_1` y `conn_2` por separado). El codigo actual separa los vuelos en dos categorias:
- **connectionGroups**: vuelos CON `connectionGroupId` (van al Map)
- **standaloneFlights**: vuelos SIN `connectionGroupId`

La auto-deteccion de ida/vuelta SOLO busca entre `standaloneFlights`. Como ambos vuelos ya tienen un `connectionGroupId` diferente, nunca llegan al bloque de auto-deteccion. Resultado: 2 connection groups = 2 unidades = 2 opciones de precio.

## Solucion

Despues de construir los connection groups y las unidades de vuelo, agregar un paso adicional: **fusionar unidades de 1 solo tramo que formen un par ida/vuelta**.

---

## Cambios

### Archivo: `src/hooks/useOccupancyPricingCalculator.ts`

#### Bloque 1 (lineas 417-451) - Deteccion para shared services

Cambiar la logica para que tambien detecte pares ida/vuelta entre connection groups de 1 solo vuelo:

```typescript
// Despues de construir connGroups y standFlights:
// Considerar connection groups de 1 solo vuelo como "standalone" para deteccion
const singleConnGroups: Flight[] = [];
const multiConnGroupCount = 0; // connection groups con 2+ tramos (escalas reales)

for (const [, groupFlights] of connGroups) {
  if (groupFlights.length === 1) {
    singleConnGroups.push(groupFlights[0]);
  } else {
    multiConnGroupCount++;
  }
}

// Combinar standalone + single-connection-groups para deteccion ida/vuelta
const allSingles = [...standFlights, ...singleConnGroups];
// ... misma logica de pairing sobre allSingles ...

const autoDetectedMultipleFlights = 
  (multiConnGroupCount + autoGroupsForDetection.length + remainingSingles.length) > 1;
```

#### Bloque 2 (lineas 661-768) - Construccion de flightUnits

Misma idea: despues de construir las unidades iniciales, fusionar unidades de 1 solo vuelo que formen pares ida/vuelta:

```typescript
// Despues de construir flightUnits con connection groups y standalone:
// Post-proceso: fusionar unidades de 1 solo tramo que son ida/vuelta
const mergedUnits: FlightUnit[] = [];
const mergedIds = new Set<string>();

for (let i = 0; i < flightUnits.length; i++) {
  if (mergedIds.has(flightUnits[i].id)) continue;
  if (flightUnits[i].flights.length !== 1) {
    mergedUnits.push(flightUnits[i]);
    continue;
  }
  
  let merged = false;
  for (let j = i + 1; j < flightUnits.length; j++) {
    if (mergedIds.has(flightUnits[j].id)) continue;
    if (flightUnits[j].flights.length !== 1) continue;
    
    const a = flightUnits[i].flights[0];
    const b = flightUnits[j].flights[0];
    if (
      a.origin.toLowerCase().trim() === b.destination.toLowerCase().trim() &&
      a.destination.toLowerCase().trim() === b.origin.toLowerCase().trim()
    ) {
      // Fusionar como ida/vuelta
      const combined = [a, b].sort((x, y) => x.date.localeCompare(y.date));
      mergedUnits.push({
        id: `rt_${a.id}_${b.id}`,
        flights: combined,
        isConnection: true,
        optionLabel: '', // se reasigna abajo
        flightType: 'direct',
      });
      mergedIds.add(flightUnits[i].id);
      mergedIds.add(flightUnits[j].id);
      merged = true;
      break;
    }
  }
  if (!merged) {
    mergedUnits.push(flightUnits[i]);
  }
}

// Reasignar option labels secuenciales
mergedUnits.forEach((unit, idx) => {
  unit.optionLabel = `Opcion ${idx + 1}`;
});

// Reemplazar flightUnits con mergedUnits
// Usar mergedUnits para el calculo de hasMultipleFlightOptions
```

## Resultado esperado

- 2 vuelos con `connectionGroupId` diferentes pero que son ida/vuelta se fusionan en 1 unidad
- 2 vuelos standalone que son ida/vuelta se fusionan en 1 unidad
- Escalas reales (2+ tramos en un connection group) no se tocan
- Se genera 1 solo cuadro de precio, no 2 opciones

