
# Corregir visualizacion del PDF publico en movil (fix definitivo)

## Problema raiz

El `transform: scale()` aplicado actualmente solo cambia la representacion visual del contenido, pero el elemento DOM sigue ocupando su ancho original de 794px en el flujo del layout. Esto causa desbordamiento horizontal (scroll lateral) en pantallas mas angostas.

## Solucion

Envolver el contenido escalado en un contenedor que ajuste su ancho y alto real al tamano escalado, usando `overflow: hidden` y dimensiones dinamicas.

## Cambio en `src/pages/PublicPDF.tsx`

- Agregar `overflow-x: hidden` al contenedor raiz para prevenir scroll horizontal
- Envolver el div escalado en un contenedor con altura dinamica calculada (`contentHeight * scale`) para que no quede espacio vacio ni se corte
- Medir la altura real del contenido con un ref y recalcularla cuando cambie el scale

La estructura quedaria:

```
contenedor (overflow-x: hidden, width: 100%)
  └── wrapper (height: contentHeight * scale)
       └── div escalado (transform: scale, transform-origin: top center)
            └── paginas PDF
```

## Detalle tecnico

1. Usar el `contentRef` existente para medir la altura real del contenido PDF
2. Calcular `scaledHeight = contentRef.scrollHeight * scale`
3. Aplicar esa altura al wrapper para que el layout sea correcto
4. Agregar `overflow-x: hidden` al contenedor principal

Esto garantiza que en movil el contenido se encoja correctamente sin causar scroll horizontal ni dejar espacio vacio.
