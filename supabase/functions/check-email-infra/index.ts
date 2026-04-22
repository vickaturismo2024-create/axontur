// Aggregates email infrastructure health for the authenticated user.
// Returns queue metrics from email_send_log (last 24h, deduplicated by message_id)
// plus the most recent error.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface QueueMetrics {
  pending: number;
  sent: number;
  failed: number;
  dlq: number;
  suppressed: number;
  total: number;
}

interface LastEntry {
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // verify_jwt = true in config.toml ensures the platform validates the JWT
    // before invoking this function. We just need the user_id from the header
    // for logging/scoping purposes if needed — but here we read service-role
    // data, so we don't even need to decode the JWT.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Service-role client to read email_send_log (RLS restricts to service_role).
    const adminClient = createClient(supabaseUrl, serviceKey);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error: logErr } = await adminClient
      .from('email_send_log')
      .select('message_id, template_name, recipient_email, status, error_message, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (logErr) {
      return new Response(
        JSON.stringify({
          queue: { pending: 0, sent: 0, failed: 0, dlq: 0, suppressed: 0, total: 0 },
          recent: [],
          lastError: logErr.message,
          checkedAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Deduplicate by message_id, keeping the latest row (rows are ordered DESC).
    const latestByMessage = new Map<string, LastEntry>();
    const noIdRows: LastEntry[] = [];
    for (const r of (rows ?? []) as LastEntry[]) {
      if (r.message_id) {
        if (!latestByMessage.has(r.message_id)) latestByMessage.set(r.message_id, r);
      } else {
        noIdRows.push(r);
      }
    }
    const deduped = [...latestByMessage.values(), ...noIdRows];

    const metrics: QueueMetrics = {
      pending: 0, sent: 0, failed: 0, dlq: 0, suppressed: 0, total: deduped.length,
    };
    let lastError: { recipient: string; error: string; at: string } | null = null;
    for (const r of deduped) {
      switch (r.status) {
        case 'pending': metrics.pending++; break;
        case 'sent': metrics.sent++; break;
        case 'failed':
        case 'bounced':
        case 'complained':
          metrics.failed++; break;
        case 'dlq': metrics.dlq++; break;
        case 'suppressed': metrics.suppressed++; break;
      }
      if (!lastError && (r.status === 'dlq' || r.status === 'failed' || r.status === 'bounced')) {
        lastError = {
          recipient: r.recipient_email,
          error: r.error_message ?? 'Sin detalle',
          at: r.created_at,
        };
      }
    }

    const recent = deduped.slice(0, 25);

    return new Response(
      JSON.stringify({
        queue: metrics,
        recent,
        lastError,
        checkedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
