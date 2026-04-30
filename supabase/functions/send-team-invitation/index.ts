// Envía un email de invitación de equipo al usuario invitado.
// Requiere JWT del admin invitando + invitationId.
// Encola el email en la cola transaccional vía enqueue_email.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APP_URL = 'https://axontur.lovable.app';
const SENDER_DOMAIN = 'notify.vickaturismo.tur.ar';
const FROM_NAME = 'AxonTur';

function buildEmailHtml(opts: {
  agencyName: string;
  inviterEmail: string;
  role: 'admin' | 'vendedor';
  acceptUrl: string;
  expiresInDays: number;
}): string {
  const roleLabel = opts.role === 'admin' ? 'Administrador' : 'Vendedor';
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);">
          <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #e5e7eb;">
            <h1 style="margin:0;font-size:20px;color:#0f172a;">AxonTur</h1>
            <p style="margin:4px 0 0;font-size:13px;color:#64748b;">ERP para agencias de viaje</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Te invitaron a unirte a ${escapeHtml(opts.agencyName)}</h2>
            <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
              <strong>${escapeHtml(opts.inviterEmail)}</strong> te invitó a colaborar en
              <strong>${escapeHtml(opts.agencyName)}</strong> dentro de AxonTur con el rol de
              <strong>${roleLabel}</strong>.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6;">
              Hacé click en el botón para aceptar la invitación y comenzar a usar el sistema.
              El link expira en ${opts.expiresInDays} días.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr><td style="background:#0f172a;border-radius:8px;">
                <a href="${opts.acceptUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">
                  Aceptar invitación
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.5;">
              Si el botón no funciona, copiá y pegá este link en tu navegador:
            </p>
            <p style="margin:0;font-size:12px;color:#475569;word-break:break-all;background:#f1f5f9;padding:10px;border-radius:6px;">
              ${opts.acceptUrl}
            </p>
          </td></tr>
          <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
              Si no esperabas esta invitación, podés ignorar este email.
              Necesitás iniciar sesión con la dirección de email a la que llegó este mensaje para aceptar la invitación.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Cliente con JWT del usuario para validar identidad
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: 'unauthorized' }, 401);
    }
    const callerId = userData.user.id;
    const callerEmail = userData.user.email ?? '';

    // Body
    let body: any = {};
    try { body = await req.json(); } catch {}
    const invitationId = body?.invitationId;
    if (!invitationId || typeof invitationId !== 'string') {
      return json({ error: 'invalid_invitation_id' }, 400);
    }

    // Service-role client para leer/escribir
    const admin = createClient(supabaseUrl, serviceKey);

    // Cargar invitación + agencia
    const { data: inv, error: invErr } = await admin
      .from('agency_invitations')
      .select('id, agency_id, email, role, status, token, expires_at')
      .eq('id', invitationId)
      .maybeSingle();
    if (invErr || !inv) {
      return json({ error: 'invitation_not_found' }, 404);
    }
    if (inv.status !== 'pending') {
      return json({ error: 'invitation_not_pending', status: inv.status }, 400);
    }

    // Validar que el caller sea admin de esa agencia
    const { data: memberData, error: memberErr } = await admin
      .from('agency_members')
      .select('role')
      .eq('agency_id', inv.agency_id)
      .eq('user_id', callerId)
      .maybeSingle();
    if (memberErr || !memberData || memberData.role !== 'admin') {
      return json({ error: 'not_authorized' }, 403);
    }

    // Nombre de la agencia
    const { data: agency } = await admin
      .from('agencies')
      .select('name')
      .eq('id', inv.agency_id)
      .maybeSingle();
    const agencyName = agency?.name || 'tu agencia';

    // Calcular días restantes
    const now = Date.now();
    const expiresAt = new Date(inv.expires_at).getTime();
    const expiresInDays = Math.max(1, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));

    const acceptUrl = `${APP_URL}/accept-invitation?token=${inv.token}`;
    const subject = `Te invitaron a ${agencyName} en AxonTur`;
    const html = buildEmailHtml({
      agencyName,
      inviterEmail: callerEmail,
      role: inv.role,
      acceptUrl,
      expiresInDays,
    });

    // Encolar email (formato esperado por process-email-queue)
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

    const { error: enqErr } = await admin.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload,
    });
    if (enqErr) {
      await admin.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'team_invitation',
        recipient_email: inv.email,
        status: 'failed',
        error_message: enqErr.message,
      });
      return json({ error: 'enqueue_failed', detail: enqErr.message }, 500);
    }

    // Loguear en email_logs para que aparezca en el panel del usuario
    await admin.from('email_logs').insert({
      user_id: callerId,
      agency_id: inv.agency_id,
      to_email: inv.email,
      subject,
      template_type: 'custom',
      status: 'sent',
    });

    return json({ success: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown_error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
