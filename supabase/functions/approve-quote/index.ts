import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id, name } = await req.json();

    if (!id || typeof id !== "string") {
      return new Response(JSON.stringify({ error: "Missing quote id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return new Response(JSON.stringify({ error: "Invalid quote id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Verificar que el quote existe y no está ya aprobado ──
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("id, status, approved_at, pricing, client, trip, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (quote.approved_at) {
      return new Response(
        JSON.stringify({ error: "Already approved", approved_at: quote.approved_at }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Verificar expiración del link ────────────────────────
    const publicLinkExpiry = (quote.pricing as { publicLinkExpiry?: string } | null)?.publicLinkExpiry;
    if (publicLinkExpiry && new Date(publicLinkExpiry) < new Date()) {
      return new Response(JSON.stringify({ error: "Este enlace ha expirado" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Aprobar el quote ─────────────────────────────────────
    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by_name: name.trim().substring(0, 200),
        approved_ip: clientIp,
      })
      .eq("id", id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to approve" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Notificar a la agencia por email ─────────────────────
    try {
      const userId = quote.user_id;

      if (userId) {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const agencyEmail = userData?.user?.email;

        if (agencyEmail) {
          const clientName  = (quote.client as any)?.name  || "Cliente";
          const destination = (quote.trip   as any)?.destination || "Sin destino";

          await supabase.rpc("enqueue_email", {
            queue_name: "transactional_emails",
            payload: {
              to:      agencyEmail,
              subject: `✅ Presupuesto aprobado — ${clientName} · ${destination}`,
              label:   "quote_approved_notification",
              purpose: "transactional",
              html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                  <h2 style="color:#1e3a5f;margin-bottom:8px;">¡Presupuesto aprobado!</h2>
                  <p style="color:#475569;font-size:15px;line-height:1.6;">
                    Tu cliente <strong>${clientName}</strong> aprobó el presupuesto de
                    <strong>${destination}</strong>.
                  </p>
                  <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:20px 0;">
                    <p style="margin:0 0 6px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Aprobado por</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${name.trim()}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">
                      ${new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
                      · IP: ${clientIp}
                    </p>
                  </div>
                  <p style="color:#475569;font-size:14px;">
                    Ingresá al sistema para crear el expediente y continuar con la operación.
                  </p>
                  <a href="https://axontur.vercel.app"
                     style="display:inline-block;margin-top:8px;background:#1e3a5f;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                    Ir a AxonTur
                  </a>
                </div>
              `,
            },
          });
        }
      }
    } catch (emailErr) {
      console.error("quote_approved notification failed:", emailErr);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
