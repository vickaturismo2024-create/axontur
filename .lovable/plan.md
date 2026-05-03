# Optimización Mobile — AxonTur

Foco principal (según tu respuesta): **tablas que no entran / scroll horizontal**, además de revisión general del Dashboard, Wizard y listados.

## Patrón base que vamos a aplicar

Para cada tabla larga, usar el mismo patrón ya validado en otras partes de la app:

```text
Desktop (md+)          Mobile (<md)
┌───────────────┐      ┌──────────────┐
│ tabla normal  │      │ Card apilada │
│ con columnas  │  →   │ label: valor │
└───────────────┘      │ acciones     │
                       └──────────────┘
```

Implementación: el mismo componente renderiza `<table className="hidden md:table">` + bloque `<div className="md:hidden space-y-2">` con tarjetas (`Card` shadcn).

## 1. Listados (prioridad alta)

- **Pagos / Reportes** (`src/pages/Reports.tsx`, `src/components/reports/ExchangeRatesReport.tsx`): hoy `overflow-x-auto`. Convertir a vista dual tabla/cards. En mobile, una card por fila con: fecha, cliente/proveedor, monto, moneda, badge de estado.
- **Cuentas Corrientes** (`src/components/accounts/AccountDetail.tsx`): movimientos en cards con fecha + descripción arriba, monto a la derecha, saldo abajo.
- **Expedientes / FileDetail tabs** (`FileReceiptsTab`, `FileSuppliersTab`, `FileCommunicationsTab`): tablas → cards. Recibos: nro + fecha + total destacado; servicios por proveedor agrupados con total pagado/pendiente.
- **Pricing del Wizard** (`src/components/quotes/PricingSection.tsx`): tabla de servicios → cards verticales con label arriba y valor grande, totales sticky al pie.
- **Clientes / Suppliers / Files** (listados ya en grid): ajustar a `grid-cols-1` puro en mobile, reducir padding interno y mejorar jerarquía (nombre grande, metadata chica).

## 2. Dashboard (widgets)

- `BirthdayWidget`, `OperationalAlertsWidget`, `UpcomingFlightsWidget`, `RemindersPanel`: en mobile reducir `p-6` → `p-4`, títulos `text-base`, items con `truncate` y badges más chicos. Acciones (WhatsApp, ver) como íconos en mobile en vez de botones con texto.
- `DashboardCharts`: forzar altura menor (`h-48`) y leyenda debajo en `<sm`.
- `CurrencyRatesWidget`: scroll horizontal interno reemplazado por grid de 2 columnas.

## 3. Wizard de presupuestos

- Steps con formularios largos (`LodgingStep`, `FlightsStep`, `ActivitiesStep`, `CruiseStep`, `TransportStep`): unificar a 1 columna en mobile (`grid-cols-1 md:grid-cols-2`), inputs `h-11` para target táctil y labels arriba.
- Stepper superior: en mobile mostrar solo el step actual + contador "3 de 8" y flechas, en lugar de toda la barra.
- Barra inferior de acciones (Anterior/Siguiente/Guardar) sticky al `bottom-0` en mobile con safe-area.

## 4. Header / Navegación

- Botón User y Theme ya están ocultos en mobile (`hidden md:inline-flex`) — mover a dentro del Sheet menú lateral (ya están parcialmente). Asegurar que el header en mobile no pase de ~56px de alto.
- `InfraHealthDot` solo visible si hay problema, para no competir con el nombre de agencia.

## 5. Utilidades transversales

- Crear hook `useIsMobile` ya existe → asegurar uso consistente.
- Aumentar tap targets globales: botones `size="sm"` en mobile pasan a `h-10` mínimo.
- Padding del `container`: `px-3` en mobile en lugar de `px-4`.

## Detalles técnicos

- Sin cambios de schema ni de backend.
- No tocamos `client.ts`, `types.ts` ni archivos auto-generados.
- Reutilizamos `Card`, `Badge`, `Button`, `Sheet` de shadcn.
- Breakpoint principal: `md` (768px) usando Tailwind.
- Los componentes PDF mantienen su layout (ya tienen su propia optimización mobile vía `pdf-page-mobile`).

## Entregable

Una serie de ediciones quirúrgicas en los archivos listados, sin nuevas dependencias. Al terminar vas a poder usar la app cómodamente desde el celular sin scroll horizontal en ninguna tabla y con widgets más densos en información útil.
