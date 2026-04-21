

## Plan: Iteración 2 — Bloques 7 + 8 (Performance, UX y Workflow de Expedientes)

### BLOQUE 7 — Performance & UX

**1. React Query en listados grandes**
Migrar a `useQuery` los fetch manuales de:
- `Clients.tsx`
- `Files.tsx`
- `Suppliers.tsx`
- `Accounts.tsx` (clientes + proveedores + movimientos)
- `Reservations.tsx`

Beneficio: cache automática, menos refetch al cambiar de pestaña, refetch sólo cuando los datos cambian.

**2. Skeletons de carga**
Reemplazar los textos "Cargando..." por componentes `<Skeleton />` de shadcn en:
- Listas (`Clients`, `Files`, `Suppliers`, `Accounts`, `Reservations`).
- Detalle de expediente (`FileDetail` mientras carga).
- Dashboard (widgets).

**3. Paginación / virtualización ligera**
- Agregar buscador + paginación visible (50 por página, con botones Anterior/Siguiente) en `Clients`, `Files`, `Suppliers`, `Reservations`. Mantenemos el patrón `.range()` ya documentado en memoria para >1000 registros.
- Recibos dentro de un expediente: mostrar últimos 20 por defecto + botón "Ver todos".

**4. Optimización de re-renders**
- `useMemo` en cálculos pesados de `AccountDetail` (saldos progresivos), `FileFinancialSummary` y `Reports`.
- `React.memo` en filas de listas largas.

### BLOQUE 8 — Workflow de Expedientes

**1. Estados del expediente**
Migración para agregar a `files.status` los valores: `confirmed`, `in_progress`, `completed`, `cancelled` (hoy sólo `confirmed`). Trigger de validación.
- Selector de estado en `FileDetail` con badge de color.
- Filtro por estado en `Files.tsx`.
- Auto-sugerencia: si `end_date < today`, ofrecer marcar como `completed`.

**2. Dashboard de alertas operativas**
Nuevo widget en `Dashboard.tsx` "Alertas operativas" que agrupa:
- Servicios con `payment_due_date` vencido o en <3 días (ya existe la lógica, sólo se muestra acá).
- Documentos de clientes próximos a vencer (DNI/Pasaporte <6 meses).
- Expedientes con viajes terminados sin marcar como `completed`.
- Recibos en `draft` con más de 7 días.

Cada alerta es clickeable y navega al recurso.

**3. Tab "Comunicaciones" en FileDetail**
Lee de `email_logs` filtrado por `file_id` y muestra:
- Fecha, destinatario, asunto, plantilla usada, estado.
- Botón "Reenviar" que dispara nuevamente `sendEmail()`.

**4. Exportar pasajeros a Excel**
Botón en `FilePassengersTab` y en `Reservations` que genera Excel con: nombre, DNI, pasaporte, vencimiento pasaporte, fecha nacimiento, nacionalidad, notas. Reutiliza `xlsx` ya instalado.

**5. Notas internas mejoradas en FileDetail**
- Editor multilínea con autoguardado (debounce 1s, ya hay patrón en quotes).
- Marca de tiempo y "última edición".

### Lo que NO entra en esta iteración

Bloque 3 avanzado (filtros + extractos PDF/Excel de cuentas corrientes), Bloque 6 (settings de email), Bloque 9 (mejoras de proveedores), y verificación de dominio de email.

### Detalles técnicos

````text
modificados:
  src/pages/Clients.tsx                    (useQuery + skeleton + paginación)
  src/pages/Files.tsx                      (useQuery + skeleton + paginación + filtro estado)
  src/pages/Suppliers.tsx                  (useQuery + skeleton + paginación)
  src/pages/Accounts.tsx                   (useQuery + skeleton)
  src/pages/Reservations.tsx               (useQuery + skeleton + paginación)
  src/pages/FileDetail.tsx                 (selector de estado + tab Comunicaciones + notas)
  src/pages/Dashboard.tsx                  (widget Alertas operativas)
  src/components/files/FilePassengersTab.tsx  (botón Exportar Excel)
  src/components/files/FileFinancialSummary.tsx (useMemo)
  src/components/accounts/AccountDetail.tsx     (useMemo)

nuevos:
  src/components/files/FileCommunicationsTab.tsx
  src/components/dashboard/OperationalAlertsWidget.tsx
  src/lib/exportPassengersExcel.ts

migración:
  files.status → permitir 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  trigger validate_file_status
````

### Verificación

- Cambiar de pestaña en Clientes/Expedientes ya no dispara refetch innecesario.
- Skeletons aparecen en lugar de "Cargando..." mientras se traen datos.
- Paginación funciona en listas largas, mantiene buscador.
- Cambio de estado en expediente refleja badge y filtra en listado.
- Dashboard muestra alertas agrupadas y clickeables.
- Tab Comunicaciones lista emails enviados desde el expediente.
- Botón Exportar Pasajeros descarga Excel con columnas correctas.
- Notas internas se autoguardan sin recargar página.

