## Objetivo

Permitir que un admin de agencia agregue **directamente** a un usuario que ya está registrado en la app pero todavía no pertenece a ninguna agencia, sin tener que mandar/aceptar una invitación por email.

Esto resuelve casos como el de `juancruzaguero@gmail.com`: el usuario ya creó su cuenta pero quedó "huérfano" sin acceso a datos.

## Restricciones

- Se mantiene la regla **1 usuario = 1 agencia**: no se puede asignar a alguien que ya pertenece a otra agencia.
- Sólo admins pueden hacerlo (mismas reglas que invitar).
- Se respeta la confidencialidad: no se exponen los emails de todos los usuarios de la base — el admin tiene que **escribir el email exacto** del usuario a asignar.

## Cambios

### 1. Nueva función RPC `assign_user_to_agency(_email, _role)`

`SECURITY DEFINER`, en `public`. Hace:

1. Verifica que `auth.uid()` es admin de su agencia actual (`current_agency_id() + has_role 'admin'`).
2. Busca en `auth.users` el `id` del email recibido (case-insensitive).
3. Si no existe → devuelve `{ success: false, error: 'user_not_found' }`. (No se filtra esto antes porque sólo confirma o niega un email puntual ingresado por el admin.)
4. Si el usuario ya está en `agency_members` → devuelve `{ success: false, error: 'already_member' }`.
5. Inserta `(agency_id = current_agency_id(), user_id, role)` en `agency_members`.
6. Devuelve `{ success: true, user_id, role }`.

Migración: crear la función + `GRANT EXECUTE ... TO authenticated`.

### 2. UI — `src/components/settings/TeamTab.tsx`

Agregar al lado del botón "Invitar miembro" un botón secundario **"Agregar usuario existente"** que abre un dialog con:

- Input email (obligatorio).
- Select de rol (admin / vendedor, default vendedor).
- Botón "Agregar a la agencia".

Al confirmar:
- Llama `supabase.rpc('assign_user_to_agency', { _email, _role })`.
- Maneja errores con toasts claros:
  - `user_not_found` → "No encontramos un usuario registrado con ese email. Pedile que se registre primero o usá Invitar miembro."
  - `already_member` → "Ese usuario ya pertenece a una agencia."
  - `not_authorized` → "No tenés permisos."
- Éxito → toast "Usuario agregado", refresca la lista.

## Detalles técnicos

- La función usa `SECURITY DEFINER` con `set search_path = public, auth` para poder leer `auth.users`.
- No exponemos un endpoint de búsqueda por email (evita enumeración masiva); el admin tiene que conocer el email.
- Sin cambios en RLS de `agency_members` — el insert ocurre con privilegios elevados desde la función.
- Sin cambios en el flujo de invitaciones existente.
