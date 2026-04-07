

# Plan: Excluir transportes no incluidos del cálculo de precios

## Problema

Cuando un traslado o actividad tiene la casilla "Incluido" desactivada (campo `included: false`), su costo y precio se suman igual al total del presupuesto. Lo correcto es que solo se sumen al total si `included === true`. Los que no están incluidos deben mostrar su precio aparte en el PDF pero no afectar el precio final del paquete.

## Cambios

### 1. `src/hooks/usePricingCalculator.ts`

Filtrar transfers y activities por `included === true` antes de sumar:

- Línea ~43: cambiar `quote.transfers.forEach(...)` → `quote.transfers.filter(t => t.included).forEach(...)`
- Línea ~67: cambiar `(quote.activities || []).forEach(...)` → `(quote.activities || []).filter(a => a.included).forEach(...)`

### 2. `src/hooks/useOccupancyPricingCalculator.ts`

Mismo cambio:

- Línea ~476: filtrar transfers por `included`
- Línea ~500: filtrar activities por `included`

### 3. PDF — Precio visible para servicios no incluidos

En `src/components/pdf/PDFDetailsPages.tsx` y `src/components/pdf/PDFDetailsPage.tsx`, los traslados y actividades con `included: false` ya muestran un badge "Opcional". Verificar que también muestren el precio individual al lado (con un texto tipo "Precio aparte: $X") para que el cliente sepa cuánto cuesta ese servicio opcional. Si ya se muestra el precio, no hay cambio; si no, agregar la visualización.

### Archivos que no cambian

- Los tipos (`Transfer`, `Activity`) ya tienen el campo `included: boolean`
- Los trenes, ferrys y autos de alquiler no tienen campo `included` en sus tipos, por lo que siempre se incluyen en el cálculo (comportamiento correcto según la estructura actual)

## Impacto

Solo se modifican las funciones de cálculo para respetar el flag existente. No hay cambios en la base de datos ni en los tipos.

