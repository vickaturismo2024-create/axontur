
# Plan: Auto-detectar vuelos ida y vuelta sin necesidad de vincular manualmente

## Problema real

Los vuelos tienen `connectionGroupId` diferentes (`conn_1` y `conn_2`) porque el usuario creó un grupo nuevo para cada vuelo en vez de vincular el segundo al grupo del primero. La UI no es lo suficientemente clara, y ademas no deberia ser necesario vincular manualmente vuelos ida y vuelta que son obvios.

## Solucion

Auto-detectar pares ida/vuelta en la logica de calculo, sin depender de `connectionGroupId`. Si hay vuelos standalone cuyas rutas son inversas (A->B y B->A), tratarlos como 1 sola unidad automaticamente.

---

## Cambios

### Archivo 1: `src/hooks/useOccupancyPricingCalculator.ts`

**2 lugares donde se agrupan vuelos (lineas 417-429 y 640-713)**

En ambos bloques, despues de separar vuelos en `connectionGroups` y `standaloneFlights`, agregar logica para detectar pares ida/vuelta entre los standalone:

```typescript
// Despues de separar standalone y connection groups:
// Auto-detectar pares ida/vuelta entre standalone flights
const pairedStandalone: Set<string> = new Set();
const autoGroups: Flight[][] = [];

for (let i = 0; i < standaloneFlights.length; i++) {
  if (pairedStandalone.has(standaloneFlights[i].id)) continue;
  for (let j = i + 1; j < standaloneFlights.length; j++) {
    if (pairedStandalone.has(standaloneFlights[j].id)) continue;
    const a = standaloneFlights[i];
    const b = standaloneFlights[j];
    if (
      a.origin.toLowerCase().trim() === b.destination.toLowerCase().trim() &&
      a.destination.toLowerCase().trim() === b.origin.toLowerCase().trim()
    ) {
      // Par ida/vuelta detectado
      pairedStandalone.add(a.id);
      pairedStandalone.add(b.id);
      autoGroups.push([a, b]);
      break;
    }
  }
}

const remainingStandalone = standaloneFlights.filter(f => !pairedStandalone.has(f.id));
```

Luego, los `autoGroups` se tratan como connection groups (1 unidad cada uno), y `remainingStandalone` se tratan como vuelos individuales.

**Bloque 1 (lineas 417-429)** - Calculo de `autoDetectedMultipleFlights`:
```typescript
const autoDetectedMultipleFlights = 
  (connGroups.size + autoGroups.length + remainingStandalone.length) > 1;
```

**Bloque 2 (lineas 640-713)** - Construccion de `flightUnits`:
- Los `autoGroups` se agregan como unidades con `flightType: 'direct'` y `isConnection: true`
- Los `remainingStandalone` se agregan como vuelos individuales
- El counter sigue siendo secuencial

### Archivo 2: Sin cambios adicionales necesarios

La logica del PDF ya maneja correctamente `flightType === 'direct'` con multiples `flightIds`.

---

## Resultado esperado

1. Usuario carga vuelo BUE->NAT y vuelo NAT->BUE (sin vincular manualmente)
2. El sistema detecta automaticamente que son ida y vuelta
3. Los cuenta como 1 sola unidad de vuelo
4. No se generan cuadros de opciones (1 sola unidad = precio unico)
5. Si hay un tercer vuelo alternativo, ahi si aparecen 2 opciones

## Nota

El boton de "Vincular vuelos" sigue disponible para casos donde la auto-deteccion no aplica (ej: multi-ciudad A->B, B->C que no es ida/vuelta pero es un solo paquete).
