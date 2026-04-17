

## Bug: no se puede cancelar un presupuesto aprobado

### Causa raíz
En `src/lib/validations.ts` línea 465, el esquema Zod de `quote` define el status como:
```ts
status: z.enum(['draft', 'sent', 'approved', 'expired']).default('draft')
```

Falta `'cancelled'`. Pero el tipo `QuoteStatus` en `src/types/quote.ts` (línea 364) sí lo incluye, igual que toda la UI (`QuoteCard`, `Dashboard` con la pestaña "Cancelados", botón Reactivar, etc.). Cuando intentás cancelar, el guardado pasa por la validación Zod y rechaza el valor `'cancelled'` con el error que ves.

Es exactamente el patrón ya documentado en memoria (`mem://features/cancelacion-presupuestos-reactivacion`): la cancelación/reactivación está implementada en UI, pero la validación quedó desactualizada.

### Arreglo (1 línea)
En `src/lib/validations.ts`, agregar `'cancelled'` al enum:

```ts
status: z.enum(['draft', 'sent', 'approved', 'expired', 'cancelled']).default('draft'),
```

No hace falta tocar la base de datos: la columna `status` en `quotes` es `text` libre (sin enum de Postgres), así que acepta cualquier string. Tampoco hace falta migración.

### Verificación post-fix
- Cancelar un presupuesto aprobado desde el Dashboard → debe pasar a "Cancelado" y aparecer en la pestaña Cancelados.
- Reactivar el cancelado → debe volver a "Borrador".
- Auto-guardado en el editor de un presupuesto cancelado no debe romper.

