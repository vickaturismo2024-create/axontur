

# Plan: Eliminar límite de 1000 registros en todos los listados de clientes

## Problema

Supabase tiene un límite por defecto de 1000 filas por query. Varios componentes cargan clientes sin paginación, lo que causa que no se muestren todos los clientes cuando hay más de 1000.

## Componentes afectados

Los siguientes archivos hacen un solo `select` sin paginación ni loop:

| Archivo | Uso |
|---------|-----|
| `src/components/quotes/ClientSelect.tsx` | Selector de clientes en presupuestos |
| `src/components/quotes/DuplicateForClientDialog.tsx` | Duplicar presupuesto para otro cliente |
| `src/components/layout/GlobalSearch.tsx` | Búsqueda global (CMD+K) |
| `src/pages/Accounts.tsx` | Selector de cuentas contables |

Los que YA paginan correctamente (no se tocan): `Clients.tsx`, `FilePassengersTab.tsx`, `Dashboard.tsx`.

## Solución

Aplicar el mismo patrón de paginación que ya usa `Clients.tsx` en todos los componentes afectados:

```typescript
const PAGE = 1000;
let from = 0;
let all = [];
while (true) {
  const { data } = await supabase
    .from('clients')
    .select('...')
    .order('name')
    .range(from, from + PAGE - 1);
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}
```

Esto se aplica a cada uno de los 4 archivos, manteniendo los campos que cada uno ya selecciona.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/quotes/ClientSelect.tsx` | Loop de paginación en el fetch de clientes |
| `src/components/quotes/DuplicateForClientDialog.tsx` | Loop de paginación en el fetch de clientes |
| `src/components/layout/GlobalSearch.tsx` | Loop de paginación en el fetch de clientes (y suppliers) |
| `src/pages/Accounts.tsx` | Loop de paginación en el fetch de clientes (y suppliers) |

No requiere cambios de BD.

