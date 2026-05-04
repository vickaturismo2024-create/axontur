## Problema

Cuando un presupuesto aprobado se convierte en expediente (función `createFileFromQuote`), los vuelos del presupuesto se guardan **sólo como `file_services`** (registros administrativos). El **Calendario de vuelos**, el **Widget "Vuelos próximos (7 días)"** y la **campanita de alertas** leen exclusivamente de las tablas `reservations` + `flight_segments`, que se alimentan únicamente desde la importación de PNR/PDF.

Resultado: el expediente de Vasta tiene vuelos cargados en el presupuesto (GOL G37756 AEP→MCZ el 18/04/2026 y G37620 REC→AEP el 06/05/2026), pero **no aparecen en el calendario** porque nunca se creó una `reservation`.

## Solución

Al crear el expediente desde un presupuesto, si el presupuesto tiene vuelos cargados con fecha y horario, generar automáticamente:

1. **1 `reservation`** vinculada al expediente (`file_id` = nuevo expediente, `source_type` = `'quote'`, `locator` vacío para que se pueda completar después).
2. **N `flight_segments`** (uno por cada vuelo del presupuesto) con: aerolínea, número de vuelo, origen IATA (extraído entre paréntesis del campo, ej. "Buenos Aires (AEP)" → `AEP`), destino IATA, fecha+hora local de salida y llegada, clase de reserva (vacía).
3. **N `reservation_passengers`** copiados desde el presupuesto (nombre del cliente y acompañantes si existen en `quote.client` / `quote.trip.travelers`). Mínimo 1 pasajero con el nombre del cliente.

### Reglas

- **Sólo se crea la reserva si hay al menos 1 vuelo con `date` + `departureTime`.** Si los vuelos son sólo "opciones" (`isOption: true`), se ignoran (no se confirmaron).
- **Idempotencia**: si ya existe una `reservation` con el mismo `file_id` y `source_type='quote'`, **no se duplica** (se omite la creación). Esto cubre re-aperturas y la actualización en lote.
- **Origen/destino IATA**: extraer las 3 letras entre paréntesis del campo `origin`/`destination` (formato actual del wizard: "Buenos Aires (AEP)"). Si no hay paréntesis, usar las primeras 3 letras en mayúsculas como fallback.
- **Fecha local**: combinar `date` (YYYY-MM-DD) + `departureTime`/`arrivalTime` (HH:mm) → ISO local. Si `arrivalTime` trae sufijo `+1` (vuelo nocturno), sumar 1 día a la fecha de llegada.
- El campo `notes` del segmento queda vacío (no usamos `raw_text` porque no viene de un PNR).
- `is_incomplete = false`, `has_changes = false`, `segment_status = 'HK'` (confirmado por defecto).

### Backfill para expedientes existentes

Como el caso de Vasta y posibles otros ya tienen expediente sin reserva, agregar un **backfill one-shot**: al cargar el dashboard, si un expediente confirmado tiene `quote_id` con vuelos pero **ninguna `reservation` asociada**, ejecutar la creación. Alternativa simple: botón "Sincronizar vuelos al calendario" en la pestaña de Servicios del expediente, que dispara la misma función. **Recomendado**: hacer ambas cosas — backfill automático silencioso al abrir cada expediente, más botón manual visible.

## Cambios técnicos

### Archivos a modificar

1. **`src/lib/fileFromQuote.ts`** — después de insertar `files` y `file_services`, llamar nueva función `createReservationFromQuoteFlights(quote, fileId, userId)`:
   - Filtra vuelos válidos (con fecha + hora + no opcionales).
   - Si hay 0, sale.
   - Inserta `reservations` con `file_id`, `source_type: 'quote'`, `gds: null`, `locator: null`.
   - Inserta `flight_segments` (uno por vuelo, ordenados por fecha) con `seq` incremental.
   - Inserta `reservation_passengers` con el nombre del cliente.

2. **`src/lib/quoteFlightsToReservation.ts`** (nuevo) — utilidades:
   - `parseIataFromLocation(loc: string): string` (extrae `XXX` entre paréntesis).
   - `combineLocalDateTime(date, time): string | null` (maneja sufijo `+1`).
   - `syncQuoteFlightsToReservation(quote, fileId, userId)` (idempotente, chequea reserva existente antes de insertar).

3. **`src/pages/FileDetail.tsx`** (o `FileServicesTab.tsx`) — agregar botón "Sincronizar vuelos al calendario" visible cuando el expediente tiene `quote_id` y no tiene reserva asociada todavía. Al hacer clic, llama a la utilidad y muestra toast.

4. **`src/components/files/CreateFileFromQuote.tsx`** y **`src/components/quotes/QuoteCard.tsx`** — ya llaman a `createFileFromQuote`, no requieren cambios (el sync queda dentro).

### Sin cambios de schema

Las tablas `reservations`, `flight_segments`, `reservation_passengers` ya tienen las columnas necesarias y RLS apropiada (`owns_reservation` por `user_id`).

## Verificación

1. Para el expediente de Vasta: usar el botón "Sincronizar vuelos al calendario" → confirmar que aparecen los 2 vuelos GOL en el calendario de abril/mayo 2026 y en "Vuelos próximos" cuando estén dentro de 7 días.
2. Crear un presupuesto nuevo con 1 vuelo, aprobarlo y abrir expediente → la reserva se crea automáticamente y los segmentos aparecen en el calendario.
3. Volver a abrir el mismo expediente → no se duplica la reserva.
