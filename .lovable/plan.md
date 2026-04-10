

# Plan: Mover gráficos del Dashboard a Reportes

## Resumen
Eliminar los gráficos (`DashboardCharts`) del Dashboard y moverlos a la página de Reportes, donde ya están los gráficos de proveedores. El Dashboard queda más limpio, solo con las métricas y el panel de recordatorios.

## Cambios

### 1. `src/pages/Reports.tsx`
- Importar `DashboardCharts` y pasarle los quotes del contexto
- Agregar una sección "Análisis general" arriba de la sección de proveedores, con los 7 gráficos existentes (presupuestos por mes, destinos, margen, ingresos vs costos, estados, top clientes, margen por destino)

### 2. `src/pages/Dashboard.tsx`
- Eliminar import de `DashboardCharts`
- Eliminar el bloque grid de Charts + Reminders (líneas 277-285)
- Mantener `RemindersPanel` pero reubicarlo (por ejemplo arriba de los tabs de filtros, o como sidebar)

### 3. Reorganización del layout en Dashboard
- El `RemindersPanel` que estaba al lado de los gráficos pasa a ocupar un ancho completo o se coloca en otro lugar lógico (arriba de los quotes, ancho completo)

## Archivos
| Archivo | Cambio |
|---|---|
| `src/pages/Reports.tsx` | Agregar sección con `DashboardCharts` |
| `src/pages/Dashboard.tsx` | Eliminar gráficos, reubicar RemindersPanel |

