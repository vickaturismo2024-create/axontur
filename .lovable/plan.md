

# Plan: Entrega 2 — Cuentas Corrientes

## Resumen

Sistema de cuentas corrientes para clientes y proveedores con movimientos automáticos (al registrar pagos/recibos en files) y manuales, vista de saldos y detalle de movimientos.

---

## Base de datos

### Nueva tabla: `account_movements`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | |
| user_id | uuid NOT NULL | Owner (RLS) |
| account_type | text NOT NULL | 'client' o 'supplier' |
| account_id | uuid NOT NULL | ID del cliente o proveedor |
| file_id | uuid NULL | Referencia opcional al file |
| movement_type | text NOT NULL | 'credit' o 'debit' |
| amount | numeric NOT NULL DEFAULT 0 | |
| currency | text NOT NULL DEFAULT 'USD' | |
| concept | text NOT NULL DEFAULT '' | |
| reference | text NULL | Número de recibo, etc. |
| movement_date | date NOT NULL DEFAULT CURRENT_DATE | |
| notes | text NULL | |
| created_at | timestamptz DEFAULT now() | |

RLS: owner-based (user_id = auth.uid()) para SELECT, INSERT, UPDATE, DELETE.

---

## Páginas y componentes nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/pages/Accounts.tsx` | Listado de cuentas (clientes y proveedores) con saldo calculado, filtros por tipo y búsqueda |
| `src/components/accounts/AccountDetail.tsx` | Dialog/panel con historial de movimientos de una cuenta, saldo progresivo |
| `src/components/accounts/NewMovementDialog.tsx` | Formulario para agregar movimientos manuales (adelantos, ajustes, notas de crédito) |

---

## Movimientos automáticos

| Archivo | Cambio |
|---------|--------|
| `src/components/files/FileReceiptsTab.tsx` | Al crear un recibo, insertar automáticamente un movimiento de crédito en la cuenta del cliente del file |
| `src/components/quotes/PaymentsSection.tsx` | Al registrar un pago confirmado, generar movimiento en cuenta del cliente del quote |

---

## Navegación

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/Header.tsx` | Agregar "Cuentas Ctes." al menú después de "Expedientes" |
| `src/App.tsx` | Agregar ruta `/accounts` |

---

## Vista de cuentas

La página `/accounts` mostrará:
- Tabs: Clientes / Proveedores
- Lista de todos los clientes/proveedores con su saldo actual (suma de créditos - débitos)
- Búsqueda por nombre
- Click en una cuenta abre el detalle con movimientos ordenados por fecha y saldo progresivo
- Botón para agregar movimiento manual

---

## Scope

Solo Cuentas Corrientes. Caja Diaria y Comisiones quedan para la siguiente entrega.

