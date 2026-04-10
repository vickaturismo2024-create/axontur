

# Plan: Auto-guardado y diagnóstico de proveedores

## Problema real

El código está bien — el selector de proveedor actualiza el vuelo correctamente. Pero el sistema **no tiene auto-guardado**: los cambios solo se persisten cuando hacés click en "Guardar" al final del wizard. Si seleccionaste el proveedor pero no guardaste al final, el dato se perdió.

Revisé la base de datos y **ninguno de los 4 vuelos del presupuesto de Sandra tiene el campo `supplier`**. Esto confirma que el dato no se guardó.

## Solución: Agregar auto-guardado

Para evitar perder cambios, voy a implementar **auto-guardado** que persista el presupuesto automáticamente cada vez que se modifica algo (con un debounce de 2-3 segundos para no saturar la base de datos).

### Cambios

| Archivo | Acción |
|---|---|
| `src/components/quotes/QuoteWizard.tsx` | Agregar auto-save con debounce cada 3 segundos cuando el quote cambia. Mostrar indicador "Guardado" / "Guardando..." |
| `src/contexts/QuotesContext.tsx` | Agregar función `autoSaveQuote` que haga upsert silencioso (sin navegar ni mostrar toast) |

### Detalle técnico
- `useEffect` en QuoteWizard que detecta cambios en `quote` y dispara un `setTimeout` de 3 segundos
- Si el quote ya existe en DB (modo edición), hace un update silencioso
- Si es nuevo, lo crea en DB con status draft
- Indicador visual pequeño en la esquina: "Guardando..." → "Guardado ✓"
- El botón "Guardar" sigue funcionando igual para el guardado final

### Resultado
- Nunca más se pierde un dato por no clickear "Guardar"
- Los proveedores y cualquier otro campo se persisten automáticamente
- Los reportes van a mostrar los datos correctamente una vez que los presupuestos tengan proveedores asignados

