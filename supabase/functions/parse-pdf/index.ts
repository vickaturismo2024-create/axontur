import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (text.length > 50000) {
      return new Response(JSON.stringify({ error: "Text too long (max 50000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitized = text
      .replace(/system\s*:/gi, "[FILTERED]")
      .replace(/assistant\s*:/gi, "[FILTERED]")
      .replace(/\bignore\s+(all\s+)?(previous\s+)?instructions?\b/gi, "[FILTERED]")
      .substring(0, 50000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You extract structured flight reservation data from raw text content of e-tickets, itineraries and PDF confirmations from airlines or travel agencies.

Use the extract_flight_data function. Return:
- locator: PNR / record locator (6 alphanumeric chars typical), or empty if not found
- passengers: array { lastName (uppercase), firstName (uppercase), title (MR/MRS/MS/MSTR if present) }
- flights: array of segments with:
  - origin: City and airport code, e.g. "Buenos Aires (EZE)"
  - destination: same format
  - date: YYYY-MM-DD
  - departureTime: HH:MM 24h
  - arrivalTime: HH:MM 24h, append "+1" if next day
  - airline: Full airline name
  - flightNumber: e.g. "AR1234"
  - luggage: free text if mentioned
  - luggageType: one of personal | personal_carryon | personal_carryon_checked | custom
  - notes: cabin class, stops, terminal, etc.
  - flightType: direct | stopover | charter
  - connectionGroupId: same id for connecting segments

Respect dates carefully — convert any format (15MAR, 15-MAR-2025, etc.) to YYYY-MM-DD.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract flight data from this PDF text content:\n\n${sanitized}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_flight_data",
              description: "Extract structured flight reservation data",
              parameters: {
                type: "object",
                properties: {
                  locator: { type: "string", description: "PNR / record locator" },
                  passengers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        lastName: { type: "string" },
                        firstName: { type: "string" },
                        title: { type: "string" },
                      },
                      required: ["lastName"],
                    },
                  },
                  flights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        origin: { type: "string" },
                        destination: { type: "string" },
                        date: { type: "string" },
                        departureTime: { type: "string" },
                        arrivalTime: { type: "string" },
                        airline: { type: "string" },
                        flightNumber: { type: "string" },
                        luggage: { type: "string" },
                        luggageType: {
                          type: "string",
                          enum: ["personal", "personal_carryon", "personal_carryon_checked", "custom"],
                        },
                        notes: { type: "string" },
                        flightType: { type: "string", enum: ["direct", "stopover", "charter"] },
                        connectionGroupId: { type: "string" },
                      },
                      required: ["origin", "destination", "date", "departureTime", "arrivalTime", "airline", "flightNumber"],
                    },
                  },
                },
                required: ["flights"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_flight_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intentá más tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Agregá créditos a tu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      throw new Error("Error processing request");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_flight_data") {
      throw new Error("Failed to extract flight data");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    console.log(`User ${user.id} parsed PDF: ${parsed.flights?.length || 0} flights, ${parsed.passengers?.length || 0} pax`);

    return new Response(
      JSON.stringify({
        locator: parsed.locator || "",
        passengers: parsed.passengers || [],
        flights: parsed.flights || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error parsing PDF:", error instanceof Error ? error.name : "Unknown");
    return new Response(
      JSON.stringify({ error: "Error al procesar el PDF. Intentá nuevamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
