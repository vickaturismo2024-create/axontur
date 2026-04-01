

# Plan: Generación automática de itinerario con IA + visibilidad correcta en preview y PDF

## Resumen

Agregar un botón "Generar con IA" en el paso de itinerario del QuoteWizard que analiza los servicios cargados (vuelos, hoteles, transfers, actividades) para crear automáticamente los días del itinerario. Además, agregar un toggle de visibilidad del itinerario en el paso de itinerario y en la vista previa, asegurando que se respete en todos los renders del PDF.

## Cambios por archivo

### 1. `supabase/functions/generate-itinerary/index.ts` (nuevo)

Edge function que usa Lovable AI (gemini-3-flash-preview) con tool calling:
- Recibe: `{ trip, flights, lodgings, transfers, activities, trains, ferries, cruise }`
- System prompt en español que genera días con `dayNumber`, `date`, `title`, `description`, `activities[]` basándose en fechas y servicios reales
- Tool calling para salida JSON estructurada (array de ItineraryDay)
- Manejo de errores 429/402 con mensajes claros

### 2. `src/components/quotes/QuoteWizard.tsx`

**Step 10 (Itinerario):**
- Botón "✨ Generar itinerario con IA" arriba de la lista de días
- Loading state durante la generación
- Confirmación antes de reemplazar si ya hay días cargados
- Toggle switch "Mostrar itinerario en el PDF"

**Step 11 (Vista Previa):**
- Mismo toggle switch "Mostrar itinerario en el PDF" arriba del preview

**Estado local:**
- Nuevo state `itineraryVisible` (inicializado desde `currentTemplate.sectionsToggles.itinerary`)
- Crear `previewTemplate` derivado que aplica el override de visibilidad
- Usar `previewTemplate` en los dos `PDFPreview` (step 11 y panel lateral)

### 3. Archivos que NO cambian

- **`PDFPreview.tsx`**: Ya verifica `template.sectionsToggles.itinerary` en línea 30. El toggle del QuoteWizard modifica el template que se pasa como prop → funciona automáticamente.
- **`PDFItineraryPages.tsx`**: Ya verifica `template.sectionsToggles.itinerary` internamente → funciona automáticamente.
- **`ExportPDF.tsx` y `PublicPDF.tsx`**: Ya renderizan con el template de la base de datos que incluye `sectionsToggles` → funciona automáticamente.

### Sin migración de base de datos

Los `itineraryDays` usan la columna JSON existente. El toggle de visibilidad es parte del JSON del template.

## Flujo del usuario

1. Carga vuelos, hoteles, transfers, actividades normalmente
2. En "Itinerario" → clic en "Generar con IA" → la IA mapea servicios a días
3. Revisa, edita, agrega días extra
4. Usa el toggle para mostrar/ocultar el itinerario en la vista previa y PDF
5. El toggle es local a la sesión; la visibilidad permanente se configura en la plantilla

