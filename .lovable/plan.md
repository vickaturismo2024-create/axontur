

# Plan: Mejoras en Expedientes — Pasajeros, Servicios, Recibos y Proveedores

## Resumen

5 mejoras interconectadas al módulo de expedientes: (1) importar pasajeros sin límite con buscador, (2) vencimiento de pago y moneda por servicio, (3) recibos multi-moneda/multi-pago, (4) pestaña de operadores/proveedores con egresos, (5) notificaciones de vencimiento.

---

## 1. Importar pasajeros del CRM: sin límite + buscador

**Problema**: La lista de clientes tiene `max-h-48` (altura fija) y no se puede buscar. Los clientes después de la "P" quedan ocultos.

**Solución** en `FilePassengersTab.tsx`:
- Aumentar `max-h-48` a `max-h-72` 
- Agregar un `<Input>` de búsqueda arriba de la lista que filtre clientes por nombre en tiempo real
- Mostrar todos los resultados filtrados sin restricción de cantidad

---

## 2. Servicios: vencimiento de pago + selector de moneda

**Cambios en BD** — migración para agregar columna a `file_services`:
```sql
ALTER TABLE file_services ADD COLUMN payment_due_date date DEFAULT NULL;
```

**Cambios en `FileServicesTab.tsx`**:
- Agregar campo "Vencimiento de pago" (date input) en el formulario de servicio
- Agregar selector de moneda (USD/ARS/EUR/BRL) — actualmente el campo `currency` existe pero no hay selector en el form
- Mostrar badge de alerta en servicios con vencimiento próximo o vencido

**Notificaciones**: Integrar en `RemindersBadge.tsx` una consulta adicional a `file_services` para detectar servicios con `payment_due_date` vencida o próxima (≤3 días). Mostrar esas alertas junto con los recordatorios existentes en `RemindersPanel.tsx`.

---

## 3. Recibos: multi-moneda y recibo múltiple

**Cambios en BD** — nueva tabla para líneas de recibo:
```sql
CREATE TABLE file_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_method text DEFAULT 'transfer',
  exchange_rate numeric DEFAULT NULL,
  service_currency text DEFAULT NULL,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE file_receipt_items ENABLE ROW LEVEL SECURITY;
-- RLS owner-based (4 policies CRUD)
```

**Cambios en `FileReceiptsTab.tsx`**:
- Al crear un recibo, permitir agregar N líneas de pago (cada una con monto, moneda, método de pago y cotización opcional)
- Ejemplo: Servicio en USD, cliente paga parte en ARS (con cotización) y parte con tarjeta en USD
- Cada línea muestra: monto, moneda de pago, método, y cotización si aplica
- El recibo muestra el total consolidado
- Al guardar, insertar movimientos de crédito en `account_movements` por cada línea

---

## 4. Nueva pestaña: Operadores/Proveedores del expediente

**Cambios en BD** — nueva tabla para pagos a operadores:
```sql
CREATE TABLE file_supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL,
  user_id uuid NOT NULL,
  supplier_id uuid,
  supplier_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'transfer',
  reference text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE file_supplier_payments ENABLE ROW LEVEL SECURITY;
-- RLS owner-based (4 policies CRUD)
```

**Nuevo componente `FileSuppliersTab.tsx`**:
- Lista los proveedores involucrados en el expediente (extraídos de `file_services` agrupados por `supplier_name`)
- Para cada proveedor muestra: nombre, costo total por moneda, total pagado, saldo pendiente
- Botón "Registrar pago" que abre diálogo con: monto, moneda, fecha, método, referencia, notas
- Al registrar pago, también insertar movimiento de débito en `account_movements` para el proveedor
- Cada pago registrado queda listado con fecha para control contable

**Cambios en `FileDetail.tsx`**:
- Agregar tab "Operadores" entre "Pasajeros" y "Recibos"

---

## 5. Notificaciones de vencimiento de servicios

**Cambios en `RemindersBadge.tsx`**:
- Consultar `file_services` con `payment_due_date` vencido o dentro de 3 días, con status != 'cancelled'
- Sumar esos al contador de notificaciones

**Cambios en `RemindersPanel.tsx`**:
- Agregar sección "Vencimientos de servicios" que lista servicios con vencimiento próximo/vencido
- Mostrar: descripción del servicio, expediente, proveedor, fecha de vencimiento, monto

---

## Archivos afectados

| Archivo | Acción |
|---------|--------|
| `file_services` (BD) | Agregar columna `payment_due_date` |
| `file_receipt_items` (BD) | Nueva tabla |
| `file_supplier_payments` (BD) | Nueva tabla |
| `FilePassengersTab.tsx` | Buscador + sin límite de altura |
| `FileServicesTab.tsx` | Selector moneda + campo vencimiento pago |
| `FileReceiptsTab.tsx` | Recibo multi-línea con multi-moneda/método |
| `FileSuppliersTab.tsx` (nuevo) | Pestaña operadores con pagos/egresos |
| `FileDetail.tsx` | Agregar tab "Operadores" |
| `RemindersBadge.tsx` | Incluir vencimientos de servicios |
| `RemindersPanel.tsx` | Listar vencimientos de servicios |

