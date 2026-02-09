

# Plan: Corregir numeracion de opciones y simplificar cuadros de Valor del Viaje

## Problema 1: Numeracion incorrecta de opciones

En `src/hooks/useOccupancyPricingCalculator.ts` (linea 669), el `optionCounter` se incrementa por cada unidad de vuelo, lo cual es correcto. Pero el problema es que connection groups se agregan primero como "Opcion 1", y luego el vuelo directo standalone se agrega como "Opcion 2". Esto funciona bien.

Sin embargo, revisando mas a fondo, el counter solo incrementa una vez por unidad (lineas 688 y 700), asi que con 1 connection group + 1 standalone deberia dar "Opcion 1" y "Opcion 2". El bug real puede estar en que el `optionLabel` del vuelo ya tiene un valor preexistente (como "Opcion 3" si fue el tercer vuelo ingresado). Verificar linea 697: `flight.optionLabel || Opcion ${optionCounter}` - si el vuelo ya tiene un `optionLabel` guardado, se usa ese en vez del counter.

**Solucion**: Ignorar `optionLabel` preexistente cuando estamos en modo auto-deteccion. Siempre usar el counter propio:

```typescript
// Linea 685 y 697: Siempre usar optionCounter para auto-deteccion
optionLabel: `Opcion ${optionCounter}`,
```

## Problema 2: Demasiado detalle en los cuadros de Valor del Viaje

En `src/components/pdf/PDFDetailsPages.tsx` (lineas 1170-1234), el cuadro de cada opcion de vuelo muestra:
- Badge de tipo de vuelo (directo/escala)
- Badge de equipaje
- Label de conexion con todos los tramos
- Detalle de cada segmento (aerolinea, numero de vuelo, horarios)

Todo esto ya se muestra en la seccion de vuelos del presupuesto. El cuadro de Valor del Viaje solo necesita mostrar:
- Nombre de la opcion ("Opcion 1", "Opcion 2")
- Indicacion breve de que tipo es (directo vs con escala)
- El precio total por persona

**Solucion**: Simplificar `renderFlightOptionPriceCard` eliminando los badges de equipaje, los detalles de segmentos, y dejando solo el label de la opcion y el precio.

---

## Cambios

### Archivo 1: `src/hooks/useOccupancyPricingCalculator.ts`

Lineas 685 y 697: Forzar uso del counter en auto-deteccion, sin usar `optionLabel` preexistente:

```typescript
// Linea 685
optionLabel: `Opcion ${optionCounter}`,

// Linea 697  
optionLabel: `Opcion ${optionCounter}`,
```

### Archivo 2: `src/components/pdf/PDFDetailsPages.tsx`

Simplificar `renderFlightOptionPriceCard` (lineas 1120-1256):
- Mantener: header con nombre de opcion + indicacion breve del tipo (directo/escala)
- Eliminar: badges de equipaje
- Eliminar: detalle de segmentos (tramos, aerolineas, horarios)
- Mantener: precio total por persona y total viaje

El cuadro quedaria asi:
```
+------------------------------------------+
| OPCION 1 - Vuelo Directo                |
|                                          |
|     TOTAL POR PERSONA: USD 3,170        |
|                    Total viaje: USD 3,170|
+------------------------------------------+

+------------------------------------------+
| OPCION 2 - Vuelo con Escala             |
|                                          |
|     TOTAL POR PERSONA: USD 3,190        |
|                    Total viaje: USD 3,190|
+------------------------------------------+
```

