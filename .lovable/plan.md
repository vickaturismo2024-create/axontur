

# Plan: Cuentas Corrientes + Revertir presupuesto aprobado + File automático

## Scope

Implementar todo lo del plan aprobado de Cuentas Corrientes, más:
1. **Automatizar creación de file** al aprobar un presupuesto desde Dashboard
2. **Agregar estado "cancelled"** a QuoteStatus para poder cancelar/revertir presupuestos aprobados
3. **Botón "Crear Expediente"** en QuoteCard para presupuestos aprobados sin file existente

## Cambios

### 1. Base de datos
- Crear tabla `account_movements` con RLS owner-based (ya definida en el plan)
- No se necesita migración para el estado "cancelled" porque `quotes.status` es tipo `text`

### 2. Revertir presupuesto aprobado

| Archivo | Cambio |
|---------|--------|
| `src/types/quote.ts` | Agregar `'cancelled'` a `QuoteStatus` |
| `src/components/quotes/QuoteCard.tsx` | Agregar config para estado `cancelled`, mostrar botón "Cancelar" en quotes aprobados que cambia estado a `cancelled`, y botón "Reactivar" en quotes cancelados que vuelve a `draft`. Agregar botón "Crear Expediente" para aprobados sin file. |
| `src/pages/Dashboard.tsx` | En `handleStatusChange`, cuando status pasa a `approved`, crear file automáticamente con toast y link |

### 3. Función utilitaria para crear file

| Archivo | Cambio |
|---------|--------|
| `src/lib/fileFromQuote.ts` (nuevo) | Extraer lógica de `CreateFileFromQuote` a función reutilizable `createFileFromQuote(quote, userId)` |
| `src/components/files/CreateFileFromQuote.tsx` | Refactorizar para usar la función utilitaria |

### 4. Cuentas Corrientes (plan aprobado)

| Archivo | Cambio |
|---------|--------|
| `src/pages/Accounts.tsx` | Reescribir con lógica real: tabs Clientes/Proveedores, saldos calculados, búsqueda |
| `src/components/accounts/AccountDetail.tsx` | Reescribir con lógica real: historial de movimientos con saldo progresivo |
| `src/components/accounts/NewMovementDialog.tsx` | Reescribir con formulario funcional |
| `src/components/files/FileReceiptsTab.tsx` | Al crear recibo, insertar movimiento de crédito automático en cuenta del cliente |
| `src/App.tsx` | Verificar ruta `/accounts` (ya existe) |
| `src/components/layout/Header.tsx` | Verificar "Cuentas Ctes." en menú (ya existe) |

### 5. Flujo de cancelación

- Quote aprobado muestra botón "Cancelar" (con confirmación AlertDialog)
- Al cancelar: estado pasa a `cancelled`, se muestra badge rojo "Cancelado"
- Quote cancelado muestra botón "Reactivar" que lo vuelve a `draft`
- El file asociado NO se elimina automáticamente (queda como registro)

