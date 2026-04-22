

## Fase 1 — Sincronización automática Pagos a Proveedores → Cuenta Corriente

### Objetivo
Cuando registrás un pago a un proveedor desde un expediente (`file_supplier_payments`), el sistema crea **automáticamente** el movimiento equivalente en la cuenta corriente del proveedor (`account_movements`). Si lo modificás o eliminás, la CC se actualiza sola. No se duplica nada y los movimientos viejos quedan al día.

### Cómo va a funcionar

**Flujo nuevo (lo que cambia para vos):**
1. Cargás un pago en la pestaña "Proveedores" del expediente → se ve en CC del proveedor al instante.
2. Editás el monto del pago → el movimiento de CC se actualiza solo.
3. Eliminás el pago → el movimiento desaparece.
4. En la CC del proveedor, los movimientos automáticos muestran un **ícono de expediente** y un link al expediente origen. Esos movimientos **no se pueden borrar desde CC** (solo desde el expediente que los creó), para evitar inconsistencias.

**Backfill (única vez):** todos los `file_supplier_payments` ya cargados que aún no tienen movimiento en CC se procesan en una migración inicial. Después de esto, las cuentas corrientes de proveedores quedan al día con la realidad operativa.

### Cambios técnicos

**Base de datos (migración):**
1. Agregar columna `source_payment_id uuid` (nullable) a `account_movements` con índice único parcial `WHERE source_payment_id IS NOT NULL` para evitar duplicados.
2. Crear función `sync_supplier_payment_to_account_movement()` (SECURITY DEFINER, search_path=public) que:
   - **AFTER INSERT**: inserta movimiento con `account_type='supplier'`, `account_id=NEW.supplier_id`, `movement_type='debit'`, `concept='Pago expediente #' || file_number`, copiando amount/currency/payment_date/reference/user_id/file_id y `source_payment_id=NEW.id`. Si `supplier_id` es NULL, no hace nada (el pago no está vinculado a un proveedor del catálogo).
   - **AFTER UPDATE**: actualiza el movimiento existente que matchea `source_payment_id=OLD.id` con los nuevos valores. Si cambió el `supplier_id`, borra el viejo y crea uno nuevo.
   - **AFTER DELETE**: borra el movimiento donde `source_payment_id=OLD.id`.
3. Triggers `trg_supplier_payment_sync_aiu` (AFTER INSERT OR UPDATE) y `trg_supplier_payment_sync_ad` (AFTER DELETE) sobre `file_supplier_payments`.
4. **Backfill**: bloque `DO $$ ... $$` que recorre los `file_supplier_payments` existentes con `supplier_id NOT NULL` y crea su movimiento si todavía no existe (chequeando por `source_payment_id`). Conserva el `created_at` original del pago como `movement_date` solo si no hay `payment_date`; respeta `user_id` original.

**Frontend:**
- `src/pages/SupplierDetail.tsx` y `src/components/accounts/AccountDetail.tsx`:
  - En la tabla de movimientos, mostrar un ícono `FileText` (lucide) cuando `source_payment_id` está seteado, con tooltip "Generado desde expediente #N" y link clickeable al expediente (`/files/:file_id`).
  - Deshabilitar el botón de eliminar para esos movimientos, con tooltip explicativo.
- `src/types` / consumers de `account_movements`: agregar `source_payment_id?: string | null` al tipo (los types de Supabase se autogeneran post-migración).
- `src/components/files/FileSuppliersTab.tsx`: agregar nota informativa breve ("Este pago se reflejará automáticamente en la cuenta corriente del proveedor") arriba del formulario de pago, solo cuando haya `supplier_id` seleccionado.

### Verificación
- Crear un nuevo `file_supplier_payment` en un expediente con proveedor del catálogo → aparece en `/suppliers/:id` (cuenta corriente) con ícono y link.
- Editar el monto desde el expediente → el saldo del proveedor refleja el cambio.
- Borrar el pago → desaparece el movimiento.
- Pagos sin `supplier_id` (proveedor manual sueltos) **no** generan movimiento (comportamiento esperado).
- Después del backfill, los proveedores muestran movimientos retroactivos correctamente y la suma de saldos coincide con `SUM(amount)` de `file_supplier_payments` por `supplier_id`.
- No es posible borrar un movimiento auto-generado desde la pantalla de CC.

### Fuera de alcance (para próximas fases del documento)
- Fase 2: tabla `exchange_rate_log` y auditoría de tipo de cambio.
- Fase 3: pestaña "Resultados Reales" en Reportes.
- Fase 4: Cierre de Caja / widget de ingresos del día.
- Fase 5: Facturación AFIP.

