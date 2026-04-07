

# Plan: Corregir bugs encontrados en la prueba E2E

## Bugs identificados

### Bug 1: Margen promedio inflado (879%)
**Archivo**: `src/pages/Dashboard.tsx` (línea 40)
**Problema**: La fórmula `(totalValue - totalCost) / totalCost * 100` suma todos los presupuestos, incluyendo los que tienen costo 0 o null. Esto infla el margen enormemente.
**Solución**: Calcular el margen individualmente por presupuesto (solo donde cost > 0 y totalPrice > 0), y promediar esos márgenes.

### Bug 2: forwardRef warnings en Header
**Archivo**: `src/components/layout/Header.tsx`
**Problema**: Componentes funcionales reciben refs sin usar `React.forwardRef()`, generando warnings en consola.
**Solución**: Identificar el componente que recibe ref en Header y envolverlo con `forwardRef`.

### Bug 3: Tren "no incluido" no muestra precio aparte en PDF
**Archivo**: `src/components/pdf/PDFDetailsPages.tsx`
**Problema**: Cuando un tren tiene `included: false`, el PDF lo muestra pero no indica que es opcional ni su precio aparte (USD 150).
**Solución**: Agregar badge "Opcional" y texto "Precio aparte: USD X" para trenes/ferrys/autos con `included: false`, igual que ya se hace para transfers.

## Archivos a modificar

1. `src/pages/Dashboard.tsx` — Fix cálculo de margen promedio
2. `src/components/layout/Header.tsx` — Fix forwardRef warning
3. `src/components/pdf/PDFDetailsPages.tsx` — Mostrar precio aparte para transportes no incluidos

## Lo que funcionó correctamente

- Creación de presupuesto con todos los datos
- Toggle "Incluido en el paquete" visible y funcional en trenes
- Cálculo automático excluye correctamente el tren no incluido (total USD 950, no 1100)
- Transición de estados: Borrador → Enviado → Aprobado
- Badges de estado con colores correctos
- Menú de compartir con opciones de vencimiento
- Exportación PDF con portada y datos
- Métricas de aprobados se actualizan (0% → 3%)

