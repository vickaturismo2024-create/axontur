# Plan: Generación automática de itinerario con IA + visibilidad correcta

## Resumen

Agregar un botón "Generar con IA" en el paso de itinerario del QuoteWizard que analiza vuelos, alojamientos, transfers y actividades para crear automáticamente los días del itinerario. Además, agregar un toggle de visibilidad del itinerario tanto en el paso de itinerario (step 10) como en la vista previa (step 11), y asegurar que ese toggle se respete correctamente en todos los renders del PDF.

## Cambios por archivo

### 1. `supabase/functions/generate-itinerary/index.ts` (nuevo)

Edge function que recibe los datos del presupuesto y usa Lovable AI (gemini-3-flash-preview) con tool calling para generar un array estructurado de `ItineraryDay`:
- Recibe: `{ trip, flights, lodgings, transfers, activities, trains, ferries, cruise }`
- System prompt en español que instruye al modelo a crear días con `dayNumber`, `date`, `title`, `description`, `activities[]` basándose en fechas reales y servicios cargados
- Tool calling para obtener salida JSON estructurada
- Manejo de errores 429/402

### 2. `src/components/quotes/QuoteWizard.tsx`

**Step 10 (Itinerario):**
- Agregar botón "✨ Generar itinerario con IA" arriba de la lista de días
- Loading state mientras genera
- Confirmación si ya hay días cargados antes de reemplazar
- Toggle switch "Mostrar itinerario en el PDF" que modifica `currentTemplate.sectionsToggles.itinerary` localmente

**Step 11 (Vista Previa):**
- Agregar el mismo toggle switch "Mostrar itinerario en el PDF" arriba del preview
- Pasar el template modificado (con el toggle actualizado) al `PDFPreview`

**Estado local:**
- Nuevo state `itineraryVisible` (inicializado desde `currentTemplate.sectionsToggles.itinerary`)
- Crear un `previewTemplate` derivado que aplica el override de visibilidad del itinerario
- Usar `previewTemplate` en lugar de `currentTemplate` en ambos renders de `PDFPreview` (step 11 y panel lateral)

### 3. `src/components/pdf/PDFPreview.tsx`

Ya verifica `template.sectionsToggles.itinerary` en línea 30. No requiere cambios — el toggle del QuoteWizard modifica el template que se le pasa, por lo que la visibilidad se aplica automáticamente.

### 4. `src/components/pdf/PDFItineraryPages.tsx`

Ya verifica `template.sectionsToggles.itinerary` internamente. No requiere cambios.

### 5. `src/pages/ExportPDF.tsx` y `src/pages/PublicPDF.tsx`

Ya renderizan `PDFItineraryPages` y ya pasan el template con `sectionsToggles` desde la base de datos. No requieren cambios — la visibilidad se respeta porque el toggle se guarda como parte del template.

**Nota**: El toggle en el QuoteWizard es local a la sesión de edición. Para que persista, el usuario debe guardarlo desde la configuración de plantillas. Esto es intencional: permite previsualizar con/sin itinerario sin alterar la plantilla permanentemente.

### Sin migración de base de datos

Los `itineraryDays` ya se guardan en la columna existente. No hay cambios de schema.

## Flujo del usuario

1. Carga vuelos, hoteles, transfers, actividades normalmente
2. En el paso "Itinerario": clic en "Generar con IA" → la IA lee las fechas y servicios y genera los días
3. Revisa, edita, agrega días extra manualmente
4. Usa el toggle para decidir si el itinerario aparece en el PDF
5. En vista previa, puede alternar la visibilidad con el mismo toggle
6. Al guardar, los días del itinerario se persisten; la visibilidad depende de la plantilla seleccionada
