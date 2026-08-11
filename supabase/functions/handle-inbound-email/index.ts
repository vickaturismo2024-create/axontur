import { createClient } from 'npm:@supabase/supabase-js@2'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResendInboundPayload {
  type: string;
  created_at: string;
  data: {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text: string;
    html: string;
    headers: Record<string, string>;
  }
}

async function handleInbound(req: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Parse and verify webhook
  let payloadStr: string;
  try {
    payloadStr = await req.text();
  } catch (err) {
    return new Response('Invalid request body', { status: 400, headers: corsHeaders });
  }

  let verifiedPayload: any;
  if (webhookSecret) {
    try {
      const wh = new Webhook(webhookSecret.replace('whsec_', ''))
      verifiedPayload = wh.verify(payloadStr, req.headers as any)
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return new Response('Invalid signature', { status: 401, headers: corsHeaders })
    }
  } else {
    // Fallback if no secret configured
    verifiedPayload = JSON.parse(payloadStr)
  }

  const payload = verifiedPayload as ResendInboundPayload;
  
  if (payload.type !== 'email.received') {
    return new Response(JSON.stringify({ message: 'Ignored event type' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const email = payload.data;
  const messageId = email.headers['message-id'] || email.headers['Message-Id'];
  const inReplyTo = email.headers['in-reply-to'] || email.headers['In-Reply-To'];
  const references = email.headers['references'] || email.headers['References'];
  
  let fileId: string | null = null;
  let agencyId: string | null = null;

  // Attempt 1: Match by In-Reply-To or References
  if (inReplyTo) {
    const { data: comm } = await supabase
      .from('file_communications')
      .select('file_id, agency_id')
      .eq('message_id', inReplyTo.replace(/[<>]/g, ''))
      .maybeSingle();
    if (comm) {
      fileId = comm.file_id;
      agencyId = comm.agency_id;
    }
  }

  // Attempt 2: Regex in subject [EXP-XXXX] or EXP-XXXX
  if (!fileId && email.subject) {
    const match = email.subject.match(/\[?(EXP-\d+)\]?/i);
    if (match) {
      const fileNumber = match[1].toUpperCase();
      const { data: fileData } = await supabase
        .from('files')
        .select('id, agency_id')
        .eq('file_number', fileNumber)
        .maybeSingle();
      if (fileData) {
        fileId = fileData.id;
        agencyId = fileData.agency_id;
      }
    }
  }

  // If no file_id matched, we log and return 200 to acknowledge webhook
  if (!fileId || !agencyId) {
    console.warn(`Incoming email unlinked. Subject: ${email.subject}. From: ${email.from}`);
    return new Response(JSON.stringify({ message: 'Unlinked, ignored' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Insert into file_communications
  const { error: insertError } = await supabase
    .from('file_communications')
    .insert({
      agency_id: agencyId,
      file_id: fileId,
      direction: 'inbound',
      from_address: email.from,
      to_addresses: email.to || [],
      cc_addresses: email.cc || [],
      bcc_addresses: email.bcc || [],
      subject: email.subject || 'Sin asunto',
      html_body: email.html || '',
      text_body: email.text || '',
      message_id: messageId ? messageId.replace(/[<>]/g, '') : null,
      in_reply_to: inReplyTo ? inReplyTo.replace(/[<>]/g, '') : null,
      status: 'received'
    });

  if (insertError) {
    console.error('Failed to insert incoming email:', insertError);
    return new Response(JSON.stringify({ error: 'DB insert failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return await handleInbound(req)
});
