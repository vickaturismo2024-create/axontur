
# Revisión y arreglo del sistema de plantillas

## Diagnóstico

El editor de Plantillas expone muchas opciones que **el PDF real no consume**. El preview del editor (`TemplatePreviewPanel`) sí las implementa, por eso "se ve" el cambio ahí pero no se refleja en el PDF generado / versión guardada. Hay además código muerto y campos de texto del PDF hardcodeados que no se pueden personalizar.

## Cambios

### 1. Conectar al PDF las opciones huérfanas

Aplicar en `PDFCoverPage`, `PDFDetailsPages`, `PDFContactPages`, `PDFItineraryPages` y `PDFPageWrapper`:

- **`styles.borderRadius`**: reemplazar los `6px / 8px / 10px` hardcodeados por el valor de la plantilla (con fallback).
- **`styles.cardStyle`** (flat / elevated / outlined / glass): aplicar a las "tarjetas" de sección (Vuelos, Alojamiento, etc.).
- **`styles.iconStyle`** (filled / outlined / none): respetar en los íconos de las secciones.
- **`styles.tableStyle`** (striped / clean / bordered / minimal): aplicar a la tabla de vuelos y otras tablas (cabotaje del crucero, etc.).
- **`styles.footerStyle`** (simple / banner / centered / minimal) + **`footerText`**: renderizarlo en `PDFContactPages` (hoy se guarda pero no se muestra).
- **`colors.text`** y **`colors.background` / `colors.cardBackground`**: dejar de hardcodear `#fff` donde corresponda; respetar `text` para el cuerpo.
- **`styles.separatorStyle`** y **`styles.borderStyle` / `borderWidth`**: aplicar a los separadores entre secciones.

### 2. Quitar opciones que no aportan valor

Eliminar del editor y del tipo `Template` (con migración suave):
- `cardHoverEffect` (irrelevante en PDF).
- `backgroundPattern` (degrada legibilidad, no se usa).

### 3. Sumar toggles de secciones faltantes

Agregar al editor (sección "Secciones") switches para:
`trains`, `ferries`, `rentalCars`, `activities`, `cruise`.
Defaults en `true` para retro-compat.

### 4. Textos editables desde la plantilla

Agregar al tipo `Template.styles` un objeto `labels` (opcional, con defaults) que controla las etiquetas fijas del PDF:

```
labels: {
  coverEyebrow: 'PRESUPUESTO DE VIAJE',
  from: 'Desde',
  to: 'Hasta',
  travelers: 'Pasajeros',
  detailsTitle: 'Detalles del Viaje',
  flights: 'Vuelos',
  lodging: 'Alojamiento',
  lodgings: 'Alojamientos',
  insurance: 'Asistencia',
  transfers: 'Traslados',
  trains: 'Trenes',
  ferries: 'Ferries',
  rentalCars: 'Autos',
  activities: 'Actividades',
  cruise: 'Crucero',
  itinerary: 'Itinerario',
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  regime: 'Régimen',
  room: 'Habitación',
  nights: 'Noches',
  pricing: 'Valor del Viaje',
  perPerson: 'por persona',
}
```

Nueva sección **"Textos del PDF"** en el editor con inputs para cada label (acordeón colapsado por defecto para no abrumar). Helper `t(template, 'flights')` que devuelve el label custom o el default.

### 5. Footer real

- Mostrar `footerText` en `PDFContactPages` con el `footerStyle` elegido.
- Variantes: `simple` (línea sola), `banner` (banda con color primary), `centered` (centrado con separador), `minimal` (texto chico gris).

### 6. Sincronizar preview con el PDF real

`TemplatePreviewPanel` y los componentes PDF comparten muchísima lógica duplicada. Extraer helpers compartidos en `src/lib/templateStyles.ts`:
`getCardStyle()`, `getTableRowStyle()`, `getHeadingStyle()`, `getIconRender()`, `getOverlayStyle()`, `getFooterStyle()`, `t(template, key)`.

Tanto el preview como los PDFs reales consumen esos helpers → lo que ves en el editor es exactamente lo que sale en el PDF.

### 7. Limpieza de código muerto

- Borrar `src/components/pdf/PDFDetailsPage.tsx` (no se importa en ningún lado relevante; el activo es `PDFDetailsPages.tsx`).
- Verificar y borrar otros `*Page.tsx` singulares si están huérfanos (`PDFContactPage.tsx`, `PDFItineraryPage.tsx`).

### 8. Backwards-compat

Todos los nuevos campos (`labels`, toggles nuevos, etc.) son **opcionales** con defaults. Plantillas existentes en DB siguen funcionando sin migración SQL. La plantilla se guarda como JSON en la columna existente.

## Archivos a tocar (estimado)

- `src/types/quote.ts` — extender `Template.styles` con `labels` y toggles faltantes; quitar `cardHoverEffect`/`backgroundPattern`.
- `src/pages/Templates.tsx` — secciones nuevas (Textos del PDF, toggles ampliados), remover controles de opciones eliminadas.
- `src/components/templates/TemplatePreviewPanel.tsx` — consumir helpers compartidos.
- `src/lib/templateStyles.ts` — nuevo, helpers compartidos + `t()`.
- `src/components/pdf/PDFCoverPage.tsx`, `PDFDetailsPages.tsx`, `PDFContactPages.tsx`, `PDFItineraryPages.tsx`, `PDFPageWrapper.tsx` — usar helpers, respetar opciones, renderizar labels custom y footer.
- Borrar: `src/components/pdf/PDFDetailsPage.tsx` (+ singulares huérfanos si aplica).

## Qué NO toco

- Datos del presupuesto (no se altera ningún cálculo, precio, ni dato del cliente).
- Esquema de la base (los nuevos campos viven dentro del JSON existente de plantillas).
- Lógica de envío de mail, edge functions, módulos de Expedientes / CRM / Reservas.
