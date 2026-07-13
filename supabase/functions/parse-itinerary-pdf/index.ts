import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rl = await checkRateLimit(supabaseAdmin, claimsData.claims.sub, {
      action:        "parse_itinerary_pdf",
      maxRequests:   30,
      windowMinutes: 60,
    });

    if (!rl.allowed) {
      return rateLimitResponse(rl, corsHeaders);
    }

    const { text } = await req.json();

    if (!text || text.length < 30) {
      return new Response(
        JSON.stringify({ error: "No se pudo extraer texto suficiente del PDF" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Truncate text to avoid token limits (keep first ~12000 chars)
    const truncatedText = text.length > 12000 ? text.substring(0, 12000) : text;

    const systemPrompt = `Eres un asistente especializado en extraer itinerarios de viaje desde documentos PDF.
Recibirás el texto extraído de un PDF que contiene un itinerario de viaje (circuito turístico, paquete, etc.).

Tu tarea es identificar y estructurar cada día del itinerario con la siguiente información:
- dayNumber: número del día (1, 2, 3...)
- date: fecha si aparece en el documento (formato YYYY-MM-DD), o string vacío si no hay fecha específica
- title: título descriptivo del día. Generalmente viene como "Día 1: Ciudad - Destino" o similar. Extraelo tal cual aparece, limpiando solo formato innecesario.
- description: descripción completa del día. Transcribí todo el texto descriptivo de ese día de forma prolija, sin omitir detalles importantes. Mantené el sentido original del texto.
- activities: lista de actividades puntuales del día, extraídas de la descripción. Cada actividad debe ser una frase corta y concreta.

Reglas importantes:
- Transcribí la información tal como aparece en el PDF, sin inventar ni agregar contenido
- Mantené los nombres de lugares, hoteles y servicios exactamente como aparecen
- Si el día menciona comidas incluidas (desayuno, cena, etc.), incluílas como actividades
- Separá las visitas y excursiones en actividades individuales
- No incluyas información de precios, condiciones de venta, o datos administrativos como parte del itinerario
- Si hay información de hoteles mencionada junto al itinerario, NO la incluyas como un día del itinerario
- Generá contenido en español`;

    const userPrompt = `Extraé el itinerario día por día del siguiente texto de PDF:

${truncatedText}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_itinerary",
              description: "Extrae los días del itinerario del PDF",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        dayNumber: { type: "number", description: "Número del día (1, 2, 3...)" },
                        date: { type: "string", description: "Fecha en formato YYYY-MM-DD o vacío si no hay fecha" },
                        title: { type: "string", description: "Título del día tal como aparece en el PDF" },
                        description: { type: "string", description: "Descripción completa del día transcrita del PDF" },
                        activities: {
                          type: "array",
                          items: { type: "string" },
                          description: "Lista de actividades puntuales del día",
                        },
                      },
                      required: ["dayNumber", "date", "title", "description", "activities"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["days"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_itinerary" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Intentá de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Error al procesar el itinerario con IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "La IA no pudo extraer un itinerario válido del PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const days = parsed.days || [];

    if (days.length === 0) {
      return new Response(
        JSON.stringify({ error: "No se encontraron días de itinerario en el PDF" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ days }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-itinerary-pdf error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
