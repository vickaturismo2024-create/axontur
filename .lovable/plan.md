

# Plan: Paquete de mejoras y nuevas funcionalidades

Propongo implementar las funcionalidades en 3 fases, de menor a mayor complejidad.

---

## Fase 1 — Exportar reportes + Notas internas por cliente

### 1A. Exportar página de Reportes a Excel
- Agregar botón "Exportar a Excel" en `src/pages/Reports.tsx`
- Generar un archivo .xlsx con las mismas tablas/datos que se ven en pantalla:
  - Hoja 1: Resumen general (presupuestos por mes, por estado, por destino)
  - Hoja 2: Rentabilidad por proveedor (la tabla que ya existe)
- Usar la librería `xlsx` que ya está instalada en el proyecto

### 1B. Notas internas por cliente (mini CRM)
- Crear tabla `client_notes` en la base de datos con campos: `id`, `client_id`, `user_id`, `content`, `created_at`
- RLS: cada usuario solo ve sus propias notas
- En la ficha del cliente (dentro de `Clients.tsx` o un dialog de detalle), agregar una sección con historial de notas y un input para agregar nuevas
- Las notas se muestran en orden cronológico inverso

---

## Fase 2 — Comparador de presupuestos

### Comparador lado a lado
- Agregar botón "Comparar" en el Dashboard (selección de 2 quotes via checkboxes)
- Crear componente `QuoteComparator` que muestre ambos presupuestos en columnas paralelas:
  - Datos del viaje (destino, fechas, viajeros)
  - Desglose por categoría (vuelos, alojamiento, traslados, etc.)
  - Totales: costo, precio, margen
  - Diferencias resaltadas en color
- Se abre como un Dialog fullscreen o una página dedicada `/comparar`

---

## Fase 3 — Notificaciones por email

### Alertas automáticas
- Configurar dominio de email para el proyecto
- Crear templates de email para:
  - Presupuesto aprobado por el cliente
  - Documento de cliente por vencer (DNI/pasaporte en los próximos 30 días)
- Trigger en el flujo de aprobación (`approve-quote` edge function) para enviar email al agente
- Cron job o trigger periódico para revisar documentos por vencer y notificar

---

## Ideas adicionales para considerar después

1. **Duplicar presupuesto para otro cliente** — Clonar un presupuesto cambiando solo los datos del cliente
2. **Dashboard de cobros** — Vista de pagos pendientes vs cobrados, con filtros por fecha y estado
3. **Etiquetas/tags en presupuestos** — Clasificar con tags personalizados (luna de miel, corporativo, grupo, etc.)
4. **Búsqueda global** — Barra de búsqueda unificada que busque en clientes, presupuestos y proveedores
5. **Historial de cambios** — Timeline visual de modificaciones en cada presupuesto
6. **Multi-moneda en reportes** — Convertir todas las monedas a una base para consolidar métricas

---

## Archivos principales a crear/modificar

| Archivo | Acción |
|---|---|
| `src/pages/Reports.tsx` | Agregar botón exportar Excel |
| `src/pages/Clients.tsx` | Sección de notas internas |
| `src/pages/Dashboard.tsx` | Selección para comparador |
| `src/components/quotes/QuoteComparator.tsx` | **Nuevo** — Comparador lado a lado |
| `src/components/clients/ClientNotes.tsx` | **Nuevo** — Componente de notas |
| Migración DB | Tabla `client_notes` |
| Edge functions + templates | Notificaciones por email |

## Orden sugerido
Empezaría por la **Fase 1** (exportar reportes + notas por cliente) ya que son cambios acotados y de alto valor. ¿Empezamos?

