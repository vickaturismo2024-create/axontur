

# Verificacion de funciones - Problemas encontrados

## Bug 1: Reportes de proveedores - `rental_cars` vs `rentalCars` (CRITICO)

**Archivo**: `src/hooks/useSupplierAnalytics.ts`, linea 33

El hook busca `(quote as any).rental_cars` pero el objeto Quote ya fue convertido por `dbToQuote()` y usa `rentalCars` (camelCase). Esto significa que los autos de alquiler con proveedor asignado **nunca aparecen** en los reportes.

**Fix**: Cambiar `rental_cars` a `rentalCars` en la linea 33.

---

## Bug 2: Auto-save - dependencia stale en `autoSaveQuote`

**Archivo**: `src/contexts/QuotesContext.tsx`, linea 233

La funcion `autoSaveQuote` tiene `quotes` en su dependency array del `useCallback`. Esto significa que cada vez que `quotes` cambia, se recrea la funcion, pero el `useEffect` del auto-save en `QuoteWizard.tsx` (linea 158) **no incluye `autoSaveQuote`** en sus dependencias. Resultado: el auto-save puede usar una version vieja de la funcion y fallar al detectar si el quote ya existe.

**Fix**: 
- En `QuotesContext.tsx`: cambiar la logica de `autoSaveQuote` para hacer un upsert directo en lugar de chequear contra el array `quotes` local. Usar `.upsert()` en lugar de verificar existencia.
- Agregar `autoSaveQuote` al dependency array del useEffect en QuoteWizard.

---

## Bug 3: Pagos - nuevo pago se crea con status `pending` pero solo los `confirmed` suman al progreso

**Archivo**: `src/components/quotes/PaymentsSection.tsx`, linea 74

El calculo de `totalPaid` filtra `p.status === 'confirmed'`, pero el nuevo pago se inserta con status `'pending'`. Es confuso para el usuario: registra un pago y no se ve reflejado en la barra de progreso hasta que manualmente cambie el estado. Esto no es exactamente un bug sino un tema de UX que puede confundir.

**Fix sugerido**: Cambiar el status default a `'confirmed'` al crear un pago, o agregar un label explicativo en la UI de que hay que confirmar el pago.

---

## Funciones verificadas OK

- **Dashboard**: Filtros, busqueda, etiquetas, estados, archivado, favoritos - OK
- **Calendario**: Filtra solo aprobados correctamente - OK
- **Editor de presupuestos (Wizard)**: Los 13 pasos funcionan, auto-save implementado - OK (salvo Bug 2)
- **Templates**: CRUD completo con plantilla por defecto - OK
- **Clientes**: CRUD, importacion Excel, grupos, notas, documentos - OK
- **Proveedores**: CRUD y vinculacion con analytics - OK
- **Pagos**: CRUD con barra de progreso, metodos, notas - OK (salvo Bug 3 UX)
- **Versiones de presupuesto**: Snapshot y restauracion - OK
- **PDF publico y exportacion**: Generacion y link publico - OK
- **Recordatorios**: CRUD con panel - OK
- **Autenticacion**: Login/registro protegido - OK
- **Edge functions**: approve-quote, generate-itinerary, get-public-quote, parse-pnr, scrape-package - OK

---

## Resumen de cambios

| Archivo | Cambio |
|---|---|
| `src/hooks/useSupplierAnalytics.ts` | Linea 33: `rental_cars` → `rentalCars` |
| `src/contexts/QuotesContext.tsx` | `autoSaveQuote`: usar `.upsert()` en lugar de chequear existencia contra `quotes` |
| `src/components/quotes/QuoteWizard.tsx` | Agregar `autoSaveQuote` al dependency array del useEffect de auto-save |
| `src/components/quotes/PaymentsSection.tsx` | Cambiar status default de nuevo pago a `'confirmed'` |

