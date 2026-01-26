
# Plan: Simplificar la Vista de Precios en el PDF para Clientes

## Problemas Identificados

Según la imagen proporcionada, hay varios elementos que confunden al cliente:

1. **Desglose interno visible**: Se muestran líneas como "Servicios fijos por persona: USD 825", "DECAMERON BARU (BARU): USD 2340" y "Subtotal base: USD 3165" - esto es información interna del agente

2. **Suma adicional en opciones**: Debajo de cada opción de alojamiento aparece "+USD 180/persona", "+USD 255/persona", etc. - esto confunde porque el cliente no necesita saber cuánto suma cada parte

3. **Cuadro de precio total redundante**: El cuadro final con "Precio total USD 17.455" y "Por persona USD 4795" no tiene sentido cuando ya hay precios diferenciados por tipo de ocupación

4. **Inconsistencia entre preview y export**: El PDF guardado debe verse igual que la vista previa del wizard

---

## Solución Propuesta

### Diseño Visual Simplificado del PDF

Cambiar de esto (actual):
```
┌─── HABITACIÓN DOBLE ────────────────────────────────┐
│ Servicios fijos por persona:          USD 825       │ ← QUITAR
│ DECAMERON BARU (BARU):                USD 2340      │ ← QUITAR
│ ─────────────────────────────────────────           │
│ Subtotal base:                        USD 3165      │ ← QUITAR
│                                                     │
│ Opciones de alojamiento (elija una):                │
│                                                     │
│ ┌─ Opción 1: ETHNIC THEMATIC ───────────────────┐   │
│ │ +USD 180/persona                  USD 3345    │ ← QUITAR el +USD
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

┌─── Precio total ────────────────────────────────────┐
│ USD 17.455                    Por persona USD 4795  │ ← QUITAR TODO
└─────────────────────────────────────────────────────┘
```

A esto (nuevo diseño limpio):
```
┌─── HABITACIÓN DOBLE ────────────────────────────────┐
│ (2 pasajeros por habitación)                        │
│                                                     │
│ Elija una opción de alojamiento:                    │
│                                                     │
│ ┌─ Opción 1: ETHNIC THEMATIC ───────────────────┐   │
│ │                                   USD 3345    │   │
│ │                                   por persona │   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ ┌─ Opción 2: EL DELIRIO ────────────────────────┐   │
│ │                                   USD 3420    │   │
│ │                                   por persona │   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ ┌─ Opción 3: SANTO TORIBIO ─────────────────────┐   │
│ │                                   USD 3445    │   │
│ │                                   por persona │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

(Sin cuadro de precio total al final)
```

---

## Cambios Técnicos

### Archivo: `src/components/pdf/PDFDetailsPages.tsx`

#### 1. Eliminar el bloque de desglose interno
Remover las líneas 971-1005 que muestran:
- "Servicios fijos por persona"
- Detalles de cada alojamiento principal con su precio
- "Subtotal base"

#### 2. Eliminar el "+USD X/persona" de las opciones
En las líneas 1039-1041, quitar la línea que muestra:
```jsx
<p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>
  +{quote.trip.currency} {option.lodgingPricePerPerson.toLocaleString(...)}/persona
</p>
```

#### 3. Ocultar el cuadro de precio total cuando hay ocupaciones
Modificar la lógica en líneas 1251-1280 para NO mostrar el cuadro "Precio total / Por persona" cuando `hasOccupancyTypesWithOptions` es `true`.

Actualmente el código hace:
```jsx
) : (hasTotalPrice || hasPricePerPerson) ? (
  <div className="rounded-lg text-white" ...>
    // Precio total y por persona
  </div>
) : null
```

Cambiar a:
```jsx
) : (!hasOccupancyTypesWithOptions && (hasTotalPrice || hasPricePerPerson)) ? (
  // Solo mostrar si NO hay ocupaciones diferenciadas
) : null
```

---

## Resumen de Cambios

| Componente | Cambio |
|------------|--------|
| PDFDetailsPages.tsx (líneas 971-1005) | Eliminar bloque de "Base breakdown" que muestra servicios fijos y subtotal |
| PDFDetailsPages.tsx (líneas 1039-1041) | Eliminar línea "+USD X/persona" de cada opción |
| PDFDetailsPages.tsx (líneas 1251-1280) | Agregar condición `!hasOccupancyTypesWithOptions` para ocultar el precio total general |

---

## Resultado Esperado

### Para el cliente (PDF):
- Cada cuadro de ocupación muestra SOLO las opciones con su precio final
- No hay desgloses internos visibles
- No hay sumas parciales confusas
- No hay cuadro de "Precio total" redundante al final

### Para el agente (wizard):
- El desglose completo sigue visible en la sección de Precios del wizard
- Los márgenes y costos internos siguen siendo calculados y mostrados internamente
- Nada cambia en la experiencia del agente

### Consistencia Preview/Export:
- Ambos usan el mismo componente `PDFDetailsPages`, por lo que los cambios se reflejarán en ambos automáticamente
