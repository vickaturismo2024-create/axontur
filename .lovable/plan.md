## Objetivo

Arreglar el envío de invitaciones de equipo refactorizando `send-team-invitation` para que use el patrón estándar de emails transaccionales de Lovable Cloud (template React Email + `send-transactional-email`), en lugar del payload "raw" actual que está siendo rechazado por la API y va al Dead Letter Queue (DLQ).

## Diagnóstico

- `send-team-invitation` arma HTML/texto inline y lo encola directamente en `transactional_emails` con `enqueue_email`.
- El dispatcher (`process-email-queue`) envía el payload a la Email API, que lo rechaza con `400 missing_parameter: "text"` porque espera el formato estándar (`templateName` + `templateData`).
- Tras 5 intentos, los mensajes caen al DLQ → nunca llega el mail.
- La infraestructura nueva (`send-transactional-email`, `preview-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`) ya existe en archivos pero **no está registrada en `supabase/config.toml` ni desplegada**.

## Plan de implementación

### 1. Registrar las nuevas Edge Functions en `supabase/config.toml`
Agregar bloques para:
- `send-transactional-email` (verify_jwt = true)
- `preview-transactional-email` (verify_jwt = false, gated por `LOVABLE_API_KEY`)
- `handle-email-unsubscribe` (verify_jwt = false)
- `handle-email-suppression` (verify_jwt = false)

### 2. Crear el template React Email `team-invitation`
Archivo: `supabase/functions/_shared/transactional-email-templates/team-invitation.tsx`
- Componente React Email con branding AxonTur (navy `#1d324d`, fondo blanco).
- Props: `agencyName`, `inviterEmail`, `roleLabel`, `acceptUrl`, `expiresInDays`.
- Subject dinámico: `Te invitaron a {agencyName} en AxonTur`.
- Incluye `previewData` para el preview del dashboard.

### 3. Crear/actualizar `registry.ts`
Archivo: `supabase/functions/_shared/transactional-email-templates/registry.ts`
- Exporta `TemplateEntry` interface.
- Mapea `'team-invitation'` → template importado.

### 4. Refactorizar `send-team-invitation/index.ts`
- Eliminar la construcción de HTML inline y la llamada directa a `enqueue_email`.
- Reemplazar por una invocación a `send-transactional-email`:
  ```ts
  await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'team-invitation',
      recipientEmail: inv.email,
      idempotencyKey: `team-invite-${inv.id}`,
      templateData: { agencyName, inviterEmail, roleLabel, acceptUrl, expiresInDays },
    },
  })
  ```
- Mantener validaciones de admin/agencia y el log en `email_logs`.

### 5. Crear página `/unsubscribe`
Archivo: `src/pages/Unsubscribe.tsx` + ruta en `src/App.tsx`.
- Lee `?token=` de la URL.
- GET al edge function para validar.
- Botón "Confirmar baja" → POST con el token.
- Estilo coherente con AxonTur.

### 6. Limpiar el DLQ
Migración SQL para purgar mensajes muertos de invitaciones anteriores en `pgmq.q_transactional_emails_dlq`.

### 7. Deploy de las Edge Functions
Desplegar: `send-transactional-email`, `preview-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, `send-team-invitation`.

### 8. Test end-to-end
Reenviar invitación a `juancruzaguero@gmail.com` y validar logs (`email_send_log` con status `sent`).

## Sobre GitHub

Los cambios se pushean automáticamente al repo conectado vía la sincronización bidireccional de Lovable. No hago `git push` manual — basta con conectar GitHub una vez (Connectors → GitHub) si todavía no lo hiciste.

## Resultado esperado

- Las invitaciones de equipo llegan al inbox del invitado.
- `email_send_log` muestra `sent` (no `failed`/`dlq`).
- Toda la infra transaccional queda lista para futuros emails (recibos, vouchers, confirmaciones).
