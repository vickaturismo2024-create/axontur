
# Plan: Sistema de Opciones de Vuelo ✅ COMPLETADO

## Resumen de Cambios Implementados

### 1. Detección Automática de Opciones de Vuelo ✅
**Archivo:** `src/hooks/useOccupancyPricingCalculator.ts`

El sistema ahora detecta automáticamente cuando hay múltiples vuelos y genera opciones de precio:

- **Conexiones (escalas):** Vuelos con el mismo `connectionGroupId` se agrupan como UNA opción
- **Vuelos independientes:** Cada vuelo sin conexión es UNA opción
- **Cálculo automático:** Si hay más de 1 "unidad de vuelo", se calculan precios para cada una

**Ejemplo:**
```
Vuelos cargados:
- Aerolíneas Argentinas directo (EZE → CUN) = $570
- Copa con escala (EZE → PTY, PTY → CUN) = $590

Sistema detecta 2 unidades de vuelo:
- Opción 1: Vuelo directo
- Opción 2: Vuelo con escala (agrupa ambos tramos)

Genera flightOptionsPricing:
- Opción 1: Base $2600 + Vuelo $570 = $3170/persona
- Opción 2: Base $2600 + Vuelo $590 = $3190/persona
```

### 2. PDF Muestra Cuadros de Precio por Opción ✅
**Archivo:** `src/components/pdf/PDFDetailsPages.tsx`

- Si hay `flightOptionsPricing`, se muestran cuadros separados por cada opción
- El cuadro único de "Valor del Viaje" NO se muestra cuando hay opciones de vuelo
- Cada cuadro incluye:
  - Etiqueta de opción
  - Badge de tipo (DIRECTO, CON ESCALA, CHARTER)
  - Badge de equipaje
  - Ruta completa (para conexiones: EZE → PTY → CUN)
  - Precio total por persona

### 3. Persistencia Automática al Guardar ✅
**Archivo:** `src/components/quotes/QuoteWizard.tsx`

- Al guardar, se aplica automáticamente `applyOccupancyPricing()`
- `flightOptionsPricing` se persiste en la base de datos
- No requiere clic manual en "Recalcular precios"

## Flujo Actual

```
1. Usuario carga vuelos (directo y con escala)
   ↓
2. Sistema agrupa por connectionGroupId
   ↓
3. Detecta 2+ unidades de vuelo = genera opciones automáticamente
   ↓
4. Al guardar → persiste flightOptionsPricing
   ↓
5. PDF → muestra cuadros separados en "Valor del Viaje"
```

## Notas Técnicas

- El checkbox "Es una opción alternativa" en el wizard ya existía y sigue funcionando
- La detección automática funciona AUNQUE los vuelos no estén marcados como opción
- Las conexiones se identifican por `connectionGroupId` (generado por el parser PNR)

