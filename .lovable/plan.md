

## Plan: Importación masiva de reservas desde Excel legado

### Estado del análisis del archivo
No pude inspeccionar `LISRESERVA3.xlsx` desde modo plan (las herramientas de copia a disco no están disponibles acá; el parser solo me devolvió el header `ID_RES`). En modo default voy a abrir el archivo con `pandas`/`openpyxl` y **detectar todas las columnas reales** antes de tocar el parser. Si el mapeo difiere de lo que asumo abajo, lo ajusto sin volver a preguntar.

### Mapeo asumido (a confirmar al abrir el archivo)
- `ID_RES` → `legacy_id` (agrupador, primera columna repetida = misma reserva)
- Columnas típicas esperadas: pasajero/nombre, DNI, fecha servicio, tipo servicio (vuelo/hotel/traslado), proveedor, descripción, importe, moneda, status. Si hay códigos de aerolínea/IATA → segmentos de vuelo; resto → notas/servicios.

### Cambios

**1. Migración SQL**
- `reservations`: agregar `legacy_id text` + índice parcial `(user_id, legacy_id) WHERE legacy_id IS NOT NULL`.
- `reservation_passengers`: agregar `client_id uuid` nullable (para guardar el match de CRM).

**2. Parser nuevo** — `src/lib/reservationExcelParser.ts`
- Lee `.xlsx` con `xlsx` (ya en deps).
- Normaliza headers (lower, sin acentos).
- Agrupa filas por `ID_RES`.
- Por grupo arma: `{ legacyId, passengers[], segments[], extraServices[], rawRows[] }`.
- Detecta vuelos por presencia de campos tipo flight number / IATA; el resto va a `notes` concatenado.

**3. Hook nuevo** en `src/hooks/useFlightReservations.ts`
- `useBulkImportReservations`: para cada grupo, busca por `(user_id, legacy_id)`. Si existe → mergea segmentos faltantes (clave `airline+flight+origin+destination`). Si no → crea reserva + pasajeros + segmentos.
- Match de cliente: por DNI exacto, fallback por `name` normalizado contra `clients`. Guarda `client_id` en `reservation_passengers`.
- Inserts en lotes de 50 con `Progress`.

**4. UI nueva** — `src/components/reservations/ImportReservationsExcelDialog.tsx`
- Upload + preview en accordion (1 reserva = 1 acordeón con sus filas).
- Badges: "Nuevo", "Duplicado → Merge", "Cliente vinculado: X".
- Botón "Importar N reservas" con barra de progreso y resumen final (creadas / mergeadas / pasajeros vinculados).

**5. Botón** en `src/pages/Reservations.tsx`
- "Importar Excel" al lado del actual "Importar reserva" (PNR).

**6. Tipos** — `src/types/reservation.ts`
- `legacy_id?: string | null` en `Reservation`.
- `client_id?: string | null` en `ReservationPassenger`.

### Archivos afectados
| Archivo | Tipo |
|---|---|
| Migración SQL | Nuevo |
| `src/lib/reservationExcelParser.ts` | Nuevo |
| `src/components/reservations/ImportReservationsExcelDialog.tsx` | Nuevo |
| `src/hooks/useFlightReservations.ts` | Edita |
| `src/pages/Reservations.tsx` | Edita |
| `src/types/reservation.ts` | Edita |

### Primer paso al aprobar
Abrir `LISRESERVA3.xlsx` con pandas, listar columnas y 5 filas de ejemplo, y ajustar el parser al mapeo real antes de seguir.

