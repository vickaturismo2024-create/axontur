

# Tour guiado completo + Demos mas interactivas

## Resumen

Expandir el tour guiado de 4 pasos a ~15 pasos en 3 secciones tematicas, cubriendo vuelos, alojamiento y precios. Mejorar las demos existentes con elementos interactivos (inputs clickeables, toggles, valores que cambian al hacer clic).

---

## 1. Tour guiado expandido

### Nuevas secciones del tour

Actualmente solo existe la seccion "general" con 4 pasos. Se agregaran 3 secciones mas:

**Seccion "flights" - Vuelos (5 pasos)**
- Pestana de vuelos (navegar a la tab correcta)
- Boton "Agregar vuelo"
- Campos de origen/destino
- Boton "Agregar opcion de vuelo" (para multiples alternativas)
- Parser de PNR

**Seccion "lodging" - Alojamiento (4 pasos)**
- Pestana de alojamiento
- Formulario de hotel (nombre, ubicacion, fechas)
- Checkbox "Es una opcion alternativa"
- Selector de precio por noche vs total

**Seccion "pricing" - Precios (4 pasos)**
- Pestana de precios
- Campos de costo neto y margen
- Modo automatico vs manual
- Boton guardar

### Cambios tecnicos para el tour

- **`src/contexts/TourContext.tsx`**: Agregar las 3 nuevas secciones con sus pasos al array `tourSections`
- **`src/components/quotes/QuoteWizard.tsx`**: Agregar ~12 nuevos `data-tour` attributes a elementos clave (botones, inputs, secciones)
- **`src/pages/Tutorials.tsx`**: Agregar botones "Iniciar tour guiado" en las secciones de Vuelos, Alojamiento y Precios (ademas del general que ya existe)
- **`src/contexts/TourContext.tsx`**: Agregar logica para cambiar el step/tab activo del QuoteWizard cuando el tour lo requiera (nuevo campo `onEnter` en cada step que ejecuta una accion al llegar, como cambiar a la pestana de vuelos)

### Navegacion entre pestanas durante el tour

El tour necesita poder cambiar la pestana activa del QuoteWizard. Para esto:
- Exponer una funcion `setCurrentStep` del QuoteWizard a traves de un callback o ref
- O usar un approach mas simple: el TourContext emitira un evento custom cuando necesite cambiar de tab, y el QuoteWizard lo escuchara

---

## 2. Demos mas interactivas

### Mejoras a las demos existentes

**FlightDemo** (vuelos) - Agregar interactividad:
- Paso con inputs donde el usuario puede hacer clic para "completar" campos (simular tipeo animado)
- Paso con un toggle de ida/vuelta que el usuario puede clickear y ver como se conectan los vuelos visualmente
- Paso donde al hacer clic en "Agregar equipaje" aparece la seleccion animada

**PricingDemo** (precios) - Agregar interactividad:
- Paso con un slider o botones +/- para cambiar el margen y ver como se recalcula el precio de venta en tiempo real
- Paso con un toggle automatico/manual que cambia la interfaz al hacer clic

**LodgingDemo** (alojamiento) - Agregar interactividad:
- Paso con un toggle "por noche / total" que al clickear cambia los valores mostrados
- Paso donde al hacer clic aparece una segunda opcion de hotel animada

**TemplateDemo** (plantillas) - Agregar interactividad:
- Los circulos de color seran clickeables y al seleccionar uno, el mini-PDF de abajo cambia su color

**PDFDemo** (PDF) - Mantener similar pero mejorar:
- Agregar un paso donde el mini-PDF se "arma" progresivamente (portada, luego vuelos, luego hotel)

### Nuevas demos

- **TransportDemo**: Demo basica mostrando los tipos de transporte disponibles
- **OccupancyDemo**: Demo interactiva mostrando como cambian los precios por tipo de habitacion

### Cambios tecnicos para demos

- **`src/components/tutorials/TutorialDemo.tsx`**: Sin cambios, el wrapper ya soporta cualquier contenido en los pasos
- **Cada demo individual**: Reescribir los pasos para incluir `useState` con elementos clickeables. El tipo `DemoStep` necesitara soportar componentes con estado, asi que cada demo pasara a ser un componente funcional completo en vez de un array estatico de steps
- **Nuevo tipo**: Cambiar la interfaz de demos para que cada paso pueda ser un componente React interactivo (no solo JSX estatico)

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/contexts/TourContext.tsx` | Agregar 3 secciones de tour (~13 pasos nuevos), agregar campo `tabIndex` a TourStep |
| `src/components/tour/TourOverlay.tsx` | Mostrar nombre de la seccion, agregar barra de progreso visual |
| `src/components/quotes/QuoteWizard.tsx` | Agregar ~12 data-tour attributes, escuchar cambios de tab desde el tour |
| `src/pages/Tutorials.tsx` | Agregar botones de tour por seccion, integrar nuevas demos |
| `src/components/tutorials/demos/FlightDemo.tsx` | Reescribir con pasos interactivos (click para completar, toggle ida/vuelta) |
| `src/components/tutorials/demos/PricingDemo.tsx` | Agregar slider de margen interactivo, toggle auto/manual |
| `src/components/tutorials/demos/LodgingDemo.tsx` | Toggle por noche/total, agregar opcion animada |
| `src/components/tutorials/demos/TemplateDemo.tsx` | Colores clickeables que cambian el mini-PDF |
| `src/components/tutorials/demos/PDFDemo.tsx` | PDF que se arma progresivamente |

## Archivos nuevos

| Archivo | Descripcion |
|---|---|
| `src/components/tutorials/demos/TransportDemo.tsx` | Demo de tipos de transporte |
| `src/components/tutorials/demos/OccupancyDemo.tsx` | Demo interactiva de ocupaciones |

---

## Detalle tecnico: Sincronizacion Tour-QuoteWizard

Para que el tour pueda cambiar la pestana del wizard:

1. Agregar un campo `tabIndex` opcional al tipo `TourStep`
2. En `TourContext`, cuando se avanza al siguiente paso, emitir un `CustomEvent` con el tabIndex deseado
3. En `QuoteWizard`, escuchar ese evento y llamar `setCurrentStep(tabIndex)` 

Esto evita acoplar los componentes y permite que el tour funcione sin modificar la arquitectura existente.

