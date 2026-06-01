// Envía un email de invitación de equipo al usuario invitado.
// Refactorizado para usar el patrón estándar de emails transaccionales:
// invoca send-transactional-email con el template 'team-invitation'.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APP_URL = Deno.env.get("VITE_APP_URL") || Deno.env.get("APP_URL") || 'https://vickaturismo.tur.ar';

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

    // Service-role client
    const admin = createClient(supabaseUrl, serviceKey);

    // Cargar invitación
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
    const roleLabel = inv.role === 'admin' ? 'Administrador' : 'Vendedor';

    // Invocar send-transactional-email con el template estándar.
    // Pasamos explícitamente el service-role key como Bearer porque
    // functions.invoke() no inyecta automáticamente el JWT en llamadas
    // entre edge functions, y send-transactional-email tiene verify_jwt = true.
    const { data: sendData, error: sendErr } = await admin.functions.invoke('send-transactional-email', {
      headers: { Authorization: `Bearer ${serviceKey}` },
      body: {
        templateName: 'team-invitation',
        recipientEmail: inv.email,
        idempotencyKey: `team-invite-${inv.id}-${inv.token.slice(0, 8)}`,
        templateData: {
          agencyName,
          inviterEmail: callerEmail,
          roleLabel,
          acceptUrl,
          expiresInDays,
        },
      },
    });

    if (sendErr) {
      console.error('send-transactional-email failed', sendErr);
      return json({ error: 'send_failed', detail: sendErr.message }, 500);
    }

    // Loguear en email_logs (panel del usuario)
    await admin.from('email_logs').insert({
      user_id: callerId,
      agency_id: inv.agency_id,
      to_email: inv.email,
      subject: `Te invitaron a ${agencyName} en AxonTur`,
      template_type: 'custom',
      status: 'sent',
    });

    return json({ success: true, sendData });
  } catch (e) {
    console.error('send-team-invitation error', e);
    return json({ error: e instanceof Error ? e.message : 'unknown_error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
