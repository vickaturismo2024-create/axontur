

## Fase 3 — Conciliación bancaria de cobros (cuenta corriente del cliente)

### Por qué
Hoy los recibos a clientes (`file_receipts` + `file_receipt_items`) se registran y aparecen en el resumen del expediente, pero **no generan movimientos en una cuenta corriente del cliente**. En cambio, los pagos a proveedores ya tienen su CC en `account_movements` (lo arreglamos en Fase 1). Esto significa que:
- No podés ver "todos los cobros que recibiste de Juan Pérez" en un solo lugar.
- No hay simetría con la CC de proveedores: si entrás a un cliente desde `/clients`, no ves su saldo ni movimientos.
- No podés conciliar contra extractos bancarios por cliente.

### Cómo va a funcionar

**1. Trigger automático sobre `file_receipts`**
Espejado al de proveedores (`sync_supplier_payment_to_account_movement`):
- INSERT recibo con `file.client_id IS NOT NULL` → crea movimiento `credit` en `account_movements` con `account_type = 'client'`, `account_id = file.client_id`.
- UPDATE recibo (monto, fecha, status) → actualiza el movimiento; si pasa a `cancelled` lo borra.
- DELETE recibo → borra el movimiento.
- Si el expediente no tiene `client_id` (recibos viejos sin cliente enlazado) → el trigger no hace nada (igual que pagos a proveedores sin `supplier_id`).

**2. Backfill**
Insertar movimientos para todos los `file_receipts` existentes con `status <> 'cancelled'` cuyo expediente tenga `client_id`. Marca cada movimiento con `source_payment_id = receipt.id` (reusamos la columna que ya existe en `account_movements`) y `account_type = 'client'`. Idempotente: usa `ON CONFLICT (source_payment_id) DO NOTHING`.

**3. Página de detalle de cliente con CC**
Reutilizar el patrón de `SupplierDetail.tsx`:
- Nueva ruta `/clients/:id` → `ClientDetail.tsx`.
- Header con datos del cliente + saldo total por moneda (créditos − débitos).
- Tabla de movimientos: fecha, expediente (link), concepto, monto, moneda, método.
- Filtros: rango de fechas + moneda.
- Botón "Registrar movimiento manual" (mismo `NewMovementDialog` ya existente, en modo `account_type='client'`) para cargar ajustes que no vengan de un recibo (ej: nota de crédito).

**4. Acceso desde `/clients`**
- En la ficha expandible de cada cliente (`Clients.tsx`), agregar un botón "Ver cuenta corriente" que navegue a `/clients/:id`.
- En el listado, mostrar un badge con el saldo neto en USD (o ARS si el cliente solo opera en pesos), tipo el que ya tienen los proveedores.

**5. Consistencia con pestaña "Resumen" del expediente**
El componente `FileFinancialSummary` ya calcula el balance por recibos directamente — no se toca. La CC del cliente vive aparte y consolida múltiples expedientes.

### Cambios técnicos

**Base de datos (migración):**

```sql
-- 1. Constraint único para idempotencia (si no existe ya)
ALTER TABLE public.account_movements
  ADD CONSTRAINT account_movements_source_payment_id_key UNIQUE (source_payment_id);
-- (si ya existe por la fase de proveedores, se omite)

-- 2. Función espejo de la de proveedores
CREATE OR REPLACE FUNCTION public.sync_receipt_to_account_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_file_number integer;
  v_concept text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.account_movements WHERE source_payment_id = OLD.id AND account_type = 'client';
    RETURN OLD;
  END IF;

  SELECT client_id, file_number INTO v_client_id, v_file_number
    FROM public.files WHERE id = NEW.file_id;

  -- Sin cliente enlazado: no se genera CC
  IF v_client_id IS NULL THEN
    IF (TG_OP = 'UPDATE') THEN
      DELETE FROM public.account_movements WHERE source_payment_id = OLD.id AND account_type = 'client';
    END IF;
    RETURN NEW;
  END IF;

  -- Recibo cancelado: limpiar movimiento
  IF NEW.status = 'cancelled' THEN
    DELETE FROM public.account_movements WHERE source_payment_id = NEW.id AND account_type = 'client';
    RETURN NEW;
  END IF;

  v_concept := 'Cobro recibo #' || NEW.receipt_number || ' · expediente #' || COALESCE(v_file_number::text, '-');

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.account_movements (
      user_id, account_type, account_id, file_id,
      movement_type, amount, currency, concept,
      movement_date, source_payment_id, receipt_id
    ) VALUES (
      NEW.user_id, 'client', v_client_id, NEW.file_id,
      'credit', NEW.amount, NEW.currency, v_concept,
      COALESCE(NEW.payment_date, CURRENT_DATE), NEW.id, NEW.id
    )
    ON CONFLICT (source_payment_id) DO NOTHING;
    RETURN NEW;
  END IF;

  -- UPDATE
  UPDATE public.account_movements
    SET amount = NEW.amount,
        currency = NEW.currency,
        concept = v_concept,
        account_id = v_client_id,
        movement_date = COALESCE(NEW.payment_date, CURRENT_DATE),
        user_id = NEW.user_id
    WHERE source_payment_id = NEW.id AND account_type = 'client';

  IF NOT FOUND THEN
    INSERT INTO public.account_movements (
      user_id, account_type, account_id, file_id,
      movement_type, amount, currency, concept,
      movement_date, source_payment_id, receipt_id
    ) VALUES (
      NEW.user_id, 'client', v_client_id, NEW.file_id,
      'credit', NEW.amount, NEW.currency, v_concept,
      COALESCE(NEW.payment_date, CURRENT_DATE), NEW.id, NEW.id
    )
    ON CONFLICT (source_payment_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_receipt_to_account_movement
AFTER INSERT OR UPDATE OR DELETE ON public.file_receipts
FOR EACH ROW EXECUTE FUNCTION public.sync_receipt_to_account_movement();
```

**Backfill (insert tool, no migración):**
```sql
INSERT INTO public.account_movements (
  user_id, account_type, account_id, file_id,
  movement_type, amount, currency, concept,
  movement_date, source_payment_id, receipt_id
)
SELECT
  fr.user_id, 'client', f.client_id, fr.file_id,
  'credit', fr.amount, fr.currency,
  'Cobro recibo #' || fr.receipt_number || ' · expediente #' || f.file_number,
  fr.payment_date, fr.id, fr.id
FROM public.file_receipts fr
JOIN public.files f ON f.id = fr.file_id
WHERE fr.status <> 'cancelled' AND f.client_id IS NOT NULL
ON CONFLICT (source_payment_id) DO NOTHING;
```

**Frontend:**

- **`src/pages/ClientDetail.tsx`** (nuevo): clon adaptado de `SupplierDetail.tsx`, consultando `account_movements` con `account_type = 'client' AND account_id = :id`. Saldo = sum(credits) − sum(debits) por moneda.
- **`src/App.tsx`**: registrar ruta `/clients/:id`.
- **`src/pages/Clients.tsx`**: en cada tarjeta, agregar botón "Cuenta Corriente" (ícono `Wallet`) que navega a `/clients/:id`. Opcional: badge con saldo neto.
- **`src/components/accounts/NewMovementDialog.tsx`**: ya soporta `account_type` por prop, no hay que tocar — sólo lo invocamos desde ClientDetail con `account_type='client'`.

### Verificación
- Cargar un recibo nuevo de un cliente con `client_id` → aparece automáticamente en `/clients/:id` como crédito.
- Cancelar el recibo (status = 'cancelled') → desaparece de la CC sin tocar el recibo.
- Editar el monto → se refleja al instante en la CC.
- Borrar el recibo → desaparece el movimiento.
- Backfill: `SELECT COUNT(*) FROM account_movements WHERE account_type='client'` ≥ cantidad de `file_receipts` con `status<>'cancelled'` y expediente con cliente.
- Cargar un movimiento manual desde `/clients/:id` → suma al saldo sin afectar recibos.

### Fuera de alcance
- Conciliación contra extractos bancarios reales (importar CSV/OFX y matchear). Es un paso siguiente natural pero más grande.
- Notificaciones automáticas al cliente cuando hay un nuevo movimiento (mail/WhatsApp).
- Recibos sin cliente enlazado (`files.client_id IS NULL`): quedan fuera de la CC. Si querés incluirlos hay que enlazar el expediente a un cliente primero.
- Conversión multi-moneda en el saldo de la CC (hoy mostramos saldos separados por moneda, igual que en proveedores).

