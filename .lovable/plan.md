

# Fix: PDF cortado en móviles - Enfoque raíz

## Problema real

Los intentos anteriores fallaron porque combaten síntomas, no la causa raíz. El problema es:

1. **La clase `.pdf-page` define `width: 210mm` (794px)** como estilo base. Los overrides móviles usan `@media (max-width: 767px)` con `.pdf-mobile-view .pdf-page { width: 100% !important }`, pero esta combinación de media query + clase específica es frágil y puede no aplicarse correctamente en todos los navegadores móviles.

2. **Las tablas con `display: block`** rompen el layout de tabla nativo -- las celdas ya no se alinean correctamente.

3. **Los componentes internos** (`PDFDetailsPages`, `PDFContactPages`, `PDFItineraryPages`) usan `PDFPageWrapper` que aplica la clase `pdf-page` incondicionalmente, forzando dimensiones A4 siempre.

## Solución: pasar `isMobile` como prop y no usar `pdf-page` en móvil

En lugar de luchar con CSS overrides, la solución es **no aplicar la clase `pdf-page` en modo móvil**. Esto elimina de raíz el ancho fijo de 210mm.

### Cambios

#### 1. `src/pages/PublicPDF.tsx`
- Pasar `isMobile` como prop a todos los componentes PDF: `PDFCoverPage`, `PDFDetailsPages`, `PDFContactPages`, `PDFItineraryPages`

#### 2. `src/components/pdf/PDFPageWrapper.tsx`
- Aceptar prop `isMobile?: boolean`
- Cuando `isMobile` es true, usar una clase `pdf-page-mobile` en vez de `pdf-page`
- La clase `pdf-page-mobile` no tendrá restricciones de ancho ni altura fija

#### 3. `src/components/pdf/PDFCoverPage.tsx`
- Aceptar prop `isMobile?: boolean`
- Cuando es mobile, usar clase `pdf-page-mobile` en vez de `pdf-page`
- No cambiar el layout interno, solo la clase del contenedor

#### 4. `src/components/pdf/PDFDetailsPages.tsx`, `PDFContactPages.tsx`, `PDFItineraryPages.tsx`
- Aceptar prop `isMobile?: boolean` y pasarla a `PDFPageWrapper`

#### 5. `src/index.css`
- Agregar clase `.pdf-page-mobile`:
  ```css
  .pdf-page-mobile {
    background: white;
    width: 100%;
    padding: 16px;
    font-family: 'Inter', sans-serif;
    box-sizing: border-box;
    position: relative;
    overflow: visible;
    word-break: break-word;
  }
  ```
- Agregar reglas de tipografía responsiva para `.pdf-page-mobile` (sin `!important` ya que no hay conflicto con la clase base)
- Reglas para tablas dentro de `.pdf-page-mobile`: `overflow-x: auto` en el contenedor, sin `display: block`
- Eliminar o simplificar las reglas actuales de `@media (max-width: 767px)` que ya no serán necesarias

#### 6. `src/pages/ExportPDF.tsx`
- Sin cambios (esta página es para el agente en desktop, no para el cliente en móvil)

## Resultado esperado

En móvil, las páginas usan `pdf-page-mobile` que es 100% del ancho del dispositivo con padding razonable. No hay width fijo de 210mm ni min-height de 297mm. El contenido fluye naturalmente. En desktop y print, sigue usando `pdf-page` con las dimensiones A4 originales.

