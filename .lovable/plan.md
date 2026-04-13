

# Plan: Módulos de Expedientes/Files y Cuentas Corrientes

## Visión General

Transformar el sistema de presupuestos en un sistema operativo completo, comenzando por los dos módulos más críticos: **Expedientes (Files/Reservas)** y **Cuentas Corrientes**. Luego se continuará con Caja Diaria y Comisiones en fases posteriores.

---

## Fase 1: Expedientes / Files

Un expediente (file) es la **reserva operativa** que nace cuando un presupuesto se aprueba. Contiene toda la información del viaje más datos operativos adicionales.

### Tablas nuevas

| Tabla | Campos clave |
|-------|-------------|
| `files` | id, user_id, quote_id (ref), file_number (autoincremental por usuario), status (confirmed/in_progress/completed/cancelled), client_name, client_id, destination, start_date, end_date, travelers, currency, total_price, total_cost, internal_notes, created_at, updated_at |
| `file_services` | id, file_id, service_type (flight/lodging/transfer/etc), description, supplier_id, supplier_name, status (pending/confirmed/cancelled), confirmation_number, cost, price, currency, service_date, notes |
| `file_passengers` | id, file_id, client_id, name, dni, passport, passport_expiry, birth_date, nationality, notes |
| `file_receipts` | id, file_id, user_id, receipt_number, client_name, amount, currency, payment_method, payment_date, concept, notes, created_at |

### Funcionalidades

- **Conversión automática**: botón "Crear Expediente" en presupuestos aprobados que genera el file con todos los datos del quote
- **Numeración automática**: número de file incremental por usuario (FILE-001, FILE-002...)
- **Gestión de servicios**: listar/editar servicios del file con estado de confirmación y número de reserva del proveedor
- **Pasajeros**: cargar pasajeros desde el CRM de clientes existente
- **Recibos**: generar recibos PDF para el cliente con datos de la agencia, monto, concepto y fecha
- **Estados**: confirmed → in_progress → completed / cancelled
- **Vista principal**: nueva página `/files` con listado, filtros por estado/fecha/cliente

### Páginas y componentes nuevos

- `src/pages/Files.tsx` — listado de expedientes con filtros
- `src/pages/FileDetail.tsx` — detalle de un expediente con tabs (servicios, pasajeros, pagos, recibos)
- `src/components/files/FileServicesTab.tsx`
- `src/components/files/FilePassengersTab.tsx`
- `src/components/files/FileReceiptsTab.tsx`
- `src/components/files/CreateFileFromQuote.tsx`
- `src/components/files/ReceiptPDF.tsx` — generación de recibo en PDF

---

## Fase 2: Cuentas Corrientes

Sistema de cuentas corrientes para clientes y proveedores, con movimientos de ingreso y egreso.

### Tablas nuevas

| Tabla | Campos clave |
|-------|-------------|
| `account_movements` | id, user_id, account_type (client/supplier), account_id (client_id o supplier_id), file_id (opcional), payment_id (opcional), movement_type (credit/debit), amount, currency, concept, reference, movement_date, notes, created_at |

### Funcionalidades

- **Saldo por cuenta**: vista de saldo actual por cliente o proveedor (suma de créditos - débitos)
- **Movimientos automáticos**: al registrar un pago en un file, se genera automáticamente un movimiento de crédito en la cuenta del cliente
- **Movimientos manuales**: agregar movimientos manualmente (adelantos, ajustes, notas de crédito)
- **Vista de cuenta**: historial de movimientos con saldo progresivo
- **Resumen**: vista general con todos los clientes/proveedores y sus saldos

### Páginas y componentes nuevos

- `src/pages/Accounts.tsx` — listado de cuentas con saldos
- `src/components/accounts/AccountDetail.tsx` — movimientos de una cuenta
- `src/components/accounts/NewMovementDialog.tsx`

---

## Navegación

Se agregan dos nuevos items al menú:
- **Expedientes** → `/files`
- **Cuentas Ctes.** → `/accounts`

---

## Cambios en archivos existentes

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Agregar rutas `/files`, `/files/:id`, `/accounts` |
| `src/components/layout/Header.tsx` | Agregar "Expedientes" y "Cuentas Ctes." al menú |
| `src/pages/QuoteEditor.tsx` | Agregar botón "Crear Expediente" para quotes aprobados |
| `src/components/quotes/PaymentsSection.tsx` | Al registrar pago, generar movimiento en cuenta corriente |

---

## Scope de esta implementación

Dada la magnitud, se implementará en **dos entregas**:

**Entrega 1** (esta): Expedientes completo con servicios, pasajeros, recibos PDF y navegación
**Entrega 2** (siguiente): Cuentas Corrientes con movimientos automáticos y manuales

Caja Diaria, Comisiones, Emails Automáticos, Multisucursal y Portal Cliente quedan para fases futuras.

---

## Base de datos

Se crean 4 tablas nuevas con RLS policies owner-based (user_id = auth.uid()) para todas las operaciones CRUD, siguiendo el patrón existente del proyecto.

