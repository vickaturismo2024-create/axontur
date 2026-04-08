

# Plan: Import sin límite + deduplicación + vinculación cliente-presupuesto

## Problema 1: Límite de 1000 clientes en importación
Supabase tiene un límite de 1000 filas por request. La importación actual hace un solo `insert` con todos los registros.

**Solución**: Procesar en lotes de 500 con progreso visual.

## Problema 2: Clientes duplicados al reimportar
No hay detección de duplicados. Al reimportar el mismo Excel se crean copias.

**Solución**: Antes de insertar, consultar clientes existentes del usuario y comparar por DNI (campo más confiable como identificador único). Si el DNI ya existe, saltar ese registro. Mostrar en el preview cuántos son nuevos vs existentes.

## Problema 3: Ver presupuestos de un cliente y viceversa
Actualmente el card del cliente solo muestra "X presupuesto(s)" como texto. No hay link ni detalle. En el dashboard de presupuestos no hay forma de filtrar por cliente.

**Solución**:
- En la tarjeta del cliente: hacer clickeable el contador de presupuestos → abrir un dialog/panel con la lista de presupuestos asociados (matched por nombre o email del cliente). Cada item es clickeable y navega al editor.
- En el Dashboard: agregar un filtro de cliente en `DashboardFilters` para filtrar presupuestos por nombre de cliente.

## Cambios por archivo

### 1. `src/pages/Clients.tsx`
- Modificar `handleBulkImport` para procesar en lotes de 500 con deduplicación por DNI
- Agregar estado de progreso durante importación
- Al clickear presupuestos de un cliente → abrir dialog con lista de quotes asociados
- Usar `fetchClients` con paginación (múltiples requests de 1000 usando `.range()`) para no perder clientes existentes

### 2. `src/components/clients/ImportExcelDialog.tsx`
- Mostrar en el preview cuántos clientes son nuevos vs ya existentes (comparando DNI contra BD)
- Barra de progreso durante importación por lotes

### 3. `src/components/dashboard/DashboardFilters.tsx`
- Agregar filtro por nombre de cliente

### 4. `src/pages/Dashboard.tsx`
- Aplicar filtro de cliente al listado de presupuestos

## Detalle técnico

### Fetch sin límite de 1000
```typescript
// Paginar el SELECT de clientes existentes
let allClients = [];
let from = 0;
const PAGE = 1000;
while (true) {
  const { data } = await supabase.from('clients').select('*').range(from, from + PAGE - 1);
  allClients.push(...(data || []));
  if (!data || data.length < PAGE) break;
  from += PAGE;
}
```

### Import por lotes con deduplicación
```typescript
// 1. Obtener DNIs existentes del usuario
// 2. Filtrar rows del Excel: solo los que no tienen DNI coincidente
// 3. Insertar en lotes de 500
// 4. Mostrar: "X nuevos importados, Y ya existían"
```

### Vinculación cliente ↔ presupuesto
Match por `quote.client.name === client.name` o `quote.client.email === client.email` (ya existe en `getQuoteCount`, se expande para mostrar la lista completa).

