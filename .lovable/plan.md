

# Plan: Mejorar generación de expedientes + eliminar expedientes

## Problema

1. `createFileFromQuote` no mapea todos los tipos de servicio (faltan trenes, ferrys, autos de alquiler)
2. Los precios de alojamiento no contemplan modo "total" (`pricingMode: 'total'`) ni ocupaciones
3. No hay opción de eliminar expedientes

## Cambios

### 1. `src/lib/fileFromQuote.ts` — Mapeo completo de servicios

Agregar mapeo para todos los tipos de servicio faltantes:

- **Trenes** (`quote.trains`): tipo `train`, descripción con company + trainNumber + origin-destination
- **Ferrys** (`quote.ferries`): tipo `ferry`, descripción con company + vessel + origin-destination
- **Autos de alquiler** (`quote.rentalCars`): tipo `rental_car`, descripción con company + carType + pickup-dropoff
- **Alojamiento**: corregir cálculo de precio/costo para soportar `pricingMode: 'total'` (usar `totalCost`/`totalPrice` cuando aplique) y ocupaciones (`useOccupancies` con `occupancies[]`)
- **Actividades/Transfers/Insurance/Cruise**: verificar que el `supplier` se mapee correctamente con `supplier_name`
- Usar la moneda individual de cada servicio si existiera, o fallback a `quote.trip.currency`

### 2. `src/pages/FileDetail.tsx` — Botón eliminar expediente

- Agregar botón "Eliminar" con ícono Trash2 en el header del expediente
- Confirmar con AlertDialog antes de eliminar
- Al confirmar: eliminar servicios, pasajeros, recibos, receipt_items, supplier_payments y finalmente el file
- Redirigir a `/files` tras eliminar

### 3. `src/pages/Files.tsx` — Eliminar desde listado (opcional)

- Agregar opción de eliminar desde la tarjeta del listado con la misma lógica de confirmación

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/lib/fileFromQuote.ts` | Mapeo completo: trenes, ferrys, rental cars, fix precios alojamiento |
| `src/pages/FileDetail.tsx` | Botón eliminar con AlertDialog + cascade delete |

No requiere cambios de BD — las tablas ya permiten DELETE con RLS.

