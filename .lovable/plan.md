

# Plan: Conversión de moneda en recibos dentro del expediente

## Problema

Cuando se registra un pago en ARS para un servicio en USD con cotización, el resumen financiero del expediente muestra el cobro en ARS en lugar de convertirlo a USD. La cuenta corriente correctamente refleja ARS (moneda real), pero el expediente debe mostrar el equivalente en la moneda del servicio.

## Cambio

### `src/components/files/FileFinancialSummary.tsx`

Modificar la sección de agregación de receipt items (líneas 55-61) para que, cuando un item tenga `service_currency` y `exchange_rate`, se convierta el monto a la moneda del servicio:

- Traer los campos `service_currency` y `exchange_rate` además de `amount` y `currency` en el SELECT
- Si `service_currency` existe y `exchange_rate > 0`: agregar `amount / exchange_rate` en la moneda `service_currency`
- Si no hay conversión: mantener el comportamiento actual (sumar en la moneda de pago)

Esto hace que un pago de ARS 1.200.000 con cotización 1200 se refleje como USD 1.000 cobrados en el resumen del expediente.

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/files/FileFinancialSummary.tsx` | Convertir montos de receipt items a moneda de servicio cuando hay exchange_rate |

No requiere cambios de BD — los campos `service_currency` y `exchange_rate` ya existen en `file_receipt_items`.

