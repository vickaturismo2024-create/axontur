

# Fix: Error al guardar presupuesto (clave duplicada)

## Problema encontrado

Al crear un presupuesto nuevo, el **auto-save** (que usa `upsert`) ya inserta el registro en la base de datos después de 3 segundos. Cuando el usuario hace click en **"Guardar presupuesto"**, la función `addQuote` intenta hacer un `INSERT` con el mismo ID, causando el error **"duplicate key value violates unique constraint"**.

El error en la base de datos confirma: `duplicate key value violates unique constraint "quotes_pkey"`.

## Solución

Cambiar `addQuote` en `QuotesContext.tsx` para usar `.upsert()` en lugar de `.insert()`. Así, si el auto-save ya creó el registro, el guardado final simplemente lo actualiza en vez de fallar.

## Cambios

| Archivo | Cambio |
|---|---|
| `src/contexts/QuotesContext.tsx` | Línea 241: cambiar `.insert([dbQuote])` → `.upsert([dbQuote])` |

Un cambio de una sola palabra que resuelve el conflicto entre auto-save y guardado manual.

