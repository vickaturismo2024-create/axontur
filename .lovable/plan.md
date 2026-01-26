# Plan: Simplificar la Vista de Precios en el PDF para Clientes

## ✅ COMPLETADO

Se corrigió la visualización del PDF tanto para el sistema nuevo (`occupancyTypesWithOptions`) como para el sistema legacy (`occupancyPricing`):

### Cambios Realizados

1. **Sistema nuevo (línea 971)**: Se ocultó el bloque de desglose interno que mostraba "Servicios fijos por persona", detalles de alojamiento y "Subtotal base".

2. **Sistema nuevo (línea 1003)**: Se eliminó la línea "+USD X/persona" de cada opción de alojamiento.

3. **Sistema legacy (líneas 1085-1092)**: Se ocultaron las líneas "Servicios: USD X" y "Alojamiento: USD X" del desglose interno.

4. **Cuadro de precio total (línea 1207)**: Se actualizó la condición para ocultar el cuadro de "Precio total / Por persona" cuando hay cualquier tipo de pricing por ocupación (nuevo o legacy).

### Condición Final

```javascript
!hasOccupancyTypesWithOptions && !hasMainOccupancyPricing && (hasTotalPrice || hasPricePerPerson)
```

Esto asegura que el cuadro de precio total solo se muestre cuando NO hay precios diferenciados por ocupación.
