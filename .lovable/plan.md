# Plan completado

El sistema de precios por tipo de ocupación con opciones de alojamiento ha sido implementado.

## Resumen de cambios

1. **Nuevos tipos en `quote.ts`**:
   - `LodgingOptionForOccupancy`: Opción de alojamiento dentro de un tipo de ocupación
   - `OccupancyTypeWithOptions`: Tipo de ocupación (single, double, etc.) con opciones dentro

2. **Nuevo algoritmo en `useOccupancyPricingCalculator.ts`**:
   - Agrupa precios por tipo de ocupación (no por alojamiento)
   - Calcula servicios fijos + alojamientos principales + opciones alternativas
   - Mantiene compatibilidad con sistema legacy

3. **Actualización de UI**:
   - `PricingSection.tsx`: Muestra cuadros por tipo de ocupación con opciones dentro
   - `PDFDetailsPages.tsx`: Renderiza cuadros claros para el cliente

## Resultado

Cada tipo de ocupación (Single, Doble, Triple) muestra:
- Servicios fijos por persona
- Alojamientos principales (si existen)
- Opciones alternativas con su precio total por persona
