

## Fase 2 — Auditoría de tipo de cambio y conversiones multi-moneda

### Por qué
Hoy cuando registrás un recibo en una moneda distinta a la del servicio (ej: cliente paga en ARS un servicio en USD), guardás un `exchange_rate` en `file_receipt_items` pero **no queda rastro** de qué cotización usaste, cuándo, ni de dónde la sacaste. Si revisás un expediente viejo, no podés saber si el TC fue 1.000 o 1.200 al momento del cobro. Esto rompe la integridad financiera y complica el cierre contable.

### Cómo va a funcionar

**1. Tabla `exchange_rate_log`**
Cada vez que se aplica un tipo de cambio en una operación (recibo multi-moneda, pago a proveedor en otra moneda, etc.) queda registrado:
- Fecha del tipo de cambio aplicado
- Par de monedas (ej: `USD → ARS`)
- Cotización usada
- Origen: `manual` (cargada por el agente), `system` (cotización guardada en widget de dashboard) o `historical` (al editar registros viejos)
- Referencia al recibo/pago/movimiento que la usó (`source_type` + `source_id`)
- `user_id`

**2. Captura automática**
- Al guardar un `file_receipt_item` con `exchange_rate IS NOT NULL` → se inserta automáticamente en `exchange_rate_log` (vía trigger).
- Al guardar un pago a proveedor en una moneda distinta a la del servicio asociado → idem.
- Si la misma operación se edita y cambia el TC → se inserta una nueva fila (no se actualiza la vieja, para mantener historial).

**3. Visualización**
- En el detalle del recibo (modal de "Ver recibo" en pestaña Recibos del expediente) aparece un pequeño tooltip ⓘ junto a cada línea que muestra: *"TC aplicado: 1 USD = 1.150 ARS · 15/04/2026 · Manual"*.
- En `/reports` agregamos una pestaña nueva **"Tipos de Cambio"** con tabla filtrable por mes/par de monedas, mostrando promedio, mínimo, máximo y cantidad de operaciones por período. Útil para chequear consistencia.

### Cambios técnicos

**Base de datos (migración):**

```sql
CREATE TABLE public.exchange_rate_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rate_date date NOT NULL DEFAULT CURRENT_DATE,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric(20,6) NOT NULL,
  source text NOT NULL DEFAULT 'manual', -- manual | system | historical
  source_type text,                       -- receipt_item | supplier_payment | movement
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exchange_rate_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their rate log"   ON public.exchange_rate_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their rate log" ON public.exchange_rate_log FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No UPDATE/DELETE: registro inmutable.

CREATE INDEX idx_exchange_rate_log_user_date ON public.exchange_rate_log (user_id, rate_date DESC);
CREATE INDEX idx_exchange_rate_log_pair       ON public.exchange_rate_log (from_currency, to_currency);
CREATE INDEX idx_exchange_rate_log_source     ON public.exchange_rate_log (source_type, source_id);
```

**Trigger sobre `file_receipt_items`:**
- Función `log_receipt_item_exchange_rate()` que en INSERT/UPDATE, si `exchange_rate IS NOT NULL AND service_currency IS NOT NULL AND service_currency <> currency`, inserta una fila en `exchange_rate_log` con:
  - `from_currency = currency` (lo que pagó el cliente)
  - `to_currency = service_currency` (moneda del servicio)
  - `rate = exchange_rate`
  - `source = 'manual'`
  - `source_type = 'receipt_item'`
  - `source_id = NEW.id`
  - `rate_date` = fecha de pago del recibo padre (subquery a `file_receipts`)
- Trigger `AFTER INSERT OR UPDATE ON file_receipt_items` — solo registra cuando hay diferencia real para evitar inflar la tabla.

**Frontend:**

- **`src/components/files/FileReceiptsTab.tsx`** (modal de detalle / impresión): agregar tooltip con info del TC en cada `file_receipt_item` que tenga `exchange_rate` y `service_currency` distintos. Importar `Tooltip` de shadcn.
- **`src/components/reports/ExchangeRatesReport.tsx`** (nuevo): componente que consulta `exchange_rate_log` con filtros de rango de fechas + par de monedas, agrupa por mes y muestra:
  - Tabla resumen mensual: período | par | promedio | mín | máx | operaciones
  - Tabla detallada (colapsable): fecha | par | TC | origen | tipo de operación | link al recibo/pago
- **`src/pages/Reports.tsx`**: agregar nueva tab "Tipos de Cambio" que renderiza `ExchangeRatesReport`.
- **`src/lib/exportReports.ts`**: nueva función `exportExchangeRatesReport()` que vuelca el log filtrado a Excel con dos pestañas (resumen mensual + detalle).

**Backfill:**
- Migración corre un `INSERT INTO exchange_rate_log (...) SELECT ...` sobre todos los `file_receipt_items` existentes con `exchange_rate IS NOT NULL` y `service_currency <> currency`, marcándolos como `source = 'historical'`. Así los registros viejos también quedan documentados.

### Verificación
- Cargar un recibo en ARS de un servicio en USD con TC 1.150 → en el modal de detalle aparece el tooltip "TC: 1 USD = 1.150 ARS · {fecha} · Manual".
- Editar el recibo y cambiar el TC a 1.200 → en el log aparecen ambas entradas (la histórica con 1.150 y la nueva con 1.200).
- Ir a `/reports` → tab "Tipos de Cambio" → filtrar por USD→ARS de los últimos 3 meses → ver promedio/min/max + lista de operaciones.
- Exportar a Excel y verificar que las dos pestañas se generen correctamente.
- `SELECT COUNT(*) FROM exchange_rate_log WHERE source='historical'` ≥ cantidad de receipt_items multi-moneda existentes.

### Fuera de alcance
- Cotización automática diaria desde el dashboard widget hacia la tabla (hoy el widget de dashboard ya muestra cotizaciones live, no las persistimos como referencia obligatoria — se podría sumar después).
- Conversión automática del lado de pagos a proveedores (`file_supplier_payments`): hoy se guardan en su moneda original sin TC, así que no aplica todavía. Lo dejamos para una iteración aparte si surge el caso.
- Re-cálculo retroactivo de saldos consolidados con cotizaciones del día (la pestaña Resumen ya usa la cotización actual del widget para convertir; eso queda como está).

