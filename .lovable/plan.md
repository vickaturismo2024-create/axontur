

## Plan: revisión y arreglo del PDF público para clientes (especial mobile)

### Contexto
El link público (`/pdf/:id`) usa `PublicPDF.tsx` + el árbol `PDFPreview` con páginas A4 (`PDFCoverPage`, `PDFItineraryPages`, `PDFContactPages`, `PDFDetailsPages`, `PDFPageWrapper`). Hoy todo está pensado para **A4 fijo** (≈794px de ancho). En mobile (375–414px) eso se ve roto porque:

- Las páginas tienen `width: 794px` rígido → aparece scroll horizontal o todo escalado microscópico.
- Los grids internos (`grid-cols-2/3/4`) no colapsan en pantallas chicas.
- Tipografía calculada para impresión (texto chico) queda ilegible.
- Tablas (vuelos, cruceros, ocupación, precio) provocan overflow horizontal sin scroll dedicado.
- Imágenes de portada / itinerario quedan recortadas o sobredimensionadas.
- El header del link público (botón compartir, descargar PDF, aprobar) puede tapar contenido en mobile.

Hay una memoria previa (`mem://style/pdf-mobile-optimization`) que indica que existe `isMobile` con `window.innerWidth`, pero por las quejas actuales no se está aplicando consistentemente o se rompió en cambios posteriores.

### Objetivos
1. **Mobile-first sobre el público**: cuando se abre `/pdf/:id` en un teléfono, el contenido debe ser legible, fluido (sin scroll horizontal), con tipografía cómoda y tablas con scroll interno cuando hace falta.
2. **Mantener fidelidad A4 en desktop e impresión / descarga PDF** (no romper `html2canvas` + `jsPDF`).
3. **Validar end-to-end** que el link funciona: que `get-public-quote` responde, que la expiración se respeta, que el aprobado funciona y que los contadores de vista se incrementan.

### Cambios

**1. Contenedor responsive del público (`src/pages/PublicPDF.tsx`)**
- Detectar mobile con el hook `useIsMobile` (ya existe) en vez de cálculo manual, para tener un único punto de verdad.
- En mobile:
  - Quitar el `width: 794px` fijo del wrapper exterior; usar `width: 100%` + padding lateral mínimo.
  - Header sticky compacto (solo logo agencia + 2 botones icono: Descargar PDF / Compartir / Aprobar) que no tape contenido.
  - Botón "Aprobar presupuesto" full-width fijo abajo (CTA grande) en lugar de mezclado en el header.
- En desktop: comportamiento actual (página A4 centrada con sombra).

**2. Páginas PDF responsive (`PDFPageWrapper`, `PDFCoverPage`, `PDFItineraryPage`, `PDFDetailsPage`, `PDFContactPage`)**
- Pasar `isMobile` desde `PublicPDF` a `PDFPreview` y de ahí a cada página (ya hay un prop preparado en `PDFPageWrapper`).
- En mobile:
  - `width: 100%`, `min-height: auto`, padding interno reducido (12-16px).
  - Tipografía: `clamp(14px, 4vw, 18px)` para body, `clamp(20px, 6vw, 28px)` para títulos.
  - Grids `grid-cols-2/3/4` → `grid-cols-1` o `grid-cols-2` máximo.
  - Imágenes `object-fit: cover` con `max-height: 240px` (portada) y `max-height: 180px` (itinerario).
  - Tablas envueltas en `<div className="overflow-x-auto -mx-4 px-4">` para scroll interno controlado, no scroll de página.
- En desktop / impresión: tamaños actuales sin cambios.

**3. Secciones críticas con tablas (vuelos, crucero, ocupación, precio)**
- Aplicar el patrón "card en mobile / tabla en desktop":
  - Mobile: cada fila de la tabla se renderiza como card vertical con label/valor.
  - Desktop: tabla normal.
- Afecta a los componentes dentro de `PDFDetailsPages` (vuelos, alojamientos, precio, cruceros).

**4. Estilos globales del PDF público (`src/index.css`)**
- Agregar bloque `@media (max-width: 768px)` para `.pdf-page-mobile`:
  - Quitar `box-shadow` pesada, reducir `margin-bottom`.
  - `page-break-inside: auto` (en mobile no tiene sentido el corte A4).
- Mantener intacto `@media print` para que la descarga PDF siga siendo A4 fiel.

**5. Verificación end-to-end del flujo completo**
- Abrir un presupuesto enviado, generar el link público, abrirlo en:
  - Desktop 1280px → debe verse igual que hoy.
  - Mobile 390px → debe verse fluido, legible, sin scroll horizontal, con CTA aprobar accesible.
- Probar:
  - Aprobación digital (que sigue capturando nombre + IP + timestamp).
  - Botón "Descargar PDF" (que el PDF descargado siga siendo A4, no el layout mobile).
  - Botón "Compartir" (WhatsApp / copiar link).
  - Que `get-public-quote` no devuelva 410 si el link no expiró.
  - Que `quote_views` registre la visita.

### Archivos
````text
modificados:
  src/pages/PublicPDF.tsx                 (header mobile + CTA fijo + isMobile)
  src/components/pdf/PDFPreview.tsx       (propagar isMobile a hijos)
  src/components/pdf/PDFPageWrapper.tsx   (estilos mobile)
  src/components/pdf/PDFCoverPage.tsx     (imagen + tipografía responsive)
  src/components/pdf/PDFItineraryPage.tsx (cards en mobile)
  src/components/pdf/PDFDetailsPage.tsx   (tablas → cards en mobile)
  src/components/pdf/PDFContactPage.tsx   (grid contactos responsive)
  src/index.css                           (media queries .pdf-page-mobile)
````

### Consideraciones
- **No romper la descarga PDF**: `html2canvas` se ejecuta en un contenedor oculto que renderiza siempre con layout desktop A4 (no con el layout mobile). Voy a forzar `isMobile=false` solo en ese contenedor de captura.
- **Backwards-compat**: si una plantilla existente tiene customizaciones, los defaults siguen funcionando.
- **Sin cambios de schema ni de edge functions** — `get-public-quote` ya devuelve todo lo necesario.

