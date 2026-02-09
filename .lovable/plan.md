

# Fix completo: Preview + PDF final con datos correctos

## Problema

Hay 3 puntos donde se usan los datos de pricing, y los 3 necesitan arreglarse:

1. **Preview en vivo** (QuoteWizard `previewQuote`): Solo aplica recalculo si `hasMultipleFlightUnits || hasOccupancies`. Cuando la fusion deja 1 sola unidad, `hasMultipleFlightUnits = false` y se devuelve el quote viejo con 2 opciones.

2. **Guardado** (QuoteWizard `handleSave`): Misma condicion. Si no entra al bloque, guarda los datos viejos en la base de datos.

3. **PDF final** (ExportPDF): Lee directo de la base de datos. Si los datos guardados estan mal, el PDF esta mal.

## Solucion: 2 cambios

### Cambio 1: `src/hooks/useOccupancyPricingCalculator.ts` - `applyOccupancyPricing`

Modificar la funcion para que SIEMPRE devuelva `flightOptionsPricing` (aunque sea array vacio `[]`), en vez de retornar `{}` cuando no hay opciones multiples. Esto limpia los datos obsoletos al hacer spread sobre el pricing existente.

### Cambio 2: `src/components/quotes/QuoteWizard.tsx` - Condicion de aplicacion

Cambiar la condicion en 2 lugares:

**Preview (previewQuote useMemo):**
```
// ANTES:
if (hasMultipleFlightUnits || hasOccupancies) { ... }

// DESPUES:
if (quote.flights.length > 0 || hasOccupancies) { ... }
```

**Guardado (handleSave):**
```
// ANTES:
if (hasMultipleFlightUnits || hasOccupancies) { ... }

// DESPUES:
if (quote.flights.length > 0 || hasOccupancies) { ... }
```

Esto asegura que siempre que haya vuelos, se aplique el calculo en vivo (que devolvera `flightOptionsPricing: []` si es 1 sola unidad), limpiando los datos viejos tanto en la preview como al guardar.

## Resultado

- **Preview**: Muestra 1 solo precio porque `flightOptionsPricing` se sobreescribe con `[]`
- **Guardado**: Persiste `flightOptionsPricing: []` en la base de datos
- **PDF final**: Lee los datos correctos de la base de datos y muestra 1 solo precio

No hace falta tocar ExportPDF.tsx. El fix esta en asegurar que los datos guardados sean correctos.

