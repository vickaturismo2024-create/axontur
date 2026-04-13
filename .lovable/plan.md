
Diagnóstico confirmado

- El problema ya no está en el guardado del proveedor.
- La sección de proveedores en `/reportes` queda vacía porque `Reports.tsx` solo renderiza datos si `supplierStats.length > 0`.
- Hoy `useSupplierAnalytics()` filtra por moneda y después elimina el presupuesto entero con `hasCompleteCosts()`.
- Esa regla es válida para rentabilidad global, pero es demasiado estricta para proveedores.

Evidencia

- Revisé los datos actuales y hay al menos un presupuesto con proveedores cargados.
- Ese presupuesto tiene 8 servicios con `supplier`, pero solo 3 con valores económicos cargados.
- Por eso no pasa la regla de “al menos 50% de servicios con costo” y desaparece completo del análisis, aunque sí tenga operadores asignados.

Plan

1. Separar “presencia del proveedor” de “rentabilidad”
- Archivo: `src/hooks/useSupplierAnalytics.ts`
- Mantener el filtro por moneda.
- Quitar `hasCompleteCosts()` como filtro global del reporte de proveedores.
- Contar todos los servicios que tengan `supplier`.
- Calcular dinero y margen solo para servicios con datos completos (`cost`/`totalCost` y `price`/`totalPrice` > 0).

2. Hacer el dato más honesto
- Extender `SupplierStat` con un contador tipo `pricedServices`.
- `services` = servicios asignados al proveedor.
- `pricedServices` = servicios que sí entran en costo/venta/margen.
- `margin` y `marginPct` se calculan solo sobre `pricedServices`, para no inflar rentabilidad con faltantes.

3. Corregir la UI de Reportes
- Archivo: `src/pages/Reports.tsx`
- Mostrar estado vacío solo si no existe ningún servicio con proveedor en la moneda seleccionada.
- Si hay proveedores cargados pero faltan netos en parte de los servicios, mostrar una aclaración en vez de dejar la pantalla en blanco.
- Mantener la separación USD/ARS exactamente como está.

4. Ajustar la exportación
- Archivo: `src/lib/exportReports.ts`
- Exportar la nueva lógica.
- Agregar una columna tipo `Servicios valorizados` para que el Excel distinga uso de rentabilidad.

5. Evitar métricas mezcladas fuera de Reportes
- Archivo: `src/pages/Suppliers.tsx`
- Como esa pantalla no tiene selector de moneda, limitar sus chips a métricas no monetarias o esconder el margen allí, dejando la rentabilidad monetaria solo en `/reportes`.

Sin cambios de base de datos

- No hace falta migración ni cambios de permisos.
- El ajuste es 100% de lógica frontend.

Resultado esperado

- Los proveedores vuelven a aparecer en Reportes.
- No se mezclan USD y ARS.
- Los presupuestos incompletos ya no desaparecen completos del análisis.
- La rentabilidad sigue protegida contra netos faltantes.

Detalle técnico

```text
Métricas globales de negocio:
- siguen usando hasCompleteCosts()

Métricas de proveedores:
- visibilidad = servicio con supplier
- montos/margen = solo servicios con cost + price válidos
- moneda = siempre filtrada antes de agregar
```
