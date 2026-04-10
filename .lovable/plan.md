

# Plan: Fase 2 — Comparador de presupuestos

## Resumen
Agregar la posibilidad de seleccionar 2 presupuestos desde el Dashboard y compararlos lado a lado en un dialog fullscreen.

## Cambios

### 1. Crear `src/components/quotes/QuoteComparator.tsx`
- Dialog fullscreen que recibe dos `Quote` objects
- Layout en dos columnas mostrando:
  - **Datos del viaje**: destino, fechas, viajeros, moneda
  - **Desglose por categoría**: vuelos, alojamiento, traslados, trenes, ferrys, autos, actividades, crucero, seguro (costo y precio de cada uno)
  - **Totales**: precio total, costo total, margen, margen %
- Diferencias resaltadas: verde cuando un valor es menor (más barato), rojo cuando es mayor
- Botón para cerrar el comparador

### 2. Modificar `src/pages/Dashboard.tsx`
- Agregar estado `compareMode: boolean` y `selectedForCompare: string[]` (máx 2 IDs)
- Agregar botón "Comparar" en la barra de acciones (al lado de búsqueda)
- En modo comparación:
  - Mostrar checkboxes en cada `QuoteCard` para seleccionar
  - Cuando hay 2 seleccionados, mostrar botón "Ver comparación"
  - Botón "Cancelar" para salir del modo
- Al confirmar, abrir `QuoteComparator` con los 2 quotes seleccionados

### 3. Modificar `src/components/quotes/QuoteCard.tsx`
- Agregar props opcionales: `compareMode?: boolean`, `isSelectedForCompare?: boolean`, `onToggleCompare?: (id: string) => void`
- En modo comparación, mostrar checkbox overlay en la card

## Archivos
| Archivo | Acción |
|---|---|
| `src/components/quotes/QuoteComparator.tsx` | **Nuevo** |
| `src/pages/Dashboard.tsx` | Agregar modo comparación + estado |
| `src/components/quotes/QuoteCard.tsx` | Agregar checkbox para selección |

