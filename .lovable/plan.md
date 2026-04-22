

## Fase 1.2 — Edición de pagos + reasignación de proveedor genérico

### Diagnóstico
La migración inicial creó **un solo proveedor "Operador"** que concentra **54 pagos de 40 expedientes** que en realidad son operadores distintos. Hoy en la pestaña Proveedores del expediente sólo podés **registrar** o **borrar** pagos — no podés editarlos. Necesitamos habilitar la edición y que el cambio de proveedor se refleje automáticamente en las cuentas corrientes.

### Cómo va a funcionar

**Flujo nuevo:**
1. En la pestaña "Proveedores" del expediente, cada pago del historial muestra ahora un botón ✏️ **Editar** además del 🗑️ Eliminar.
2. Al editar un pago abrís el mismo diálogo que para registrar, pero con todos los datos precargados, incluyendo el selector de **Proveedor del catálogo**.
3. Cambiás el proveedor (por ejemplo de "Operador" → "Despegar") usando el combobox: podés elegir uno existente del catálogo o crear uno nuevo al vuelo escribiendo el nombre.
4. Al guardar:
   - El pago se actualiza con el nuevo `supplier_id` y `supplier_name`.
   - El trigger ya existente (`sync_supplier_payment_to_account_movement`) detecta el cambio de `supplier_id`, **borra el movimiento viejo** de la CC de "Operador" y **crea uno nuevo** en la CC del proveedor correcto.
   - Saldo de "Operador" baja, saldo del proveedor real sube. Sin tocar nada más.
5. Cuando termines de reasignar todos los pagos de "Operador", su CC queda vacía y podés borrar ese proveedor del catálogo desde `/suppliers` si querés.

**Bonus de UX:**
- En el diálogo de edición, si el proveedor actual es "Operador" (u otro nombre genérico común: "Proveedor", "Sin nombre", "-"), aparece un aviso amarillo: *"Este proveedor parece genérico. Cambialo por el operador real para que el saldo se refleje en su cuenta corriente."*
- El historial de pagos en el expediente muestra también el monto, fecha, método y proveedor enlazado, para que veas de un vistazo cuáles necesitan ser corregidos.

### Cambios técnicos

**Frontend (`src/components/files/FileSuppliersTab.tsx`):**
- Reutilizar el diálogo actual de "Registrar pago" para que también funcione en modo edición:
  - Agregar estado `editingPayment: SupplierPayment | null`.
  - Nueva función `openEdit(payment)` que precarga `form` (amount, currency, payment_date, payment_method, reference, notes), pre-resuelve `resolvedSupplierId` desde `payment.supplier_id`, y abre el diálogo.
  - El título del diálogo cambia entre "Registrar pago a X" y "Editar pago a X".
  - `handleSave` decide entre `INSERT` (modo nuevo) o `UPDATE WHERE id = editingPayment.id` (modo edición).
  - Botón "Editar" (`Pencil` de lucide) en cada fila del historial junto al de eliminar.
- Banner amarillo (`Alert`) dentro del diálogo cuando el `supplier_name` original esté en la lista de nombres genéricos (`['operador', 'proveedor', 'sin nombre', '-', '']`), explicando que se reasigne.
- En el agrupamiento por proveedor del listado principal, mostrar también el `supplier_id` resuelto debajo del nombre (en gris, formato pequeño) para distinguir grupos cuando hay varios "Operador" sueltos sin enlazar (después de esta fase no debería haber, pero por las dudas).

**Base de datos:**
- No se requieren cambios. El trigger `sync_supplier_payment_to_account_movement()` ya maneja el caso `OLD.supplier_id IS DISTINCT FROM NEW.supplier_id` (borra el movimiento viejo y crea uno nuevo).
- No hay migración de datos: la reasignación es manual, expediente por expediente, controlada por vos.

### Verificación
- Entrar a `/suppliers/<id>` de "Operador" → ver lista actual de 54 movimientos.
- Abrir un expediente con pago a "Operador" → click en ✏️ Editar → cambiar proveedor a "Despegar" (existente) o crear "Aerolíneas Argentinas" (nuevo) → Guardar.
- En `/suppliers/<operador_id>` el movimiento desapareció; en `/suppliers/<despegar_id>` aparece con su ícono de expediente y link.
- Repetir para los 40 expedientes. Al final, el proveedor "Operador" queda con 0 movimientos y se puede borrar manualmente.
- Editar el monto o la fecha de un pago sin cambiar proveedor también actualiza el movimiento de CC sin duplicarlo (ya cubierto por el trigger UPDATE branch).

### Fuera de alcance
- Reasignación masiva (UI tipo "bulk edit" para procesar varios pagos a la vez). Si hay muchos para corregir y resulta tedioso, lo agregamos en una iteración aparte.
- Borrado automático del proveedor "Operador" del catálogo cuando quede vacío. Lo dejamos manual por seguridad.

