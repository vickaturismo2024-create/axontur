

# Plan: Mejorar Pagos + Arreglar Reportes de Proveedores

## Problema identificado con proveedores

Revisé los datos en la base de datos y **ningún presupuesto tiene el campo `supplier` cargado** dentro de los servicios (vuelos, alojamientos, transfers, etc.). Aunque tenés proveedores creados en la tabla `suppliers`, el campo `supplier` dentro de cada servicio del presupuesto está vacío. El selector de proveedor existe en el formulario de cada servicio, pero si no se selecciona uno al cargar el servicio, queda vacío y los reportes no muestran nada.

**Solución**: No es un bug de código, sino que los datos no tienen el campo `supplier` completado. Para que los reportes funcionen, hay que asignar un proveedor a cada servicio desde el editor del presupuesto (en vuelos, alojamientos, transfers, etc., hay un selector "Operador"). Además, voy a hacer el campo más visible para que no pase desapercibido.

---

## Cambios a implementar

### 1. Hacer el selector de proveedor más visible en los steps

**Archivos**: `FlightsStep.tsx`, `LodgingStep.tsx`, `TransportStep.tsx`, `ActivitiesStep.tsx`, `CruiseStep.tsx`, `InsuranceStep.tsx`

- Mover el `SupplierSelect` a una posición más prominente (arriba, junto a los campos principales)
- Agregar un indicador visual cuando no hay proveedor asignado (borde amber/warning)

### 2. Mejorar la sección de Pagos

**Archivo**: `src/components/quotes/PaymentsSection.tsx`

Mejoras:
- Agregar campo de **notas** al formulario de nuevo pago
- Agregar **barra de progreso visual** del porcentaje pagado
- Métodos de pago predefinidos con select (Transferencia, Tarjeta de Crédito, Efectivo, Cheque, Otro) en lugar de texto libre
- Mostrar las **notas** en cada pago registrado
- Hacer responsive el formulario (2 columnas en mobile en vez de 3)
- Agregar confirmación antes de eliminar un pago
- Hacerlo visible también en mobile (actualmente está en un sidebar `lg:block` oculto en mobile)

### 3. Hacer PaymentsSection accesible en mobile

**Archivo**: `src/pages/QuoteEditor.tsx`

- Mover PaymentsSection para que también sea visible en pantallas chicas (actualmente solo se ve en `lg:block`)

---

## Archivos

| Archivo | Acción |
|---|---|
| `src/components/quotes/PaymentsSection.tsx` | Mejorar UX: progreso, notas, métodos, confirmación |
| `src/pages/QuoteEditor.tsx` | Hacer pagos visible en mobile |
| `src/components/quotes/SupplierSelect.tsx` | Estilo warning cuando vacío |
| Steps de servicios (6 archivos) | Hacer proveedor más prominente |

