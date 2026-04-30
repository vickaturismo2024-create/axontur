# Mejorar gestión de equipo (Configuración → Equipo)

## Contexto

La pestaña **Equipo** ya soporta lo básico (invitar, copiar link, cambiar rol, eliminar miembro, cancelar/eliminar invitación). Pero hay 4 huecos importantes que conviene cerrar ahora que el dominio de email está activo:

1. **Los miembros se ven como `8a3f1c2b...`** en lugar del email real, porque desde el cliente no se puede leer `auth.users` y no guardamos el email en `agency_members`.
2. **Al invitar, el link sólo se copia al portapapeles** — hay que pegárselo manualmente al usuario por WhatsApp/email. Ahora que `notify.vickaturismo.tur.ar` está verificado, se puede mandar el email automáticamente.
3. **Las invitaciones expiradas** (>7 días) no se pueden reactivar, hay que cancelarlas y crear una nueva.
4. **No hay forma de "reenviar"** una invitación pendiente cuando el usuario perdió el link original.

## Cambios propuestos

### 1. Mostrar email real de los miembros

- Crear RPC `get_agency_members_with_email(_agency_id uuid)` SECURITY DEFINER que joinee `agency_members` con `auth.users` y devuelva `id, user_id, email, role, created_at`.
- La RPC valida que el caller sea miembro de esa agencia (`is_agency_member`).
- En `TeamTab` reemplazar la query directa a `agency_members` por la RPC.
- Mostrar `email` (o "Vos" si es el usuario actual) en lugar del UUID truncado.

### 2. Enviar invitación por email automáticamente

- Crear edge function `send-team-invitation` que:
  - Recibe `{ invitationId }`.
  - Valida que el caller sea admin de la agencia dueña de la invitación.
  - Lee la invitación + nombre de la agencia + nombre de quien invita.
  - Renderiza un email HTML con branding AxonTur (logo, color primario, link de aceptación, validez 7 días).
  - Encola vía `enqueue_email` en la cola transaccional.
  - Loguea en `email_logs`.
- En `handleInvite` (TeamTab), después de crear la invitación: invocar la edge function. Si falla, igual mostrar el link copiado como fallback.
- Agregar botón **"Reenviar email"** en cada invitación pendiente (al lado de "Copiar link"), que llama a la misma edge function.

### 3. Reactivar invitaciones expiradas

- En el listado **Historial**, junto a las invitaciones con `status='expired'`, agregar botón **"Reactivar"**.
- Acción: `UPDATE agency_invitations SET status='pending', expires_at = now() + interval '7 days', token = encode(gen_random_bytes(24),'hex') WHERE id=…` (vía RPC `reactivate_invitation` SECURITY DEFINER + check de admin).
- Después de reactivar, ofrecer reenviar el email.

### 4. Cleanups menores

- Marcar visualmente las invitaciones cuya `expires_at < now()` aunque sigan en `status='pending'` (badge "Expirada" en rojo) — útil si el cron de expiración no corrió todavía.
- Agregar contador de "Vendedores: N · Admins: M" en el header de la sección.

## Detalle técnico

**Migration nueva:**

```sql
-- 1. Mostrar emails de miembros
CREATE OR REPLACE FUNCTION public.get_agency_members_with_email(_agency_id uuid)
RETURNS TABLE(id uuid, user_id uuid, email text, role app_role, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_agency_member(_agency_id, auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN QUERY
    SELECT m.id, m.user_id, u.email::text, m.role, m.created_at
    FROM public.agency_members m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.agency_id = _agency_id
    ORDER BY m.created_at;
END;
$$;

-- 2. Reactivar invitación expirada
CREATE OR REPLACE FUNCTION public.reactivate_invitation(_invitation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_inv public.agency_invitations;
BEGIN
  SELECT * INTO v_inv FROM public.agency_invitations WHERE id = _invitation_id;
  IF v_inv IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF NOT (v_inv.agency_id = current_agency_id() AND has_role(auth.uid(),'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  UPDATE public.agency_invitations
    SET status='pending',
        expires_at = now() + interval '7 days',
        token = encode(extensions.gen_random_bytes(24),'hex'),
        updated_at = now()
    WHERE id = _invitation_id
    RETURNING token INTO v_inv.token;
  RETURN jsonb_build_object('success', true, 'token', v_inv.token);
END;
$$;
```

**Nueva edge function** `supabase/functions/send-team-invitation/index.ts`:
- `verify_jwt = true` (usa el JWT del admin invitando).
- Service-role client para leer `agency_invitations` + `agencies` + email del invited_by.
- Valida que `auth.uid()` tenga rol admin en esa agencia (vía `has_role`).
- Construye HTML con `<a href="{origin}/accept-invitation?token=…">` y branding AxonTur.
- Llama `supabase.rpc('enqueue_email', { queue_name: 'transactional_emails', payload: {...} })`.

**Files tocados (TS/TSX):**

- `src/components/settings/TeamTab.tsx` — usar RPC nueva, agregar botones Reenviar y Reactivar, mostrar email, badge expirada, contador.
- `supabase/functions/send-team-invitation/index.ts` (nuevo) + entrada en `supabase/config.toml`.

## Lo que NO cambia

- Estructura de tabla `agency_members` / `agency_invitations` (sólo se agregan funciones).
- Flujo de aceptación (`/accept-invitation` y `accept_agency_invitation` siguen igual).
- Reglas RLS existentes — todo nuevo va vía SECURITY DEFINER con check explícito.
- Regla "1 user = 1 agencia" sigue vigente.

## Resultado esperado

- En **Configuración → Equipo**, los miembros muestran su email real.
- Al invitar, el sistema envía el email automáticamente (además de copiar el link como backup).
- Cualquier invitación pendiente tiene un botón "Reenviar email".
- Las invitaciones expiradas se pueden reactivar con un click sin perder el historial.