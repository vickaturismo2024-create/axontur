

# Plan: Expandir tutoriales con funcionalidades faltantes

## Secciones nuevas a agregar

| # | Sección | Icono | Contenido clave |
|---|---------|-------|-----------------|
| 1 | Gestión de clientes (CRM) | Users | Crear/editar clientes, documentos (DNI/pasaporte con alertas de vencimiento), grupos, importar desde Excel, notas |
| 2 | Proveedores | Store | Crear proveedores, asignar a servicios, ver métricas de uso en reportes |
| 3 | Seguros | ShieldCheck | Configurar compañía, plan, cobertura y precio del seguro de viaje |
| 4 | Pagos y cobranzas | CreditCard | Registrar pagos parciales, métodos de pago, seguimiento del saldo pendiente |
| 5 | Dashboard y filtros | LayoutDashboard | Estados de presupuesto (borrador/enviado/aprobado/archivado), filtros por fecha/estado/tag/favoritos, etiquetas de color |
| 6 | Calendario de viajes | CalendarDays | Vista mensual de viajes aprobados, solo muestra viajes en curso y futuros |
| 7 | Reportes y rentabilidad | BarChart3 | Gráficos de ventas, rentabilidad por proveedor, filtro por moneda USD/ARS, exportar a Excel |
| 8 | Datos de agencia | Building2 | Configurar nombre, logo, teléfono, CUIT, dirección — datos que aparecen en el PDF |
| 9 | Herramientas avanzadas | Wrench | Importar desde URL, parser de PNR, duplicar para otro cliente, comparador de presupuestos, historial de versiones, búsqueda global, recordatorios |

## Expansión de secciones existentes

Cada sección existente se amplía con más detalle y tips adicionales:

- **Primeros pasos**: Agregar explicación de estados, búsqueda global, recordatorios
- **Datos del cliente**: Mencionar el selector de cliente desde CRM
- **Vuelos**: Agregar detalle sobre PNR parser y opciones de grupo
- **Alojamientos**: Mencionar asignación de proveedor
- **Transportes**: Agregar detalle de cada subtipo
- **Cruceros y Actividades**: Expandir con extras de crucero y detalle de actividades
- **Sistema de precios**: Agregar mención de monedas USD/ARS y pagos
- **Ocupaciones**: Expandir con ejemplo de cálculo
- **Opciones de vuelo**: Más detalle sobre cómo funciona el agrupamiento
- **Plantillas**: Mencionar plantillas presets
- **Vista previa y PDF**: Agregar aprobación por link, link público
- **Tips**: Agregar tips sobre proveedores, pagos y reportes

## Cambio en el Accordion

Usar `defaultValue` con todos los `value` para que el accordion arranque completamente abierto.

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Tutorials.tsx` | Agregar 9 nuevas secciones, expandir las 12 existentes, abrir todo por defecto |

No se necesitan nuevos componentes de demo ni cambios de base de datos.

