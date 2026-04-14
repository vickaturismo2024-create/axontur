

# Plan: Agrupar servicios por tipo + proveedor

## Resumen

Modificar `FileServicesTab.tsx` para que los servicios se muestren agrupados por la combinación de `service_type` + `supplier_name`. Cada grupo tendrá una cabecera colapsable con el icono del tipo, nombre del proveedor, cantidad de servicios y subtotales de costo/precio.

## Cambio en `src/components/files/FileServicesTab.tsx`

1. **Agrupar con `useMemo`**: Crear un Map con clave `${service_type}::${supplier_name}` que agrupe los servicios. Ordenar los grupos por tipo y luego por proveedor.

2. **UI con Collapsible**: Cada grupo se renderiza como una Card con cabecera colapsable que muestra:
   - Icono del tipo de servicio
   - Label del tipo + nombre del proveedor (ej: "Alojamiento — TicketYa")
   - Cantidad de servicios en el grupo
   - Subtotal de precio y costo del grupo (por moneda si hay mezcla)
   - Chevron para expandir/colapsar

3. **Contenido expandido**: Dentro de cada grupo, los servicios individuales se listan como están ahora (con sus badges de estado, vencimiento, botones editar/eliminar).

4. **Estado colapsable**: Todos los grupos arrancan expandidos por defecto.

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/files/FileServicesTab.tsx` | Agregar lógica de agrupación y UI colapsable por tipo+proveedor |

No requiere cambios de BD.

