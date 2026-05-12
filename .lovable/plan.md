## Problema

En el recibo REC-0052 las líneas se suman como números planos:

```
USD 500,00 + ARS 715.000,00 = "USD 715.500,00"   ← incorrecto
```

El total ignora la moneda y le pega el símbolo de la primera línea. Con el TC de 1430 cargado en la línea de ARS, el total real es:

```
USD 500 + (ARS 715.000 / 1430) = USD 1.000
```

La causa está en `FileReceiptsTab.tsx` línea 156:
`const totalAmount = items.reduce((sum, it) => sum + it.amount, 0)` — suma todo sin convertir.
Y se persiste así en `file_receipts.amount`.

## Cómo se interpreta el TC (ya guardado en BD)

Cada línea (`file_receipt_items`) puede tener:
- `currency` — moneda en que el cliente pagó (ej. ARS).
- `service_currency` — moneda "real" del servicio (ej. USD).
- `exchange_rate` — TC con la convención **"1 service_currency = rate currency"** (ej. 1430 = 1 USD por 1430 ARS).

Conversión de una línea a la moneda principal del recibo:
- Si `line.currency == main` → `amount` tal cual.
- Si `line.service_currency == main` y hay TC → `amount / rate`.
- Si no hay forma de convertir → se muestra como subtotal aparte y se aclara que no entra en el total convertido.

## Cambios

### 1. Helper de conversión `src/lib/receiptTotals.ts` (nuevo)

Funciones puras que toman las líneas + moneda principal y devuelven:
- `subtotalsByCurrency: { [currency]: number }` — suma cruda por moneda.
- `convertedTotal: number` — total expresado en la moneda principal usando los TC de cada línea.
- `unconvertibleLines: ReceiptItem[]` — líneas sin TC para convertir (si las hay).

### 2. Detalle del recibo (`FileReceiptsTab.tsx` ~líneas 808-816)

Reemplazar el bloque "Total recibo" por:

```
Subtotales        USD 500,00
                  ARS 715.000,00 (≈ USD 500,00 · TC 1430)
─────────────────────────────────────
Total recibo      USD 1.000,00
```

Si todas las líneas ya están en la moneda principal, se muestra solo el total simple (comportamiento actual, no se rompe nada).

Si hay líneas sin TC y en moneda distinta, se muestra warning chico: "Línea en X sin TC — no se incluye en el total convertido".

### 3. Lista de recibos (cards en `FileReceiptsTab.tsx`)

El número grande de cada card pasa a usar el total convertido recalculado on-the-fly desde los items, no `receipt.amount` directo.

### 4. PDF del recibo (`receiptPdfUtils.ts` líneas 257 y 268)

- Reemplazar el "Total" por el mismo bloque (subtotales + total convertido).
- `numeroALetras(...)` se llama sobre el total convertido en la moneda principal.

### 5. Resumen financiero del expediente (`FileFinancialSummary.tsx`)

Verificar y, si corresponde, reemplazar usos de `receipt.amount` por el total recalculado para que el "cobrado" del expediente cuadre.

### 6. Recálculo automático de recibos existentes

Migración SQL one-shot que recalcula `file_receipts.amount` a partir de las líneas:
- Para cada recibo: `amount = sum( CASE WHEN item.currency = receipt.currency THEN item.amount WHEN item.service_currency = receipt.currency AND item.exchange_rate > 0 THEN item.amount / item.exchange_rate ELSE 0 END )`
- También ajusta `account_movements` derivados del recibo (uno por línea, ya están en su moneda original — no se tocan, solo se actualiza el `amount` del recibo cabecera).

Esto deja REC-0052 con `amount = 1000` y `currency = USD`.

### 7. Al crear/editar recibos nuevos

`handleSave` (línea 158) ya no guarda `totalAmount` crudo. Calcula `convertedTotal` con el helper y lo guarda en `file_receipts.amount`. La moneda principal sigue siendo `items[0].currency`.

## Fuera de alcance

- No se cambia el esquema de `file_receipt_items` ni la semántica del TC (sigue siendo "1 service = rate currency").
- No se toca el flujo de cuenta corriente: cada línea sigue generando un movimiento en su moneda original.
- No se agrega conversión cruzada entre líneas con monedas que no sean ni la principal ni el `service_currency` (caso raro, queda como "no convertible" con warning).
