

# Optimización del PDF público para móviles

## Problema

El PDF público (`/pdf/:id`) usa `transform: scale()` para reducir el contenido A4 (794px) al ancho del dispositivo. Esto tiene dos problemas en móviles:

1. **Contenido "entrecortado"**: El `overflow: hidden` en el wrapper puede cortar contenido cuando la altura calculada (`contentHeight * scale`) no es precisa — el `scrollHeight` se lee antes de que todo renderice, o cambia con imágenes cargadas.
2. **Sin zoom**: El viewport meta no bloquea zoom, pero el contenido escalado dentro de un contenedor fijo no responde bien al pinch-to-zoom del usuario.

## Solución

Cambiar la estrategia de visualización móvil: en vez de escalar con `transform: scale()` (que mantiene el layout A4 rígido), hacer que las páginas PDF sean **responsive nativas** en móvil.

### Enfoque: Dos modos de renderizado

- **Desktop/tablet grande** (>768px): Mantener el modo actual con scale y aspecto A4
- **Móvil** (<768px): Las `.pdf-page` se adaptan al ancho del dispositivo con CSS responsive, sin transform scale

### Cambios concretos

**`src/pages/PublicPDF.tsx`**:
- Detectar si el ancho es menor a 768px con el ResizeObserver existente
- En modo móvil: no aplicar `transform: scale()`, no calcular altura fija, no `overflow: hidden`
- Renderizar las páginas directamente con ancho 100%

**`src/index.css`**:
- Agregar media query para `.pdf-page` en móvil: `width: 100%`, `min-height: auto`, `padding` reducido (5mm o 4vw)
- Ajustar font-sizes internos del PDF con clamp/responsive units para que el texto sea legible
- Reducir gaps entre páginas en móvil

**`src/components/pdf/PDFPageWrapper.tsx`**:
- Sin cambios estructurales, el CSS responsive lo maneja

### Resultado esperado

En móvil el presupuesto se ve como una página web continua y legible, con texto a tamaño natural, sin necesidad de hacer zoom. El usuario puede hacer scroll vertical normalmente. En desktop y al imprimir, se mantiene el formato A4 exacto.

