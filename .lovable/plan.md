

# Plan: Alertas de documentos por vencer + Dashboard de rentabilidad por proveedor

## 1. Alertas de documentos por vencer

### En la página de Clientes (`src/pages/Clients.tsx`)
- Agregar un banner/alerta en la parte superior que muestre cuántos clientes tienen documentos por vencer en los próximos 6 meses
- En cada tarjeta de cliente, mostrar badges visuales:
  - **Rojo**: documento vencido
  - **Amarillo**: vence en menos de 6 meses
  - **Verde**: vigente (más de 6 meses)
- Filtro rápido: "Mostrar solo documentos por vencer" para encontrar rápido quién necesita renovar

### En el Dashboard (`src/pages/Dashboard.tsx`)
- Agregar una tarjeta de métricas que muestre "X documentos por vencer" con ícono de alerta
- Clickeable → navega a la página de Clientes con el filtro de documentos activado

### Lógica
- Comparar `dni_expiry`, `passport_expiry` contra la fecha actual
- Categorías: vencido (< hoy), próximo a vencer (< 6 meses), vigente (> 6 meses)
- Solo se evalúan clientes que tengan la fecha cargada (no vacía)

## 2. Dashboard de rentabilidad por proveedor

### Nueva sección en la página de Proveedores (`src/pages/Suppliers.tsx`)
- Agregar una sección colapsable "Análisis de rentabilidad" arriba del listado
- Gráficos con Recharts (ya instalado en el proyecto):
  - **Bar chart**: Top 10 proveedores por volumen facturado (suma de costos de servicios donde aparecen)
  - **Pie chart**: Distribución de uso por proveedor (cantidad de servicios asignados)
  - **Tabla resumen**: Proveedor | Servicios | Costo total | Precio venta total | Margen $ | Margen %

### En cada tarjeta de proveedor
- Mostrar mini-stats: cantidad de presupuestos donde se usa, margen promedio

### Lógica de cálculo
- Recorrer todos los quotes del usuario
- Para cada servicio (vuelos, traslados, trenes, ferries, autos, actividades, cruceros, seguros, alojamientos), buscar el campo `supplier`
- Agrupar por nombre de proveedor y sumar costos/precios
- Cruzar con la tabla `suppliers` para el matching

## Archivos a modificar/crear

| Archivo | Cambio |
|---|---|
| `src/pages/Clients.tsx` | Banner de alertas, badges en tarjetas, filtro de documentos |
| `src/pages/Dashboard.tsx` | Tarjeta de métricas con docs por vencer |
| `src/pages/Suppliers.tsx` | Sección de análisis de rentabilidad con gráficos y stats por tarjeta |
| `src/components/clients/DocumentAlertBadge.tsx` | **Nuevo** — Componente reutilizable para badges de vencimiento |
| `src/hooks/useSupplierAnalytics.ts` | **Nuevo** — Hook que calcula métricas de proveedores a partir de los quotes |

## Orden de implementación
1. `DocumentAlertBadge` + integración en `Clients.tsx`
2. Métrica en `Dashboard.tsx`
3. `useSupplierAnalytics` + sección de análisis en `Suppliers.tsx`

