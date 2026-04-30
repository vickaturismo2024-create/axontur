## Fase B — Restricciones por rol (Admin / Vendedor)

### Objetivo
Que el rol `vendedor` pueda operar el día a día (cargar presupuestos, clientes, expedientes, recibos) pero **no pueda tocar lo financiero sensible ni la configuración de la agencia**. El `admin` mantiene control total.

---

### Matriz de permisos

| Área | Vendedor | Admin |
|---|---|---|
| **Presupuestos** (crear, editar, duplicar, aprobar, PDF) | ✅ | ✅ |
| Eliminar presupuestos | ❌ | ✅ |
| **Clientes** (crear, editar, notas, importar) | ✅ | ✅ |
| Eliminar clientes | ❌ | ✅ |
| **Proveedores** (crear, editar) | ✅ | ✅ |
| Eliminar proveedores | ❌ | ✅ |
| **Expedientes** (crear desde presupuesto, agregar pasajeros, servicios, comunicaciones) | ✅ | ✅ |
| Eliminar expedientes | ❌ | ✅ |
| **Recibos a clientes** (emitir) | ✅ | ✅ |
| Anular / eliminar recibos | ❌ | ✅ |
| **Pagos a proveedores** (registrar) | ✅ | ✅ |
| Anular / eliminar pagos a proveedores | ❌ | ✅ |
| **Cuentas corrientes — movimientos manuales** (alta, edición, baja) | ❌ | ✅ |
| Ver cuentas corrientes | ✅ | ✅ |
| **Reservas / PNRs** (importar, editar) | ✅ | ✅ |
| Eliminar reservas | ❌ | ✅ |
| **Reportes / Analítica** (ver) | ✅ | ✅ |
| Exportar reportes | ✅ | ✅ |
| **Configuración → Cuenta** (su propio perfil) | ✅ | ✅ |
| **Configuración → Agencia** (datos, logo, CUIT) | ❌ | ✅ |
| **Configuración → Documentos / Email / Infraestructura** | ❌ | ✅ |
| **Configuración → Preferencias / Notificaciones** (propias) | ✅ | ✅ |
| **Plantillas de PDF** (crear, editar) | ❌ (solo usar) | ✅ |
| **Gestión de usuarios de la agencia** (Fase C) | ❌ | ✅ |

**Regla de oro:** vendedor crea y edita, admin elimina y configura.

---

### Cambios técnicos

#### 1. Capa de base de datos (RLS reforzado)
Restringir el `DELETE` de tablas sensibles a `admin` únicamente, sumando `has_role(auth.uid(), 'admin')` a las políticas existentes:

- `quotes`, `clients`, `suppliers`, `files`
- `file_receipts`, `file_receipt_items`
- `file_supplier_payments`
- `account_movements` (DELETE + UPDATE + INSERT manuales: solo admin)
- `reservations`, `flight_segments`
- `quote_tags`, `client_groups`, `quote_versions`

Las políticas de `SELECT/INSERT/UPDATE` operativas siguen igual (todos los miembros).

Para `account_movements` la restricción es más fuerte: el `INSERT/UPDATE/DELETE` manual queda bloqueado para vendedor (los movimientos automáticos por trigger igualmente se siguen creando porque corren como `SECURITY DEFINER`).

Para `agencies` (UPDATE) ya está limitado a admin — se mantiene.

#### 2. Capa de UI (ocultar/deshabilitar)
Crear un hook `usePermissions()` que exponga flags derivados del `role` de `AuthContext`:

```ts
const { canDelete, canManageAgency, canCreateMovements, canEditTemplates, isAdmin } = usePermissions();
```

Aplicarlo en:
- Botones de eliminar (presupuestos, clientes, proveedores, expedientes, recibos, pagos, reservas) → ocultos para vendedor
- `NewMovementDialog` (movimientos manuales en CC) → botón "Nuevo movimiento" oculto para vendedor en `/accounts`
- `Settings` → tabs **Agencia, Documentos, Email, Infraestructura** ocultos para vendedor
- `Templates` → botones "Crear/Editar/Eliminar" plantilla deshabilitados para vendedor (ver y usar sí)
- `Header` → mostrar badge "Vendedor" / "Admin" junto al nombre de usuario

#### 3. Mensajes claros
Cuando un vendedor intenta una acción restringida (por ejemplo, vía URL directa o RLS bloquea), mostrar toast: *"Esta acción requiere permisos de administrador. Contactá al admin de tu agencia."*

#### 4. Componente `<AdminOnly>` 
Wrapper simple para envolver bloques de UI que solo deben ver admins:
```tsx
<AdminOnly>
  <Button variant="destructive">Eliminar</Button>
</AdminOnly>
```

---

### Archivos a tocar (estimado)

- **Migración SQL** nueva: refuerza políticas RLS de DELETE en ~10 tablas + bloqueo de INSERT/UPDATE manual en `account_movements`.
- **Nuevos**:
  - `src/hooks/usePermissions.ts`
  - `src/components/auth/AdminOnly.tsx`
- **Editados** (ocultar acciones según rol):
  - `src/pages/Settings.tsx` (filtrar tabs)
  - `src/pages/Accounts.tsx` + `src/components/accounts/AccountDetail.tsx` + `NewMovementDialog.tsx`
  - `src/pages/Clients.tsx`, `ClientDetail.tsx`
  - `src/pages/Suppliers.tsx`, `SupplierDetail.tsx`
  - `src/pages/Files.tsx`, `FileDetail.tsx` + tabs (Receipts, Suppliers, Services)
  - `src/pages/Reservations.tsx`, `ReservationDetail.tsx`
  - `src/pages/Templates.tsx`
  - `src/pages/Dashboard.tsx` (botón eliminar presupuesto)
  - `src/components/quotes/QuoteCard.tsx` (botón eliminar)
  - `src/components/layout/Header.tsx` (badge de rol)

---

### Cómo lo vas a probar
1. Como tu usuario actual (`admin`) todo sigue exactamente igual.
2. Para probar como vendedor: en Fase C tendremos invitaciones, pero por ahora podemos crear un segundo usuario de prueba y cambiarle el rol manualmente en la base. Si querés, en este mismo paso te dejo un botón "Modo vendedor (preview)" en Settings → Cuenta que **simula** la UI restringida sin tocar la base, así verificás visualmente antes de Fase C.

---

### Fuera de alcance (van en Fase C)
- Invitar usuarios por email
- Pantalla de gestión de miembros de la agencia
- Cambiar rol de un miembro existente
- Transferir ownership

---

### ¿Confirmás?
Si está OK arranco con la migración RLS + el hook `usePermissions` + el wrapper `AdminOnly`, y después barro las pantallas para ocultar acciones. ¿Querés que incluya el "Modo vendedor (preview)" para poder testear sin crear segundo usuario?