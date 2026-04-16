

## Plan: Importar cobros (recibos) y pagos a operadores desde Excel

### Diagnóstico
El parser ya extrae `paymentsArs/Usd` (PAGOS = pagados a operadores) y `receivedArs/Usd` (COBROS = recibido del pasajero) por servicio, pero el importador actual solo crea el `file` y los `file_services` — descarta esos montos. El nuevo Excel `lis_res_completa1.xlsx` trae esa información completa que hay que persistir.

### Mapeo
| Columna Excel | Destino |
|---|---|
| COBROS / COBROSUS | `file_receipts` + `file_receipt_items` (cobros al pasajero) |
| PAGOS / PAGOSUS | `file_supplier_payments` (pagos a operadores) |

### Cambios

**1. `ImportFilesExcelDialog.tsx`** — extender `handleImport`:
- Tras insertar `file_services`, agrupar los cobros del pasajero por `file_id` y crear **un único `file_receipt`** por moneda (ARS/USD) con la suma total. Concepto: "Cobros importados del sistema antiguo". Fecha: `travelDate` o `openDate` o hoy.
  - Si hay ARS y USD se crean **dos recibos** (uno por moneda) o un recibo con dos `file_receipt_items` (preferido: 1 recibo + N items, así queda agrupado como en la UI actual).
- Para cada servicio con `paymentsArs > 0` o `paymentsUsd > 0`, insertar un registro en `file_supplier_payments` con `supplier_name = operatorName`, monto y moneda correspondientes, fecha = `travelDate || openDate || hoy`, concepto en `notes`.
- Si el expediente es duplicado (update), borrar antes los recibos/pagos previos importados (los que tengan marca `notes LIKE 'Importado del sistema antiguo%'`) para evitar duplicarlos.
- Al crear cuenta corriente del cliente vinculado: insertar `account_movements` (credit) por cada cobro, igual que hace el flujo manual.

**2. Contadores en el resultado final**
- Sumar `receiptsCreated` y `supplierPaymentsCreated` al objeto `ImportResult` y mostrarlos en la pantalla de resumen.

**3. Preview enriquecido**
- En el accordion de cada expediente, agregar abajo de "Servicios" una línea: "Cobros: ARS X / USD Y · Pagos a operadores: ARS X / USD Y" para que el usuario vea qué se va a crear.

### Archivos a tocar
| Archivo | Cambio |
|---|---|
| `src/components/files/ImportFilesExcelDialog.tsx` | Extender import: crear receipts + supplier_payments + movimientos de cuenta. Mostrar totales en preview y resultado |

### No se toca
- Parser (`reservationExcelParser.ts`): ya devuelve los datos necesarios.
- Schema DB: las tablas `file_receipts`, `file_receipt_items`, `file_supplier_payments` y `account_movements` ya existen con todas las columnas que necesitamos.

### Flujo end-to-end esperado
1. Usuario abre /files → "Importar Excel" → sube `lis_res_completa1.xlsx`.
2. Preview muestra cada expediente con sus servicios + totales de cobros/pagos.
3. Importa: por cada expediente nuevo o actualizado se crean los servicios, un recibo agrupado de cobros, y los pagos a operadores correspondientes.
4. Al abrir el detalle del expediente, las pestañas "Recibos" y "Operadores" muestran los movimientos importados.

