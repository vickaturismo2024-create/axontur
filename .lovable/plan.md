

# Fix: PDF público cortado en móviles

## Diagnóstico

El problema persiste por varias razones que el cambio anterior no cubrió:

1. **La portada (cover page)** usa `overflow-hidden` en el `.pdf-page` y posicionamiento `absolute inset-0` para la imagen de fondo. Con `min-height: auto` en móvil, la imagen de fondo absoluta no tiene altura de referencia y el contenido puede colapsarse o cortarse.

2. **El `.pdf-page` base** sigue teniendo `overflow: hidden` implícito vía el CSS de la portada (`overflow-hidden` en el className). No hay un override explícito para móvil.

3. **Tablas e inline styles** en `PDFDetailsPages` (1600+ líneas) usan anchos fijos en píxeles que pueden desbordar el contenedor móvil, causando corte horizontal.

4. **La portada necesita una altura mínima** en móvil para que el layout flex funcione correctamente (el fondo con posición absoluta necesita un contenedor con altura definida).

## Cambios

### `src/index.css`
- Agregar `overflow: visible !important` a `.pdf-mobile-view .pdf-page` para que nada se corte
- Agregar regla para la portada: `.pdf-mobile-view .pdf-page:first-child` con `min-height: 85vh` para que la cover tenga altura suficiente
- Agregar `overflow-x: hidden` y `word-break: break-word` para evitar desborde horizontal por texto largo
- Asegurar que tablas en móvil usen `display: block` + `overflow-x: auto` para scroll horizontal si son muy anchas

### `src/components/pdf/PDFCoverPage.tsx`
- Agregar clase condicional o estilo para que en móvil la imagen de fondo use `position: relative` en vez de `absolute`, o bien darle al contenedor un `min-height` que funcione en mobile
- Simplificar: agregar un `min-h-[80vh]` al `.pdf-page` de la portada para que siempre tenga altura suficiente en cualquier dispositivo

### `src/pages/PublicPDF.tsx`
- Mover `contentRef` al wrapper del contenido móvil también, para que el observer funcione en ambos modos
- Agregar `overflow-x-hidden` al contenedor raíz móvil (ya está, verificar)

## Resultado

En móvil: las páginas se ven completas sin cortes, con scroll vertical natural. La portada mantiene su aspecto visual con imagen de fondo. Las tablas anchas permiten scroll horizontal. En desktop/print: sin cambios.

