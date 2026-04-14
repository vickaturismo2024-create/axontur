
# Plan: Resumen Financiero Consolidado por Expediente

## Resumen

Agregar una nueva pestaña "Resumen" en cada expediente que muestre un balance financiero completo: ingresos (recibos de clientes), egresos (pagos a operadores), saldos pendientes y margen real, todo segregado por moneda.

## Cambios

### 1. Nuevo componente `src/components/files/FileFinancialSummary.tsx`

Card con 4 secciones, agrupadas por moneda (USD, ARS, EUR, etc.):

| Concepto | Fuente de datos |
|----------|----------------|
| **Precio de venta total** | `file_services` → suma de `price` por moneda |
| **Costo total** | `file_services` → suma de `cost` por moneda |
| **Cobrado al cliente** | `file_receipts` + `file_receipt_items` → suma de `amount` por moneda |
| **Pagado a operadores** | `file_supplier_payments` → suma de `amount` por moneda |
| **Pendiente de cobro** | Precio venta - Cobrado |
| **Pendiente de pago** | Costo - Pagado a operadores |
| **Margen bruto** | Precio venta - Costo (monto y %) |
| **Resultado neto actual** | Cobrado - Pagado |

- Indicadores visuales: verde para saldos positivos, rojo para pendientes
- Badges de alerta si hay montos vencidos sin pagar (cruzando con `payment_due_date`)

### 2. `src/pages/FileDetail.tsx`

- Agregar tab "Resumen" como primera pestaña (defaultValue)
- Importar `FileFinancialSummary`

## Archivos afectados

| Archivo | Acción |
|---------|--------|
| `src/components/files/FileFinancialSummary.tsx` | Crear: resumen financiero consolidado |
| `src/pages/FileDetail.tsx` | Agregar pestaña "Resumen" |

No requiere cambios de BD — usa las tablas existentes con consultas de agregación.
