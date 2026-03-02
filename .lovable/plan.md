

# Detección automática de recargos en importación desde URL

## Contexto

Esto es un requisito adicional para la funcionalidad de importación de paquetes desde URLs de mayoristas. Cuando el mayorista publica un precio, muchas veces agrega notas como:

- "Agregar 1.5% en concepto de gastos administrativos"
- "Precio + IVA 21%"
- "Sumar impuesto PAIS 30% + percepción ganancias 45%"
- "Fee de emisión USD 50 por pasajero"

El sistema debe detectar estos recargos automáticamente y aplicarlos al precio final.

## Diseño

### En la Edge Function `scrape-package`

El prompt de extracción con tool calling incluirá un campo `surcharges` (recargos) en el schema de la herramienta. La IA analizará el texto de la página y extraerá:

```text
surcharges: [
  { type: "percentage", label: "Gastos administrativos", value: 1.5 },
  { type: "percentage", label: "IVA", value: 21 },
  { type: "fixed_per_person", label: "Fee de emisión", value: 50 },
]
```

Tipos de recargo soportados:
- `percentage`: porcentaje sobre el precio base (ej: 1.5% gastos admin)
- `fixed_total`: monto fijo total (ej: USD 100 de gestión)
- `fixed_per_person`: monto fijo por pasajero (ej: USD 50 fee por persona)

### Cálculo automático

La edge function calculará dos valores:
- `basePrice`: el precio publicado por el mayorista
- `finalPrice`: el precio con todos los recargos aplicados

La lógica:
1. Tomar el precio base
2. Sumar todos los recargos porcentuales (acumulativos sobre la base)
3. Sumar los recargos fijos
4. Devolver el precio final como `cost` del presupuesto

### En el preview de importación (`ImportURLDialog`)

Antes de confirmar, el usuario verá:
- Precio base del mayorista
- Lista de recargos detectados con sus montos
- Precio final calculado
- Opción de editar/eliminar recargos antes de confirmar

### Mapeo al presupuesto

El precio final (con recargos aplicados) se carga como **costo** (`cost`) en cada servicio del presupuesto. El precio de venta (`price`) lo define el agente después, aplicando su margen como siempre.

## Archivos involucrados

| Archivo | Cambio |
|---|---|
| `supabase/functions/scrape-package/index.ts` | Schema de tool calling incluye `surcharges`, lógica de cálculo de precio final |
| `src/components/quotes/ImportURLDialog.tsx` | Preview muestra recargos detectados, permite editar antes de confirmar |

## Nota

Esto se implementa como parte integral de la funcionalidad de importación desde URL (que aún no fue creada). No requiere cambios en el modelo de datos del presupuesto porque los recargos se resuelven antes de cargar los datos: el presupuesto recibe directamente el costo final ya calculado.

