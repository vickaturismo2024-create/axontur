

# Tutoriales Interactivos con Mini-Demos y Walkthrough

## Resumen

Transformar la pagina de tutoriales actual en una experiencia interactiva y visual con dos nuevas funcionalidades principales:

1. **Mini-demos animadas**: Simulaciones visuales dentro de cada seccion del tutorial que muestran paso a paso como se ve la interfaz al realizar cada accion (agregar vuelo, configurar precios, etc.), usando componentes animados con CSS transitions.

2. **Walkthrough interactivo**: Un modo "tour guiado" que se activa desde la pagina de tutoriales y lleva al usuario a la pantalla real de la app, resaltando los elementos interactivos con tooltips y overlays paso a paso.

---

## Cambios detallados

### 1. Mini-Demos Animadas (dentro de cada tutorial)

Cada seccion del tutorial tendra un boton "Ver demo" que al hacer clic muestra una animacion paso a paso simulando la interfaz. Por ejemplo:

- **Vuelos**: Una mini-interfaz animada mostrando como se ve el formulario de vuelo, como aparece el boton "Agregar vuelo", como se vinculan ida y vuelta con una animacion de conexion visual.
- **Precios**: Una simulacion de los campos de costo neto, margen y precio de venta, donde al cambiar un valor se anima el calculo automatico.
- **PDF**: Una vista en miniatura del PDF que se va armando a medida que se agregan secciones.

Cada demo sera un componente React con estados que avanzan automaticamente o con botones "Siguiente paso", usando transiciones CSS y los keyframes ya existentes en el proyecto (fade-in, scale-in, slide-in-right).

### 2. Walkthrough Interactivo (Tour Guiado)

Un sistema de tour guiado que funciona sobre la app real. Al activarlo desde tutoriales, redirige al usuario a la pagina correspondiente (ej: editor de presupuestos) y muestra:

- Un overlay semi-transparente sobre toda la pagina
- Un "spotlight" (recorte) alrededor del elemento actual
- Un tooltip con la explicacion del paso
- Botones "Siguiente", "Anterior" y "Salir del tour"

El estado del tour se manejara con un Context (TourContext) que persiste entre paginas.

### 3. Contenido expandido

Cada seccion del tutorial pasara de 2-3 parrafos a incluir:
- Texto explicativo mas detallado con sub-secciones
- Callouts de tips y advertencias (con iconos de info/warning)
- La mini-demo animada correspondiente
- Un boton "Iniciar tour guiado" que lleva a la seccion real de la app

---

## Archivos nuevos

- **`src/components/tutorials/TutorialDemo.tsx`** - Componente wrapper para las mini-demos animadas con controles de paso (siguiente, anterior, reiniciar)
- **`src/components/tutorials/demos/FlightDemo.tsx`** - Demo animada del modulo de vuelos
- **`src/components/tutorials/demos/PricingDemo.tsx`** - Demo animada del sistema de precios
- **`src/components/tutorials/demos/PDFDemo.tsx`** - Demo animada de la generacion de PDF
- **`src/components/tutorials/demos/LodgingDemo.tsx`** - Demo animada de alojamientos
- **`src/components/tutorials/demos/TemplateDemo.tsx`** - Demo animada de plantillas
- **`src/components/tutorials/TutorialCallout.tsx`** - Componente para tips y advertencias destacadas
- **`src/contexts/TourContext.tsx`** - Context para manejar el estado del tour guiado (paso actual, seccion activa, visible/oculto)
- **`src/components/tour/TourOverlay.tsx`** - Overlay con spotlight y tooltip para el tour guiado
- **`src/components/tour/TourStep.tsx`** - Componente que define cada paso del tour (selector CSS del elemento target, texto, posicion del tooltip)

## Archivos modificados

- **`src/pages/Tutorials.tsx`** - Expandir contenido de cada seccion, integrar demos y botones de tour
- **`src/components/tutorials/TutorialSection.tsx`** - Agregar soporte para demos y botones de accion dentro de cada seccion
- **`src/App.tsx`** - Envolver la app con TourProvider
- **`src/pages/QuoteEditor.tsx`** - Agregar data attributes a elementos clave para que el tour los pueda encontrar (ej: `data-tour="add-flight"`)

---

## Detalle tecnico

### Mini-Demos

Cada demo sera un componente con un array de "pasos". Cada paso tiene:
- Un render visual (componente simulado de la interfaz)
- Un texto descriptivo
- Animaciones de entrada/salida usando clases Tailwind existentes

```text
+------------------------------------------+
|  Demo: Agregar un vuelo                  |
|  [Paso 2 de 5]                           |
|                                          |
|  +------------------------------------+  |
|  |  Simulacion visual del formulario  |  |
|  |  con campos animandose             |  |
|  +------------------------------------+  |
|                                          |
|  "Completa origen y destino del vuelo"   |
|                                          |
|  [< Anterior]  [Siguiente >] [Reiniciar] |
+------------------------------------------+
```

### Tour Guiado

El TourContext manejara:
- `isActive`: si el tour esta corriendo
- `currentSection`: que seccion del tutorial se esta mostrando (vuelos, precios, etc.)
- `currentStep`: paso actual dentro de esa seccion
- `steps[]`: array de pasos con { selector, title, description, page }

El TourOverlay se renderiza en el nivel mas alto de la app y usa `position: fixed` con un recorte CSS (clip-path o box-shadow con spread grande) para crear el efecto spotlight.

```text
+--------------------------------------------------+
|  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
|  xxxxx+------------------+xxxxxxxxxxxxxxxxxxxxxxxx|
|  xxxxx| Elemento real    |xxxxxxxxxxxxxxxxxxxxxxxx|
|  xxxxx| de la app        |xxxxxxxxxxxxxxxxxxxxxxxx|
|  xxxxx+------------------+xxxxxxxxxxxxxxxxxxxxxxxx|
|  xxxxxxxxxxxxxxxxxxxxxxxxx+--------------------+xx|
|  xxxxxxxxxxxxxxxxxxxxxxxxx| Tooltip: "Aca se   |xx|
|  xxxxxxxxxxxxxxxxxxxxxxxxx| agregan los vuelos" |xx|
|  xxxxxxxxxxxxxxxxxxxxxxxxx| [Siguiente] [Salir] |xx|
|  xxxxxxxxxxxxxxxxxxxxxxxxx+--------------------+xx|
|  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx|
+--------------------------------------------------+
```

### Dependencias

No se necesitan librerias nuevas. Todo se construye con:
- React state/context para el flujo
- CSS transitions y keyframes existentes
- `getBoundingClientRect()` para posicionar el spotlight
- `ResizeObserver` para recalcular posiciones si cambia el layout

