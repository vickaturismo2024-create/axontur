

# Ideas de mejoras y nuevas funcionalidades

## Prioridad Alta

### 1. Historial de versiones del presupuesto
Cada vez que se guarda un presupuesto, guardar una "snapshot" con fecha. Permite al usuario ver versiones anteriores y restaurar una si el cliente pide volver a una propuesta previa.
- Nueva tabla `quote_versions` (quote_id, version_number, data JSON, created_at)
- Botón "Ver historial" en el editor con lista de versiones y opción de restaurar

### 2. Búsqueda y filtrado avanzado en Dashboard
Agregar filtros por: rango de fechas, destino, rango de precio, moneda. Ordenar por fecha, precio, nombre de cliente. Actualmente solo hay búsqueda por texto y filtro por estado.
- Agregar un panel colapsable de filtros avanzados en `Dashboard.tsx`

### 3. Exportar presupuesto como PDF descargable (real)
Actualmente se usa `window.print()`. Implementar generación real de PDF con una librería (html2pdf o jsPDF + html2canvas) para generar un archivo .pdf descargable directamente.
- Agregar botón "Descargar PDF" en `PDFShareMenu`
- Usar html2canvas + jsPDF para capturar las páginas del PDF y generar el archivo

## Prioridad Media

### 4. Presupuestos favoritos / archivados
Agregar la posibilidad de archivar presupuestos viejos para no saturar el dashboard, y marcar algunos como favoritos para acceso rápido.
- Nuevos campos `archived` y `favorited` en el quote
- Tabs o filtros en dashboard: Activos / Archivados / Favoritos

### 5. Duplicar plantilla
Permitir duplicar una plantilla existente para crear variaciones sin modificar la original.
- Botón "Duplicar" en la página de Templates
- Lógica similar a `duplicateQuote` pero para templates

### 6. Notificaciones por email al compartir
Cuando se comparte un link público, opcionalmente enviar un email al cliente con el enlace.
- Edge function que envíe email usando Resend o similar
- Campo de email del cliente ya existe en el presupuesto

## Prioridad Baja

### 7. Modo oscuro
Agregar toggle para cambiar entre tema claro y oscuro. La app usa Tailwind con variables CSS, así que la base ya está preparada.

### 8. Dashboard con gráficos
Agregar charts visuales: presupuestos por mes, distribución por destino, evolución del margen. Usar Recharts (ya compatible con shadcn).

---

## Resumen

| # | Funcionalidad | Complejidad | Impacto |
|---|--------------|-------------|---------|
| 1 | Historial de versiones | Media | Alto |
| 2 | Filtros avanzados | Baja | Alto |
| 3 | PDF descargable real | Media | Alto |
| 4 | Archivar / Favoritos | Baja | Medio |
| 5 | Duplicar plantilla | Baja | Medio |
| 6 | Email al compartir | Media | Medio |
| 7 | Modo oscuro | Baja | Bajo |
| 8 | Gráficos en dashboard | Media | Medio |

¿Cuáles te gustaría implementar?

