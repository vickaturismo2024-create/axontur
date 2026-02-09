

# Plan: Agrupar vuelos ida y vuelta como un solo paquete aereo

## Problema

Cuando se carga un vuelo de ida (ej: Buenos Aires a Cancun) y uno de vuelta (Cancun a Buenos Aires), el sistema los trata como 2 opciones de vuelo distintas y genera 2 cuadros de "Valor del Viaje". Son parte del mismo viaje, no opciones alternativas.

## Solucion

Reutilizar el mecanismo existente de `connectionGroupId` para vincular tanto escalas como vuelos ida/vuelta. Los vuelos vinculados se cuentan como 1 sola unidad de vuelo en los calculos de precio.

### Cambio conceptual

Actualmente `connectionGroupId` se usa solo para escalas. Lo expandimos para que signifique **"estos vuelos van juntos"** (ya sea escala o ida+vuelta). En la UI, el selector actual de "Vincular tramo (escala)" se renombra a algo mas general.

---

## Cambios

### Archivo 1: `src/components/quotes/QuoteWizard.tsx`

**UI del selector de vinculacion** (alrededor de linea 943):
- Renombrar "Vincular tramo (escala)" a "Vincular vuelos (escala / ida y vuelta)"
- Cambiar el texto de ayuda de "Este vuelo es parte de una conexion (escala)" a "Este vuelo esta vinculado con otros tramos del mismo paquete aereo"
- Cambiar la opcion "Crear nuevo grupo de conexion" a "Crear nuevo grupo de vuelos"

### Archivo 2: `src/hooks/useOccupancyPricingCalculator.ts`

**Logica de tipo de vuelo en unidades** (linea 686):
- Cuando un grupo de conexion contiene vuelos con rutas inversas (A a B + B a A), marcar como `flightType: 'direct'` (ida y vuelta) en vez de `stopover`
- Esto afecta solo la etiqueta en el PDF, no el calculo

Deteccion de ida/vuelta dentro de un connection group:
```typescript
// Detectar si es ida/vuelta (origen del primero = destino del ultimo y viceversa)
const isRoundTrip = groupFlights.length >= 2 && 
  groupFlights[0].origin.toLowerCase().trim() === groupFlights[groupFlights.length - 1].destination.toLowerCase().trim() &&
  groupFlights[0].destination.toLowerCase().trim() === groupFlights[groupFlights.length - 1].origin.toLowerCase().trim();

flightUnits.push({
  ...
  flightType: isRoundTrip ? 'direct' : 'stopover',
});
```

### Archivo 3: `src/components/pdf/PDFDetailsPages.tsx`

**Etiqueta del cuadro de precio** (linea 1170):
- Agregar caso para ida/vuelta: cuando `flightType === 'direct'` y hay multiples segmentos, mostrar "Ida y Vuelta" en vez de "Vuelo Directo"

---

## Resultado esperado

1. El usuario carga vuelo ida (BUE a CUN) y vuelo vuelta (CUN a BUE)
2. En el editor, vincula ambos vuelos usando el selector "Vincular vuelos"
3. El sistema los cuenta como 1 sola unidad de vuelo
4. No se generan cuadros de opciones (porque hay 1 sola unidad)
5. Se muestra el precio total unico normalmente: vuelos + hotel + servicios

Si ademas hay una opcion alternativa (otro vuelo directo BUE a CUN sin vincular), ahi si se generan 2 opciones:
- Opcion 1: ida/vuelta vinculados
- Opcion 2: vuelo directo alternativo

