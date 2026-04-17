

## Plan: Renombrar "Reservas" → "Vuelos", import PDF y mostrar vuelos en el calendario

### 1. Renombrar "Reservas" a "Vuelos"
Cambios solo de UI/copy, no toco rutas (`/reservations` queda igual para no romper enlaces existentes ni la base):

- **`src/components/layout/Header.tsx`** (línea 28): `'Reservas'` → `'Vuelos'`.
- **`src/pages/Reservations.tsx`**: título `"Reservas de Vuelo"` → `"Vuelos"`, subtítulo, mensajes vacíos ("No hay reservas cargadas" → "No hay vuelos cargados"), botón "Importar Reserva" → "Importar Vuelo", y el alert de eliminación.
- **`src/pages/ReservationImport.tsx`** y **`src/pages/ReservationDetail.tsx`**: cambiar copy visible (títulos, toasts) de "reserva" → "vuelo" / "importar vuelo".

### 2. Import de PDF (en Vuelos y en Presupuestos)
Replico la lógica de `vuelosvicka` (PDF.js + Edge Function con Gemini para extracción estructurada).

**Backend (nuevo edge function):**
- `supabase/functions/parse-pdf/index.ts`: idéntico al de vuelosvicka. Recibe FormData con un PDF, valida header `%PDF-`, manda el PDF en base64 al gateway de Lovable AI (`google/gemini-2.5-flash`) con tool calling `extract_flight_data` y devuelve `{ locator, passengers[], flights[], text }`. Usa `LOVABLE_API_KEY` ya configurada.
- `supabase/config.toml`: registrar la función con `verify_jwt = true` (estándar).

**Dependencia:**
- Agregar `pdfjs-dist@^3.11.174` al `package.json` para extracción client-side rápida (con fallback a IA).

**UI – Sección Vuelos (`/reservations/import`):**
- Convertir el form actual en `Tabs` con dos pestañas: **"Pegar texto"** (lo que ya hay) y **"Subir PDF"** (nuevo). En "Subir PDF":
  - Input file `accept="application/pdf"`, máximo 10MB.
  - Procesa con `pdfjs-dist` para texto → llama `parse-pdf` → puebla `locator`, `passengers`, `segments` reusando el mismo `renderPreview` y `handleCreate` que ya existen.
  - Loader con `ocrProgress` ("Extrayendo texto…", "Analizando con IA…").

**UI – Presupuestos (editor de vuelos):**
- Crear `src/components/quotes/PDFParserDialog.tsx` (gemelo de `PNRParserDialog`): botón "Importar PDF", input file, llama `parse-pdf`, mapea los `flights` extraídos al tipo `Flight` del presupuesto (airline, flightNumber, origin, destination, date YYYY-MM-DD, departureTime HH:mm, arrivalTime HH:mm) y los empuja vía `onFlightsParsed`.
- En `src/components/quotes/steps/FlightsStep.tsx` agregar el nuevo botón al lado del `PNRParserDialog` existente, reutilizando `handleFlightsParsed`.

### 3. Vuelos en el Calendario
Modificar `src/pages/Calendar.tsx` para que además de presupuestos aprobados, muestre los segmentos de vuelo (`flight_segments`) sobre la fecha de `dep_datetime_local`.

- Nuevo `useQuery` (`['calendar-flight-segments', monthStart, monthEnd]`) que trae segmentos del usuario en el rango del mes (vía join `reservations.user_id = auth.uid()` que ya respeta RLS) usando `dep_datetime_local`.
- Por cada día se listan también los vuelos como botones tipo chip: `AR1234 EZE→MIA` con color distintivo (azul de aviación) y, al hacer click, navega a `/reservations/{reservation_id}`.
- Si el segmento tiene `has_changes`, se pinta en rojo y muestra ícono de alerta.
- Leyenda inferior con conteo: "X viajes · Y vuelos este mes".

### Archivos afectados
````text
modificados:
  src/components/layout/Header.tsx          (label nav)
  src/pages/Reservations.tsx                (copy)
  src/pages/ReservationImport.tsx           (copy + Tabs PDF)
  src/pages/ReservationDetail.tsx           (copy)
  src/pages/Calendar.tsx                    (vuelos del mes)
  src/components/quotes/steps/FlightsStep.tsx (botón nuevo)
  package.json                              (pdfjs-dist)
  supabase/config.toml                      (parse-pdf)

nuevos:
  supabase/functions/parse-pdf/index.ts
  src/components/quotes/PDFParserDialog.tsx
````

### Notas técnicas
- No cambio rutas (`/reservations`) ni nombres de tabla (`reservations`, `flight_segments`) para no romper la migración recién hecha de los 70 PNRs ni los enlaces guardados.
- La función `parse-pdf` usa `LOVABLE_API_KEY` (ya existe) y modelo gratuito hasta 13/oct: sin costo extra para el usuario.
- En el calendario respeto RLS: la query de segmentos se filtra por las reservas del user vía la relación ya existente (`reservations.user_id`).

