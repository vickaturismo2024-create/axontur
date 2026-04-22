

# Roadmap multi-usuario y roles — 3 fases

## Visión general

Hoy AxonTur es **mono-usuario**: cada cuenta opera aislada y todo lo que se carga queda atado a `user_id`. Para venderlo a agencias reales necesitamos:

1. **Agencias** como entidad que agrupa usuarios y datos.
2. **Roles** (`admin` / `vendedor`) con restricciones reales en UI y base de datos.
3. **Invitaciones** para que el admin sume vendedores a su agencia.

Vamos en 3 fases independientes y reversibles. Cada fase queda funcional por sí sola.

---

## Fase A — Concepto de Agencia y migración de datos

**Objetivo:** introducir la entidad agencia sin romper nada. Vos quedás como **Owner/Admin** de tu agencia actual con todos tus datos intactos.

### Cambios

1. **Tabla nueva `agencies`**: id, nombre (tomado de `profiles.agency_name`), datos fiscales, owner_id, created_at.
2. **Tabla nueva `agency_members`**: vincula `user_id` ↔ `agency_id` ↔ `role` (`admin` | `vendedor`). Por ahora vos sos único miembro como `admin`.
3. **Columna nueva `agency_id`** en todas las tablas operativas (`quotes`, `clients`, `suppliers`, `files`, `file_receipts`, `file_receipt_items`, `file_services`, `file_supplier_payments`, `file_passengers`, `account_movements`, `payments`, `templates`, `quote_tags`, `quote_versions`, `client_groups`, `client_notes`, `reservations`, `reminders`, `email_logs`, `exchange_rate_log`).
4. **Función security definer `current_agency_id()`** que devuelve la agencia del usuario logueado (consultando `agency_members`).
5. **RLS actualizado**: las policies pasan de `auth.uid() = user_id` a `agency_id = current_agency_id()`. Esto permite que cualquier miembro de la agencia vea los mismos datos.
6. **Migración de datos**:
   - Crea una agencia con tu `profiles.agency_name` (o "Mi Agencia" si está vacío).
   - Te inserta como `admin` en `agency_members`.
   - Backfill: `UPDATE … SET agency_id = <tu_agencia>` en todas las tablas para tus filas existentes.
7. **Frontend**: `AuthContext` extendido con `agencyId` y `role`. Cargados al loguearse. Cero cambios visibles en pantallas (sigue funcionando exactamente igual que hoy).

### Verificación
- Loguearse → ves todos tus presupuestos/expedientes/clientes/recibos como siempre.
- DB: cada fila operativa tiene `agency_id` poblado.
- `SELECT current_agency_id()` retorna tu agencia.

---

## Fase B — Roles y restricciones UI

**Objetivo:** aplicar el rol `vendedor` con lock-down financiero/configuración. Sigue siendo agencia mono-usuario (vos sos admin), pero podés crear un usuario de prueba como vendedor para validar.

### Matriz de permisos

| Acción | Admin | Vendedor |
|---|:-:|:-:|
| Crear/editar presupuestos | ✓ | ✓ |
| Eliminar presupuestos | ✓ | ✗ |
| Crear/editar clientes y proveedores | ✓ | ✓ |
| Eliminar clientes y proveedores | ✓ | ✗ |
| Crear expedientes (desde quote) | ✓ | ✓ |
| Editar pasajeros, servicios, comunicaciones del expediente | ✓ | ✓ |
| Eliminar expedientes | ✓ | ✗ |
| Cargar recibos a clientes | ✓ | ✓ |
| Editar/anular recibos | ✓ | ✗ |
| Cargar pagos a proveedores | ✓ | ✓ |
| Editar/eliminar pagos a proveedores | ✓ | ✗ |
| Cargar movimientos manuales en CC (cliente o proveedor) | ✓ | ✗ |
| Editar tipos de cambio en recibos multi-moneda | ✓ | ✗ |
| Ver pestaña Reportes (rentabilidad, márgenes, TC) | ✓ | ✗ |
| Ver Cuenta Corriente de clientes/proveedores | ✓ | ✗ |
| Ver pestaña Resumen financiero del expediente | ✓ | ✗ |
| Editar Configuración (agencia, plantillas, email, infraestructura) | ✓ | ✗ |
| Gestionar miembros del equipo | ✓ | ✗ |
| Reservas (PNR, vuelos) | ✓ | ✓ |
| Calendario | ✓ | ✓ |

### Cambios técnicos

1. **Hook `useRole()`**: lee `role` del `AuthContext`, expone `isAdmin`, `isVendedor`, helper `can(action)`.
2. **`<RoleGuard requires="admin">`**: wrapper que oculta o desactiva botones/secciones para vendedores. Aplicado en:
   - Botones eliminar (presupuestos, clientes, expedientes, recibos, pagos a proveedores, movimientos).
   - Tabs financieras (Resumen del expediente, Cuenta Corriente, Reportes, Settings).
   - Acciones de edición de TC en recibos multi-moneda.
   - Botón "Registrar movimiento manual" en CC.
   - Sidebar/Header: ocultar links a Reportes, Settings, Cuentas Corrientes para vendedor.
3. **Rutas protegidas**: `<ProtectedRoute requireRole="admin">` para `/reportes`, `/settings`, `/clients/:id`, `/suppliers/:id`, `/accounts`. Si vendedor entra por URL → redirige a `/`.
4. **Defensa en backend (RLS)**: además de filtrar por agencia, las policies de `DELETE` y de tablas sensibles validan rol vía nueva función `has_role(_user_id, 'admin')`. Aunque alguien manipule el frontend, la base bloquea.
5. **Banner UX**: si vendedor llega a una zona vacía por permisos, se muestra "Esta función está restringida al administrador de la agencia."

### Verificación
- Cambiar tu propio rol a `vendedor` temporalmente desde DB → la UI esconde botones de eliminar, Reportes, Settings, CC. Volverlo a `admin` → todo vuelve.
- Intentar `DELETE` en consola de Supabase con rol vendedor → error de RLS.

---

## Fase C — Invitaciones y onboarding multi-usuario

**Objetivo:** que el admin sume vendedores reales a su agencia desde la UI. Listo para vender el producto.

### Cambios

1. **Tabla `agency_invitations`**: agency_id, email, role, token, status (`pending`/`accepted`/`revoked`), expires_at, invited_by.
2. **Edge Function `send-invitation`**: recibe email + rol, valida que el invitador sea `admin`, genera token, manda mail con link `https://axontur.lovable.app/auth?invite=<token>` usando la infraestructura de email existente (template nuevo `invite.tsx`).
3. **Edge Function `accept-invitation`**: el invitado entra al link, se loguea o se registra (signup normal), y al confirmar email se ejecuta esta función que: valida token, agrega al usuario en `agency_members` con el rol asignado, marca invitación como `accepted`.
4. **Página nueva `/settings?tab=team`** (sólo admin):
   - Lista de miembros actuales con su rol y email.
   - Botón "Invitar usuario" → diálogo con email + select de rol.
   - Cambiar rol de un miembro existente.
   - Quitar miembro de la agencia (deja sus datos pero pierde acceso).
   - No podés removerte a vos mismo si sos único admin.
5. **Signup mejorado** (`src/pages/Auth.tsx`):
   - Si la URL trae `?invite=<token>` → muestra "Te invitaron a unirte a {agencia} como {rol}", el signup automáticamente lo asocia.
   - Si no hay invitación → signup normal crea su propia agencia (vos sos owner/admin de tu agencia).
6. **Ajuste profile/agency**: separar lo que es del usuario (foto, idioma) de lo que es de la agencia (nombre, CUIT, logo, plantillas, email config). La agencia comparte settings; el usuario tiene los suyos.
7. **Indicador de agencia en Header**: badge con nombre de agencia + rol del usuario logueado.

### Verificación
- Como admin invitás a `vendedor@test.com` → recibe email con link.
- El vendedor crea cuenta con ese link → entra ya como miembro de tu agencia con rol vendedor.
- Ve los mismos clientes/expedientes/presupuestos que vos, pero sin botones de eliminar, sin Reportes ni Settings.
- Vos podés cambiar su rol a admin o quitarlo desde `/settings?tab=team`.

---

## Fuera de alcance (para iteraciones futuras)

- Permisos granulares por usuario (más allá de los 2 roles).
- Auditoría/log de acciones por usuario (quién borró qué).
- Múltiples agencias por usuario (hoy 1 usuario = 1 agencia).
- Facturación/billing por agencia.
- SSO o login con Google.

---

## Próximo paso

Si lo aprobás, arrancamos con **Fase A** (agencia + migración de datos), que es la base. Es la más invasiva técnicamente porque toca RLS y agrega columnas a casi todas las tablas, pero la UI no cambia y vos seguís viendo todo igual. Una vez que confirmemos que nada se rompió, pasamos a **Fase B** (restricciones de rol) y después a **Fase C** (invitaciones).

