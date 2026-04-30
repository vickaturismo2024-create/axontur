## Diagnóstico

Los logs de `process-email-queue` muestran que **todos los emails de invitación quedan atascados** con este error de la API:

```
400 {"type":"missing_parameter","message":"Missing run_id or idempotency_key",
     "details":"Auth emails require run_id. App emails can omit run_id by 
               providing idempotency_key with purpose=transactional."}
```

**Causa**: la edge function `send-team-invitation` arma el payload con campos que el dispatcher no entiende (`recipient_email`, `sender_name`, `template_name`, `metadata`) y NO incluye `purpose: "transactional"` ni `idempotency_key`. El dispatcher (`process-email-queue`) lee otros nombres de campo (`to`, `from`, `purpose`, `idempotency_key`, `label`) — exactamente como lo hace `auth-email-hook`.

Además, ya hay **4 mensajes atascados en la cola** que se reintentan cada 5s (read_ct hasta 11) y todos seguirán fallando hasta que se purguen.

## Solución

### 1. Reescribir el payload en `supabase/functions/send-team-invitation/index.ts`

Cambiar los campos del payload para que coincidan con lo que `process-email-queue` espera:

```ts
const messageId = crypto.randomUUID();
const idempotencyKey = `team-invite-${inv.id}`;

// Log pending ANTES de encolar
await admin.from('email_send_log').insert({
  message_id: messageId,
  template_name: 'team_invitation',
  recipient_email: inv.email,
  status: 'pending',
});

const payload = {
  message_id: messageId,
  idempotency_key: idempotencyKey,
  to: inv.email,
  from: `${FROM_NAME} <noreply@${SENDER_DOMAIN}>`,
  sender_domain: SENDER_DOMAIN,
  subject,
  html,
  purpose: 'transactional',
  label: 'team_invitation',
  queued_at: new Date().toISOString(),
};

await admin.rpc('enqueue_email', { queue_name: 'transactional_emails', payload });
```

Si `enqueue_email` falla, se loguea `failed` en `email_send_log` para que quede traza.

### 2. Redeploy de la función

`supabase--deploy_edge_functions` con `["send-team-invitation"]`.

### 3. Purgar los 4 mensajes atascados

Los mensajes con id 1–4 en la cola `transactional_emails` tienen el formato viejo y nunca van a poder enviarse. Los borramos directamente de pgmq:

```sql
SELECT pgmq.delete('transactional_emails', msg_id)
FROM pgmq.q_transactional_emails;
```

Esto se ejecuta vía la herramienta de migración (operación puntual segura: solo elimina mensajes encolados, no afecta tablas de la app).

### 4. Probar

Desde **Configuración → Equipo**, invitar a un email real. Esperar ~5–10s y verificar:
- El email llega a la bandeja del invitado.
- En `email_send_log` aparece una fila `sent` para `template_name = 'team_invitation'`.
- Los logs de `process-email-queue` ya no muestran errores.

## Resultado esperado

Las invitaciones nuevas se envían correctamente con el branding de AxonTur desde `notify.vickaturismo.tur.ar`, y la cola queda limpia.
