

## Plan: arreglar build + import de itinerario de crucero por copy/paste

### 1. Fix de build (CSS)
El error de build viene de `src/index.css`: el `@import` de Google Fonts está **después** de los `@tailwind`, y la spec CSS exige que `@import` vaya antes de cualquier otra regla. El pipeline de Lovable falla por eso.

**Cambio:** mover la línea 5 (`@import url('https://fonts.googleapis.com/...')`) arriba de todo, antes de `@tailwind base`. 1 sola edición.

### 2. Importar itinerario de crucero pegando texto
En `CruiseStep.tsx`, agregar un botón **"Pegar itinerario"** al lado del título "Itinerario del crucero" que abre un Dialog con un Textarea. Al pegar el texto del formato que pasaste y darle "Procesar", parsea localmente (sin IA, sin costo) y llena `quote.cruise.itinerary` con un array de `CruisePort`.

**Parser** (en `src/lib/cruiseItineraryParser.ts`, nuevo archivo): regex tolerante al formato sin separadores que mostraste. Para cada renglón detecta:
- Día de la semana (3 letras: `Lun|Mar|Mie|Jue|Vie|Sab|Dom`, con o sin tilde) — sólo como ancla.
- Fecha `dd/mm/yyyy` justo después del día.
- Puerto + país hasta el siguiente bloque `HH:MM` o `-`.
- Arribo (`HH:MM` o `-`).
- Partida (`HH:MM` o `-`).

Casos especiales:
- "Navegación" → puerto = "Navegación", país = "", horas vacías.
- Guión `-` → hora vacía (embarque/desembarque).
- Si la línea trae más de 1 puerto pegado (como en tu ejemplo, todo viene en 1 sola línea), divide por la regex de día de semana y procesa cada bloque por separado.

Devuelve `CruisePort[]` con `day` autoincrementado desde 1, `port`, `country`, `arrivalTime`, `departureTime`, `notes: ''`, `id` nuevo.

**Vista previa antes de aplicar:** dentro del Dialog, después de procesar, mostrar una tablita con `Día | Fecha | Puerto | País | Llegada | Salida` para que el usuario confirme antes de pisar el itinerario actual. Botones: "Reemplazar" (pisa lo existente) y "Agregar al final" (concatena).

**Bonus pequeño:** además del itinerario, si la primera línea contiene "Crucero N : NOMBRE", se sugiere también poner ese nombre como `notes` o lo dejamos sólo informativo arriba. (Lo más prolijo: lo mostramos en la preview pero NO sobreescribimos campos del barco; el usuario ya los carga arriba.)

### 3. Si el formato no parsea
Si el regex no detecta nada (formato distinto), fallback opcional a la edge function `parse-pdf` reusando el mismo flujo pero con un nuevo `extract_cruise_itinerary` tool. Para no agrandar scope, **arrancamos sólo con el parser local** (que cubre tu formato exactamente) y dejamos el fallback IA como mejora futura si hace falta.

### Archivos afectados
````text
modificados:
  src/index.css                              (mover @import arriba — fix build)
  src/components/quotes/steps/CruiseStep.tsx (botón "Pegar itinerario" + Dialog)

nuevos:
  src/lib/cruiseItineraryParser.ts           (parser regex local)
  src/components/quotes/CruiseItineraryPasteDialog.tsx (UI del paste + preview)
````

### Verificación
- El build vuelve a pasar.
- Pegando exactamente el texto de tu mensaje, se generan 10 puertos: Buenos Aires, Navegación, Navegación, Río de Janeiro, Buzios, Ilhabela, Camboriu, Navegación, Punta Del Este, Buenos Aires — con sus fechas, llegadas y salidas correctas (incluyendo `-` donde corresponda).
- El itinerario aparece directamente en las cards de la sección crucero, listo para editar manualmente cualquier ajuste.

