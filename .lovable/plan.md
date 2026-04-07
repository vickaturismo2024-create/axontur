

# Plan: Fix favoritos y archivados

## Causa raíz

El esquema de validación Zod `quoteSchema` en `src/lib/validations.ts` (línea 436-459) **no incluye** los campos `archived` y `favorited`. Cuando `updateQuote` llama a `validateQuote(quote)` → `quoteSchema.parse(data)`, Zod elimina silenciosamente esos campos porque no están definidos en el esquema. Entonces el valor toggled nunca llega a la base de datos.

## Solución

Agregar los dos campos faltantes al `quoteSchema` en `src/lib/validations.ts`:

```typescript
archived: z.boolean().default(false),
favorited: z.boolean().default(false),
```

Esto se agrega dentro del objeto `quoteSchema`, junto con los demás campos (después de `publicLinkExpiry`).

## Archivo a modificar

1. `src/lib/validations.ts` — Agregar `archived` y `favorited` al `quoteSchema` (2 líneas)

## Impacto

- Ningún otro archivo necesita cambios
- La lógica en Dashboard y QuoteCard ya es correcta
- Los campos ya existen en la tabla de la base de datos

