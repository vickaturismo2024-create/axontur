# Plan: Sistema Completo de Opciones de Vuelo

## Estado: ✅ COMPLETADO

## Cambios Implementados

### 1. ✅ Tipos y Validaciones
- Agregado `LuggageType` con opciones predefinidas: `personal`, `personal_carryon`, `personal_carryon_checked`, `custom`
- Agregado `LUGGAGE_LABELS` con etiquetas legibles en español
- Agregado `connectionGroupId` a `Flight` para vincular tramos de escala
- Agregado `luggageType` a `Flight`
- Creada interface `FlightOptionPricing` con precio combinado (base + vuelo)
- Actualizado `Pricing` con campo `flightOptionsPricing`
- Esquemas de validación actualizados en `validations.ts`

### 2. ✅ Selector de Equipaje Predefinido
- Reemplazado campo de texto libre por `Select` con opciones:
  - 🎒 Artículo Personal
  - 🎒 + 🧳 Art. Personal + Carry On
  - 🎒 + 🧳 + 🛄 Art. Personal + Carry On + Bodega
  - ✏️ Personalizado...
- Campo de texto adicional cuando se selecciona "Personalizado"

### 3. ✅ Vinculación de Tramos (Escalas)
- Agregado selector para vincular vuelos como parte de una conexión
- Opciones: Sin vincular, Crear nueva conexión, Unirse a grupo existente
- Indicador visual cuando un vuelo es parte de una escala
- Cambio automático de `flightType` a `stopover` cuando se vincula

### 4. ✅ Parser PNR Mejorado
- Actualizado prompt del sistema para detectar conexiones automáticamente
- Agregados campos `flightType`, `luggageType`, `connectionGroupId` al schema de respuesta
- Detección automática de vuelos conectados por fecha y aeropuertos coincidentes

### 5. ✅ Cálculo de Precios con Opciones de Vuelo
- Calculador genera `FlightOptionPricing[]` con:
  - Base (servicios fijos + alojamientos principales) sin vuelos opcionales
  - Precio total combinado por cada opción de vuelo
  - Precio por persona
  - Márgenes internos (costo vs precio)
- Excluye vuelos opcionales del precio base automáticamente

### 6. ✅ Cuadros de Precio en PDF
- Sección "Valor del Viaje" muestra cuadros individuales por opción de vuelo
- Cada cuadro incluye:
  - Badge de tipo (DIRECTO / CON ESCALA / CHARTER) con colores distintivos
  - Badge de equipaje con icono 🧳
  - Precio total por persona prominente
  - Precio total del viaje
- Diseño visual con gradientes consistente con opciones de alojamiento

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/types/quote.ts` | Nuevos tipos `LuggageType`, `FlightOptionPricing`, campos adicionales en `Flight` |
| `src/lib/validations.ts` | Esquemas actualizados con nuevos campos |
| `src/components/quotes/QuoteWizard.tsx` | UI de equipaje predefinido y vinculación de tramos |
| `supabase/functions/parse-pnr/index.ts` | Detección de conexiones y tipos de equipaje |
| `src/hooks/useOccupancyPricingCalculator.ts` | Cálculo de `flightOptionsPricing` |
| `src/components/pdf/PDFDetailsPages.tsx` | Renderizado de cuadros de precio por opción |

---

## Comportamiento Final

### Vuelos Principales (isOption = false)
- Se muestran en tabla normal de vuelos
- Sus precios se suman a los "servicios compartidos"
- Afectan el precio total del viaje

### Vuelos Opcionales (isOption = true)
- Se muestran en sección "Opciones de Vuelo" con badges y detalles
- NO se suman al precio base
- Generan cuadros de precio individuales en "Valor del Viaje"
- Cada cuadro = Base (servicios + alojamiento) + Opción de vuelo

### Ejemplo de Cálculo
```
Servicios Fijos: $550
  - Alojamiento: $500
  - Asistencia: $50

Opciones de Vuelo:
  - Opción 1: Con escala - $300
  - Opción 2: Directo - $390

= Cuadros de Precio en PDF:
  OPCIÓN 1: Con escala     = $850/persona
  OPCIÓN 2: Vuelo directo  = $940/persona
```

---

## Próximas Mejoras Posibles

1. **Combinación vuelo + alojamiento**: Si hay opciones de ambos tipos, generar matriz de combinaciones
2. **Agrupación visual de escalas**: En el PDF, mostrar tramos conectados como un solo vuelo con escala
3. **Validación de conexiones**: Alertar si los tiempos de conexión son muy cortos o largos
