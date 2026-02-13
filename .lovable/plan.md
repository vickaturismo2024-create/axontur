

# Corregir visualización del PDF público en móvil

## Problema

La clase `.pdf-page` tiene un ancho fijo de `210mm` (aprox. 794px), que en pantallas de teléfono (360-414px) o tablet (768-834px) se desborda horizontalmente, cortando el contenido a la derecha.

La vista de previa interna (`PDFPreview.tsx`) ya resuelve esto usando `scale-[0.6]` con `transform-origin: top`, pero la página pública (`PublicPDF.tsx`) renderiza las páginas a tamaño completo sin ningún escalado.

## Solución

Agregar escalado responsivo dinámico en `PublicPDF.tsx` que calcule la proporción entre el ancho de la ventana y el ancho de la página PDF (794px), y aplique un `transform: scale()` para que siempre quepa en pantalla.

## Cambios

### `src/pages/PublicPDF.tsx`

- Agregar un hook que mida el ancho del contenedor con `ResizeObserver`
- Calcular `scale = Math.min(containerWidth / 794, 1)` (nunca mayor a 1 en desktop)
- Aplicar `transform: scale(scale)` con `transform-origin: top center` al wrapper de las páginas PDF
- Ajustar la altura del contenedor con `height * scale` para evitar espacio vacío

Esto garantiza que:
- En móvil (360px): scale ~0.45, todo visible
- En tablet (768px): scale ~0.95, casi completo
- En desktop (1024px+): scale 1, sin cambio

No se modifican los componentes PDF internos ni los estilos de impresión.

