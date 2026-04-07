

# Plan: Optimización completa de la app — Todas las prioridades

## Resumen

Implementar las 7 mejoras identificadas: refactorizar QuoteWizard, agregar toggle `included` a trenes/ferrys/autos, reemplazar `confirm()` por AlertDialog, agregar estados de presupuesto, métricas en dashboard, links con vencimiento, y notas internas.

---

## 1. Refactorizar QuoteWizard (Prioridad Alta)

Extraer cada paso del wizard en su propio componente. El archivo actual tiene 2562 líneas.

**Nuevos archivos:**
- `src/components/quotes/steps/ClientStep.tsx` — Datos del cliente
- `src/components/quotes/steps/TripStep.tsx` — Datos del viaje
- `src/components/quotes/steps/CoverStep.tsx` — Portada
- `src/components/quotes/steps/FlightsStep.tsx` — Vuelos
- `src/components/quotes/steps/LodgingStep.tsx` — Alojamientos
- `src/components/quotes/steps/TransportStep.tsx` — Traslados, trenes, ferrys, autos
- `src/components/quotes/steps/ActivitiesStep.tsx` — Actividades
- `src/components/quotes/steps/CruiseStep.tsx` — Crucero
- `src/components/quotes/steps/InsuranceStep.tsx` — Seguro
- `src/components/quotes/steps/ItineraryStep.tsx` — Itinerario
- `src/components/quotes/steps/PricingStep.tsx` — Precios y resumen
- `src/components/quotes/steps/PreviewStep.tsx` — Vista previa

Cada componente recibe el quote parcial y callbacks `onChange` para actualizar el estado. El `QuoteWizard.tsx` queda como orquestador (~300 líneas): maneja estado global, navegación entre pasos y el botón guardar.

---

## 2. Toggle `included` en Trenes, Ferrys y Autos de alquiler (Prioridad Alta)

**Tipos** (`src/types/quote.ts`):
- Agregar `included: boolean` a `Train`, `Ferry` y `RentalCar`

**Calculadores de precios** (`usePricingCalculator.ts` y `useOccupancyPricingCalculator.ts`):
- Filtrar por `.filter(t => t.included)` antes de sumar trains, ferries y rentalCars

**UI** (en `TransportStep.tsx` post-refactor):
- Agregar Switch "Incluido en el precio" igual que transfers y activities

**PDF** (`PDFDetailsPages.tsx`):
- Mostrar badge "Opcional" y "Precio aparte: $X" para trenes/ferrys/autos con `included: false`

**Defaults**: `included` defaultea a `true` en formularios y en `buildQuoteFromImport`

---

## 3. Reemplazar `confirm()` por AlertDialog (Prioridad Media)

**Archivo**: `src/pages/Dashboard.tsx`

Reemplazar `if (confirm('¿Estás seguro...'))` por un `AlertDialog` de shadcn/ui con:
- Título: "Eliminar presupuesto"
- Descripción: "Esta acción no se puede deshacer. ¿Estás seguro?"
- Botones: "Cancelar" / "Eliminar" (destructive)

Estado local `deleteTargetId` para controlar qué presupuesto se elimina.

---

## 4. Estados/workflow de presupuestos (Prioridad Media)

**Tipo** (`src/types/quote.ts`):
- Agregar `status?: 'draft' | 'sent' | 'approved' | 'expired'` a `Quote`

**Contexto** (`QuotesContext.tsx`):
- Mapear `status` en `dbToQuote` / `quoteToDb` (ya vive dentro del JSON de `pricing` o como campo top-level en el JSON — sin migración DB, se almacena dentro del objeto quote existente)

**Migración DB**: Agregar columna `status text default 'draft'` a la tabla `quotes`

**Dashboard**:
- Badge de color por estado en `QuoteCard`
- Filtro por estado (tabs o dropdown) arriba de la grilla
- Botón "Marcar como enviado/aprobado" en el menú de acciones de cada card

---

## 5. Métricas en Dashboard (Prioridad Media)

Reemplazar las 3 stats actuales (Presupuestos, Clientes, Destinos) por 5 métricas más útiles:
- Total presupuestos
- Valor total cotizado (suma de `totalPrice`)
- Margen promedio (%)
- Presupuestos este mes
- Tasa de aprobación (aprobados / total)

Las métricas se calculan client-side desde el array `quotes`.

---

## 6. Links públicos con vencimiento (Prioridad Baja)

**Tipo**: Agregar `publicLinkExpiry?: string` (ISO date) a `Quote`

**Edge Function** (`get-public-quote`): Verificar `publicLinkExpiry` — si expiró, retornar 410 Gone

**UI**: En el menú de compartir (`PDFShareMenu`), agregar selector de vencimiento (24h, 7 días, 30 días, sin vencimiento)

**Migración DB**: No necesaria (se guarda en el JSON del quote o como columna nueva)

---

## 7. Notas internas por presupuesto (Prioridad Baja)

**Tipo**: Agregar `internalNotes?: string` a `Quote`

**UI**: Campo de texto en el QuoteWizard (en el paso de Precios o como paso separado), con label "Notas internas (no visibles en el PDF)"

**Contexto**: Mapear en `dbToQuote` / `quoteToDb`

No se renderiza en ningún componente PDF.

---

## Orden de implementación

1. Refactorizar QuoteWizard en componentes (base para todo lo demás)
2. Toggle `included` en trenes/ferrys/autos
3. AlertDialog para eliminar
4. Campo `status` + badges + filtros en dashboard
5. Métricas en dashboard
6. Notas internas
7. Links con vencimiento

## Impacto en base de datos

- Una migración: agregar columna `status text default 'draft'` a `quotes`
- El resto de campos nuevos se almacenan en los JSON existentes

