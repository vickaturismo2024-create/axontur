

# Plan: Personalización avanzada de plantillas con vista previa en vivo

## Resumen

Transformar el editor de plantillas en un layout de pantalla completa con panel de controles (izquierda) y vista previa en vivo (derecha). Agregar muchas más opciones de personalización manteniendo todas las existentes. Las plantillas actuales no se modifican: todos los campos nuevos son opcionales con defaults que replican el diseño actual.

## Todas las opciones de personalización

### Ya existentes (se mantienen tal cual)
- Nombre, agencia, logo
- Colores: primario, secundario, acento, fondo, fondo cards
- Tipografías: títulos y cuerpo (input de texto libre)
- Estilo de cards: tipo, radio bordes, sombra
- Bordes decorativos: estilo y grosor
- Separadores: line, dots, gradient, decorative, none
- Patrón de fondo: dots, lines, grid, waves, none
- Secciones visibles (toggles)
- Agentes WhatsApp
- Footer text

### Nuevas opciones propuestas anteriormente (se mantienen)

1. **Selector visual de tipografías** — Reemplazar inputs de texto por `<select>` con Google Fonts y preview en su propia fuente
   - Títulos: Playfair Display, Merriweather, Lora, Cormorant Garamond, Libre Baskerville, Montserrat, Raleway, DM Serif Display, Poppins, Oswald
   - Cuerpo: Inter, Open Sans, Roboto, Lato, Source Sans 3, Nunito, Work Sans, Karla, PT Sans, Mulish

2. **Layout de portada** (`styles.coverLayout`): `classic` | `split` | `fullOverlay` | `minimal`

3. **Estilo de encabezados** (`styles.headingStyle`): `underline` | `background` | `accent-left` | `pill`

4. **Estilo de iconos** (`styles.iconStyle`): `filled` | `outlined` | `none`

5. **Densidad de contenido** (`styles.contentDensity`): `compact` | `normal` | `spacious`

6. **Color de texto** (`colors.text`): nuevo color picker

### Nuevas opciones adicionales

7. **Estilo del overlay de portada** (`styles.coverOverlay`): `gradient` (actual) | `solid` | `blur` | `vignette` | `none`
   - `gradient`: degradado vertical actual
   - `solid`: color primario sólido semitransparente
   - `blur`: backdrop-blur con overlay suave
   - `vignette`: bordes oscuros con centro claro
   - `none`: sin overlay, imagen pura

8. **Posición del logo** (`styles.logoPosition`): `top-right` (actual) | `top-left` | `top-center` | `bottom-center`

9. **Tamaño del logo** (`styles.logoSize`): `small` (60px) | `medium` (100px, actual) | `large` (150px)

10. **Estilo de tablas/listas** (`styles.tableStyle`): `striped` (filas alternas con color) | `clean` (actual, sin fondo alterno) | `bordered` (bordes visibles en cada celda) | `minimal` (sin bordes, solo separadores finos)

11. **Formato de fechas** (`styles.dateFormat`): `long` ("3 de Marzo, 2026", actual) | `short` ("03/03/2026") | `medium` ("3 Mar 2026")

12. **Estilo del footer/pie de página** (`styles.footerStyle`): `simple` (actual) | `banner` (fondo de color primario con texto blanco) | `centered` (centrado con separador decorativo) | `minimal` (solo texto pequeño)

13. **Efecto de hover en cards** (`styles.cardHoverEffect`): `none` | `lift` | `glow` | `border-accent` — solo aplica en la vista web (PublicPDF), no en print

14. **Opacidad del overlay de portada** (`styles.coverOverlayOpacity`): slider de 0 a 100 (default 70)

15. **Alineación de texto en portada** (`styles.coverTextAlign`): `center` (actual) | `left` | `right`

16. **Mostrar/ocultar fecha de armado** (`styles.showCreationDate`): boolean, default true

17. **Texto personalizado de "Preparado para"** (`styles.preparedForLabel`): input de texto, default "Preparado para"

## Vista previa en vivo

Crear `src/components/templates/TemplatePreviewPanel.tsx`:
- Recibe el `editingTemplate` y renderiza una miniatura con datos mock
- Se actualiza en tiempo real con cada cambio
- Muestra 3 secciones mini:
  1. **Portada**: con layout, overlay, logo, tipografía y colores aplicados
  2. **Sección de detalle**: encabezado con el estilo seleccionado, una card de ejemplo con estilo de card/borde/sombra, tabla con el estilo seleccionado, iconos con el estilo elegido
  3. **Footer**: con el estilo de pie de página

Datos mock: destino "Cancún", cliente "María García", 2 pasajeros, fecha "15 Mar - 22 Mar 2026"

## Cambios por archivo

### `index.html`
- Agregar Google Fonts link con todas las fuentes

### `src/types/quote.ts` — Interface Template
- Agregar a `styles`: `coverLayout`, `headingStyle`, `iconStyle`, `contentDensity`, `coverOverlay`, `logoPosition`, `logoSize`, `tableStyle`, `dateFormat`, `footerStyle`, `cardHoverEffect`, `coverOverlayOpacity`, `coverTextAlign`, `showCreationDate`, `preparedForLabel` (todos opcionales)
- Agregar a `colors`: `text` (opcional)

### `src/pages/Templates.tsx`
- Cambiar el Dialog de `max-w-2xl` a `max-w-7xl` con layout de 2 columnas: controles scrolleables (izq, ~55%) + preview fijo (der, ~45%)
- Reemplazar inputs de fuentes por selects visuales
- Agregar todas las nuevas secciones de personalización organizadas en acordeones/tabs:
  - Portada (layout, overlay, opacidad, alineación texto, posición logo, tamaño logo, fecha, etiqueta "preparado para")
  - Tipografía (fuente títulos, fuente cuerpo, color texto)
  - Cards y contenido (estilo card, bordes, sombra, radio, densidad, estilo tablas, hover)
  - Encabezados e iconos (estilo encabezados, estilo iconos)
  - Separadores y fondo (separador, patrón fondo)
  - Footer (estilo footer, texto)
- Integrar `TemplatePreviewPanel` en la columna derecha

### `src/components/templates/TemplatePreviewPanel.tsx` (nuevo)
- Renderiza miniatura con datos mock aplicando todos los estilos del template en tiempo real

### Archivos PDF (cambios condicionales, solo si hay nuevos estilos)
- `PDFCoverPage.tsx`: leer coverLayout, coverOverlay, coverOverlayOpacity, coverTextAlign, logoPosition, logoSize, showCreationDate, preparedForLabel
- `PDFPageWrapper.tsx`: leer headingStyle, contentDensity
- `PDFDetailsPages.tsx`: leer iconStyle, tableStyle, dateFormat
- `PDFContactPages.tsx`: leer footerStyle

Todos con defaults que replican el comportamiento actual exacto.

### Sin migración de base de datos
Los nuevos campos viven dentro del JSON existente de templates.

