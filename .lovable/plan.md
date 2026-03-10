

# Fix: PDF cortado en móviles - Solución agresiva

## Diagnóstico raíz

Después de revisar el código en detalle, hay varios problemas que las correcciones anteriores no resolvieron:

1. **Estado inicial `isMobile = false`**: El componente siempre renderiza primero en modo desktop (con `transform: scale()` y `overflow: hidden`). En un teléfono, el primer frame visible muestra el PDF escalado y cortado antes de que el ResizeObserver detecte que es móvil y re-renderice. Esto puede dejar artefactos.

2. **Tablas con `overflow-hidden`**: En `PDFDetailsPages.tsx` (línea 171), los contenedores de tablas usan `className="overflow-hidden rounded border"`, lo que recorta contenido que excede el ancho del contenedor.

3. **Estilos inline con tamaños fijos**: Todo el contenido del PDF usa `style={{ fontSize: '11px' }}` directamente en los elementos, que no se puede sobrescribir con CSS (los inline styles tienen prioridad sobre clases CSS). Las reglas `!important` en el CSS solo funcionan para propiedades que NO están definidas inline.

4. **Cover page con posicionamiento absoluto**: La imagen de fondo usa `absolute inset-0` que necesita un contenedor con altura explícita. El `min-height: 85vh` ayuda pero puede no ser suficiente.

## Solución

### 1. `src/pages/PublicPDF.tsx` — Detectar móvil desde el inicio
- Usar `window.innerWidth` para inicializar `isMobile` correctamente desde el primer render, evitando el flash de la versión desktop
- Eliminar el cálculo de `contentHeight` en modo móvil (no se usa)

### 2. `src/index.css` — CSS móvil más agresivo
- Agregar override para `overflow-hidden` dentro de pdf-mobile-view: `.pdf-mobile-view .pdf-page .overflow-hidden { overflow: visible !important; }`
- Forzar tamaños de fuente en TODOS los elementos con `*` selector dentro de `.pdf-mobile-view`
- Asegurar que todos los elementos con `position: absolute` dentro de las páginas se comporten correctamente

### 3. `src/components/pdf/PDFCoverPage.tsx` — Layout móvil robusto
- Agregar `min-h-[85vh]` directamente como clase en el componente para que la portada siempre tenga altura suficiente en cualquier dispositivo, independiente de la media query CSS

### 4. `src/components/pdf/PDFDetailsPages.tsx` — Quitar overflow-hidden de tablas
- Cambiar `overflow-hidden` por `overflow-x-auto` en los contenedores de tablas para que en móvil las tablas anchas se puedan scrollear en vez de cortarse

## Resultado esperado
El PDF se visualiza correctamente desde el primer frame en móviles. No hay contenido cortado. Las tablas anchas se pueden scrollear. La portada siempre tiene altura correcta.

