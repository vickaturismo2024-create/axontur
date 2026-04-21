

## Iteración 4 — Bloques 10 + 11

### BLOQUE 10 — Reportes Financieros Operativos
Hoy `Reports.tsx` solo muestra rentabilidad de presupuestos. Sumar análisis del back-office:

1. **Pestaña "Operativo"** en Reports con:
   - Cobranzas vs facturación del mes (de `file_receipts`).
   - Pagos a proveedores del mes (de `file_supplier_payments`).
   - Cuentas por cobrar (saldos clientes >0) y por pagar (saldos proveedores) por moneda.
   - Top 10 clientes por facturación YTD.
   - Top 10 proveedores por gasto YTD (operativo, no analítico).
2. **Filtro de período** (mes actual / trimestre / año / personalizado).
3. **Export a Excel** del reporte operativo.

### BLOQUE 11 — Vuelos / Reservas
1. **Filtros adicionales** en `Reservations.tsx`: por aerolínea, fecha de vuelo (próximos / pasados), con cambios pendientes.
2. **Ordenamiento**: por fecha de vuelo (ascendente por defecto).
3. **Badge "Vuelos próximos"** en dashboard (vuelos en los próximos 7 días).
4. **Vincular vuelos a expediente**: si el `reservation.file_id` existe, mostrar link al file en el listado y en detalle.

### Detalles técnicos

````text
modificados:
  src/pages/Reports.tsx              (nueva pestaña Operativo)
  src/pages/Reservations.tsx         (filtros + sort)
  src/pages/Dashboard.tsx            (widget vuelos próximos)
  src/lib/exportReports.ts           (sheets operativos)

nuevos:
  src/components/reports/OperationalReport.tsx
  src/hooks/useOperationalReport.ts
  src/components/dashboard/UpcomingFlightsWidget.tsx
````

### Verificación
- Pestaña Operativo en Reports muestra cobranzas, pagos y saldos por moneda.
- Filtros de período recalculan totales.
- Export a Excel incluye sheets de cobranzas, pagos, cuentas por cobrar y pagar.
- Reservations.tsx permite filtrar por aerolínea y fecha.
- Dashboard muestra widget de vuelos próximos linkeable a `/reservations/:id`.

