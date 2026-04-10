

# Plan: Página separada de Reportes

## Resumen
Mover los gráficos de proveedores a una nueva página `/reportes` y limpiar la página de Proveedores para que solo tenga el directorio. La nueva página queda preparada para agregar más análisis en el futuro.

## Cambios

### 1. Crear `src/pages/Reports.tsx`
- Nueva página con Header y título "Reportes"
- Mover toda la sección de análisis de rentabilidad (bar chart, pie chart, tabla resumen) desde `Suppliers.tsx`
- Usar el hook `useSupplierAnalytics` existente
- Estructura con secciones para futura expansión (ej: análisis de clientes, destinos)

### 2. Limpiar `src/pages/Suppliers.tsx`
- Eliminar el Collapsible de analytics, los imports de Recharts, y el estado `analyticsOpen`
- Mantener los mini-stats (badges) en las tarjetas de proveedores ya que son informativos y no molestos
- Agregar un botón/link "Ver reportes" que lleve a `/reportes`

### 3. Agregar ruta en `src/App.tsx`
- Nueva ruta protegida `/reportes` → `<Reports />`

### 4. Agregar al menú en `src/components/layout/Header.tsx`
- Agregar "Reportes" al array `navItems` con href `/reportes`

## Archivos
| Archivo | Acción |
|---|---|
| `src/pages/Reports.tsx` | **Nuevo** |
| `src/pages/Suppliers.tsx` | Eliminar sección de gráficos |
| `src/App.tsx` | Agregar ruta `/reportes` |
| `src/components/layout/Header.tsx` | Agregar link "Reportes" al nav |

