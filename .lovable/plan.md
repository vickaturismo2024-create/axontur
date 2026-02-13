
# Seccion de Tutoriales y Guia del Sistema

## Descripcion

Crear una nueva pagina "/tutoriales" con una guia completa e interactiva que explique todas las funcionalidades de la app de presupuestos de viaje. La pagina estara organizada en secciones colapsables (accordions) con explicaciones claras, pensadas para usuarios nuevos.

## Contenido de los tutoriales

La guia cubrira los siguientes temas:

1. **Primeros pasos** - Como crear tu primer presupuesto, navegar el dashboard y entender la interfaz
2. **Datos del cliente** - Como completar la informacion del pasajero/cliente
3. **Vuelos** - Como agregar vuelos, vincular ida y vuelta, agregar escalas con tramos conectados, y opciones de equipaje
4. **Alojamientos** - Como agregar hoteles, configurar multiples opciones de alojamiento, precios por noche vs total estadia
5. **Transportes** - Trenes, ferrys, autos de alquiler y traslados
6. **Cruceros y Actividades** - Como agregar cruceros y excursiones
7. **Sistema de precios** - Modo automatico vs manual, costo neto vs precio de venta, margenes
8. **Ocupaciones** - Como configurar precios por tipo de habitacion (single, doble, etc.)
9. **Opciones de vuelo** - Como presentar multiples alternativas de vuelo con precios independientes
10. **Plantillas** - Como crear y usar plantillas de diseno para los PDFs
11. **Vista previa y PDF final** - Como previsualizar, exportar y compartir el presupuesto
12. **Tips para un buen presupuesto** - Mejores practicas y consejos

## Cambios tecnicos

### Nuevos archivos

- **`src/pages/Tutorials.tsx`** - Pagina principal con accordions organizados por tema, iconos descriptivos y textos claros
- **`src/components/tutorials/TutorialSection.tsx`** - Componente reutilizable para cada seccion de tutorial (accordion con icono, titulo y contenido)

### Archivos modificados

- **`src/App.tsx`** - Agregar ruta `/tutoriales` protegida
- **`src/components/layout/Header.tsx`** - Agregar "Tutoriales" al menu de navegacion (desktop y mobile)

## Diseno

- Pagina con fondo limpio y header consistente con el resto de la app
- Secciones colapsables (Accordion de Radix UI) para no abrumar al usuario
- Iconos de Lucide para cada seccion (Plane para vuelos, Hotel para alojamientos, etc.)
- Textos en espanol, lenguaje amigable y no tecnico
- Responsive para mobile y desktop
