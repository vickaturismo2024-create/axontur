
# Plan: Mejoras al Sistema de Opciones de Vuelo

## Resumen de Cambios Solicitados

Se requieren tres mejoras principales:

1. **Deteccion de vuelos con escala en PNR**: Mejorar el parser para detectar vuelos conectados automaticamente, o permitir vincular tramos manualmente
2. **Selector de equipaje predefinido**: Reemplazar el campo de texto libre por opciones fijas + opcion personalizada
3. **Precios finales con opciones de vuelo**: Mostrar cuadros de precio separados combinando servicios fijos + cada opcion de vuelo

---

## Parte 1: Vinculacion de Tramos de Vuelo (Escalas)

### Problema Actual
Cuando se importa un PNR con conexion (ej: Buenos Aires -> Miami -> Cancun), se crean dos tramos separados sin relacion entre si.

### Solucion Propuesta

#### 1.1 Actualizar el PNR Parser
Modificar el prompt del edge function para que la IA detecte segmentos conectados y los marque.

**Archivo: `supabase/functions/parse-pnr/index.ts`**
- Agregar campo `connectionGroupId` en la respuesta
- Instruir a la IA para detectar vuelos conectados (mismo dia, destino de uno = origen del siguiente)

#### 1.2 Agregar campo de vinculacion en Flight
**Archivo: `src/types/quote.ts`**

Agregar a la interfaz Flight:
```
connectionGroupId?: string; // Para vincular tramos de una misma conexion
```

#### 1.3 UI para vincular tramos manualmente
**Archivo: `src/components/quotes/QuoteWizard.tsx`**

Agregar un selector "Vincular con tramo anterior" para poder crear escalas manualmente:
- Dropdown para seleccionar el tramo al que se vincula
- Icono visual indicando que los tramos estan conectados
- Badge "CON ESCALA" automatico cuando hay vinculacion

---

## Parte 2: Selector de Equipaje Predefinido

### Problema Actual
El campo de equipaje es texto libre, lo que dificulta la estandarizacion.

### Solucion Propuesta

**Archivo: `src/components/quotes/QuoteWizard.tsx`**

Reemplazar el Input por un Select con las siguientes opciones:

| Valor | Etiqueta |
|-------|----------|
| `personal` | Articulo Personal |
| `personal_carryon` | Articulo Personal + Carry On |
| `personal_carryon_checked` | Articulo Personal + Carry On + Equipaje en Bodega |
| `custom` | Personalizado... |

Cuando se selecciona "Personalizado", aparece un campo de texto para escribir libremente.

### Cambios en validaciones
**Archivo: `src/lib/validations.ts`**

Agregar campo `luggageType` con las opciones predefinidas.

---

## Parte 3: Precios Finales con Opciones de Vuelo

### Problema Actual
Las opciones de vuelo no afectan el precio final. Solo se muestran los precios individuales de cada opcion.

### Solucion Propuesta

Implementar un sistema similar al de opciones de alojamiento:

```
Servicios Fijos: $550
  - Alojamiento: $500
  - Asistencia: $50

Opciones de Vuelo:
  - Opcion 1: Con escala - $300
  - Opcion 2: Directo - $390

= Cuadros de Precio Final:
  OPCION 1: Con escala     = $850 total ($550 + $300)
  OPCION 2: Vuelo directo  = $940 total ($550 + $390)
```

### 3.1 Actualizar el calculador de precios
**Archivo: `src/hooks/useOccupancyPricingCalculator.ts`**

Agregar logica para:
- Detectar cuando hay opciones de vuelo (`isOption: true`)
- Calcular un precio base excluyendo todas las opciones de vuelo
- Generar un array de `FlightOptionPricing` con el precio total para cada opcion

Nueva estructura de datos:
```typescript
interface FlightOptionPricing {
  flightId: string;
  optionLabel: string;
  flightType: 'direct' | 'stopover' | 'charter';
  luggage: string;
  flightPrice: number;
  totalPrice: number;        // base + flightPrice
  pricePerPerson: number;
}
```

### 3.2 Actualizar tipos de datos
**Archivo: `src/types/quote.ts`**

Agregar interface `FlightOptionPricing` y campo en `Pricing`:
```typescript
flightOptionsPricing?: FlightOptionPricing[];
```

### 3.3 Actualizar visualizacion del PDF
**Archivo: `src/components/pdf/PDFDetailsPages.tsx`**

En la seccion "Valor del Viaje", cuando hay opciones de vuelo:
- Mostrar cada opcion de vuelo como un cuadro de precio separado
- Incluir badge de tipo de vuelo (DIRECTO / CON ESCALA / CHARTER)
- Incluir icono de equipaje
- Mostrar precio total combinado

Diseno visual propuesto:
```
┌─── VALOR DEL VIAJE ──────────────────────────────────────────┐
│                                                              │
│ Elija una de las siguientes opciones de vuelo:               │
│                                                              │
│ ╔══════════════════════════════════════════════════════════╗ │
│ ║ OPCION 1: Vuelo con escala                              ║ │
│ ║ ✈️ CON ESCALA · 🧳 Articulo Personal + Carry On         ║ │
│ ║                                                          ║ │
│ ║                          USD 850/persona                 ║ │
│ ╚══════════════════════════════════════════════════════════╝ │
│                                                              │
│ ╔══════════════════════════════════════════════════════════╗ │
│ ║ OPCION 2: Vuelo directo con equipaje                    ║ │
│ ║ ✈️ VUELO DIRECTO · 🧳 Art. Personal + Carry On + Bodega ║ │
│ ║                                                          ║ │
│ ║                          USD 940/persona                 ║ │
│ ╚══════════════════════════════════════════════════════════╝ │
│                                                              │
│ [Informacion de pago y condiciones...]                       │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 Actualizar validaciones
**Archivo: `src/lib/validations.ts`**

Agregar esquema para `flightOptionsPricing` para que los precios calculados se persistan correctamente.

---

## Combinacion con Opciones de Alojamiento

Si hay AMBOS tipos de opciones (vuelo + alojamiento), se generaran combinaciones:

```
Servicios Fijos: $50 (asistencia)

Opciones de Vuelo:
  - Vuelo con escala: $300
  - Vuelo directo: $390

Opciones de Alojamiento:
  - Hotel 3*: $400
  - Hotel 5*: $600

= Combinaciones de Precio Final:
  1. Vuelo escala + Hotel 3*:    $750 ($50 + $300 + $400)
  2. Vuelo escala + Hotel 5*:    $950 ($50 + $300 + $600)
  3. Vuelo directo + Hotel 3*:   $840 ($50 + $390 + $400)
  4. Vuelo directo + Hotel 5*:  $1040 ($50 + $390 + $600)
```

Esta funcionalidad se puede implementar en una segunda fase si es necesario, comenzando primero con opciones de vuelo independientes.

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `supabase/functions/parse-pnr/index.ts` | Detectar vuelos conectados, agregar `connectionGroupId` |
| `src/types/quote.ts` | Agregar `connectionGroupId`, `luggageType`, `FlightOptionPricing` |
| `src/lib/validations.ts` | Actualizar esquemas de vuelo y pricing |
| `src/components/quotes/QuoteWizard.tsx` | Selector de equipaje, vinculacion de tramos |
| `src/hooks/useOccupancyPricingCalculator.ts` | Calcular precios con opciones de vuelo |
| `src/components/pdf/PDFDetailsPages.tsx` | Mostrar cuadros de precio por opcion de vuelo |

---

## Orden de Implementacion

1. **Tipos y validaciones**: Actualizar estructuras de datos
2. **Selector de equipaje**: Implementar UI con opciones predefinidas
3. **Vinculacion de tramos**: Campo para conectar vuelos como escala
4. **PNR Parser**: Mejorar deteccion de conexiones
5. **Calculador de precios**: Generar precios por opcion de vuelo
6. **PDF**: Mostrar cuadros de precio combinados
7. **Pruebas**: Verificar que todo funciona correctamente
