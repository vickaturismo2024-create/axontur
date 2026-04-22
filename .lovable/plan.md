

## Fase 1.1 — Enlazar pagos al catálogo de Proveedores

### Por qué no funcionaba
El trigger ya está activo y correcto, pero **los 58 pagos cargados tienen `supplier_id = NULL`** (sólo guardan el nombre escrito a mano: "Operador", "Tienda Leon"…). La función de sync está diseñada para ignorar pagos sin enlace al catálogo, así que nunca generó movimientos en CC.

### Solución

**1. Match automático + selector de respaldo (flujo nuevo)**

En el diálogo "Registrar pago" de la pestaña Proveedores:
- Al abrirse, intenta matchear el `supplier_name` del servicio contra el catálogo (búsqueda case-insensitive por nombre, scoped al `user_id`).
- Si hay match → enlaza automático y muestra una etiqueta verde "Enlazado a catálogo: <nombre>".
- Si no hay match → muestra un `Combobox` con autocompletar de proveedores existentes + opción "+ Crear proveedor «<nombre>»" que crea el registro al vuelo.
- El campo es **obligatorio**: sin `supplier_id` no se permite guardar (con tooltip explicando que sin esto el pago no aparece en la cuenta corriente).

**2. Backfill con auto-creación (pagos viejos)**

Migración única que:
- Recorre los `file_supplier_payments` con `supplier_id IS NULL` agrupados por `(user_id, lower(trim(supplier_name)))`.
- Para cada nombre único: si existe un proveedor del catálogo con ese nombre (case-insensitive), reusa su id; si no, crea uno nuevo en `suppliers` con `name = supplier_name` original (preservando capitalización del primer pago) y `type = ''`.
- Hace `UPDATE file_supplier_payments SET supplier_id = <id>` en bloque para cada nombre.
- El trigger `trg_supplier_payment_sync_aiu` dispara automáticamente en cada UPDATE → genera los 58 movimientos en `account_movements` con su `source_payment_id`.
- Salida: log de cuántos proveedores nuevos se crearon y cuántos pagos se enlazaron.

### Cambios técnicos

**Migración SQL:**
- Bloque `DO $$ … $$` que hace el backfill descrito (auto-crea proveedores, actualiza pagos, deja que el trigger cree los movements).
- No toca el trigger ni la función — ya están bien.

**Frontend (`src/components/files/FileSuppliersTab.tsx`):**
- Cargar lista de proveedores del catálogo (`suppliers` del usuario) al montar el tab.
- En `openPayment()`: pre-resolver `supplier_id` haciendo match case-insensitive sobre `supplier.name` vs el `supplier_name` del servicio.
- Reemplazar el header del diálogo por un combobox/select que muestre el match resuelto y permita cambiarlo o crear nuevo (`Command` + `Popover` de shadcn ya disponibles en el proyecto).
- Botón "Registrar pago" deshabilitado mientras `supplier_id` esté vacío + helper text explicativo.
- Si el usuario crea un proveedor nuevo desde el diálogo, se guarda en `suppliers` y queda disponible en futuros pagos.

### Verificación
- Tras correr la migración: `SELECT COUNT(*) FROM account_movements WHERE source_payment_id IS NOT NULL` debe ser ≥ 58.
- Entrar a `/suppliers/<id>` de "Tienda Leon", "Ticket Ya" u "Operador" → ver los pagos retroactivos con ícono de expediente y link.
- Cargar un pago nuevo en un expediente: el diálogo muestra el proveedor matcheado o el selector; al guardar aparece al instante en la CC del proveedor.
- Editar / borrar el pago desde el expediente actualiza la CC sola (trigger ya probado).

### Fuera de alcance
- Limpiar duplicados o normalizar nombres de proveedores existentes en el catálogo.
- Enlazar también los `file_services` al catálogo (este plan sólo toca pagos, que es lo que afecta CC).

