import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Surcharge {
  type: "percentage" | "fixed_total" | "fixed_per_person";
  label: string;
  value: number;
}

interface ExtractedPackage {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  currency: string;
  coverTitle: string;
  coverSubtitle: string;
  flights: {
    origin: string;
    destination: string;
    date: string;
    departureTime: string;
    arrivalTime: string;
    airline: string;
    flightNumber: string;
    luggage: string;
    notes: string;
    cost: number;
  }[];
  lodgings: {
    name: string;
    category: string;
    address: string;
    checkIn: string;
    checkOut: string;
    regime: string;
    roomType: string;
    nights: number;
    notes: string;
    costPerNight: number;
    destination: string;
  }[];
  transfers: {
    type: string;
    description: string;
    dateTime: string;
    included: boolean;
    cost: number;
  }[];
  activities: {
    name: string;
    description: string;
    date: string;
    time: string;
    duration: string;
    location: string;
    included: boolean;
    cost: number;
    notes: string;
  }[];
  insurance: {
    company: string;
    plan: string;
    coverage: string;
    notes: string;
    cost: number;
  };
  basePrice: number;
  surcharges: Surcharge[];
  observations: string;
}

function calculateFinalPrice(
  basePrice: number,
  surcharges: Surcharge[],
  travelers: number
): number {
  let price = basePrice;

  // Apply percentage surcharges (on base price)
  for (const s of surcharges) {
    if (s.type === "percentage") {
      price += basePrice * (s.value / 100);
    }
  }

  // Apply fixed surcharges
  for (const s of surcharges) {
    if (s.type === "fixed_total") {
      price += s.value;
    } else if (s.type === "fixed_per_person") {
      price += s.value * travelers;
    }
  }

  return Math.round(price * 100) / 100;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Rate limiting ──────────────────────────────────────────
    // Máximo 100 scrapes por usuario por hora.
    // Al usar fetch nativo en lugar de Firecrawl, el costo es menor, pero evitamos abusos a la IA.
    const rl = await checkRateLimit(supabase, user.id, {
      action:        "scrape_package",
      maxRequests:   100,
      windowMinutes: 60,
    });

    if (!rl.allowed) {
      return rateLimitResponse(rl, corsHeaders);
    }
    // ──────────────────────────────────────────────────────────

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL es requerida" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Scrape with native fetch
    let formattedUrl = url.trim();
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    let markdown = "";
    let pageTitle = "";

    try {
      const scrapeResponse = await fetch(formattedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
        }
      });

      if (!scrapeResponse.ok) {
        console.error("Fetch error: status", scrapeResponse.status);
        return new Response(
          JSON.stringify({
            success: false,
            error: `No se pudo acceder a la página (Error ${scrapeResponse.status}). Verificá la URL.`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const html = await scrapeResponse.text();
      
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      pageTitle = titleMatch ? titleMatch[1].trim() : "Página sin título";

      // Limpiar scripts, styles y tags HTML para dejar solo texto
      markdown = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    } catch (err) {
      console.error("Fetch exception:", err);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error de red al intentar acceder a la página. Es posible que el sitio esté bloqueando el acceso automático.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!markdown || markdown.length < 50) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "La página no tiene suficiente contenido para extraer un paquete.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      "Page scraped successfully, content length:",
      markdown.length
    );

    // Step 2: Extract structured data with AI (OpenRouter or Gemini)
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!OPENROUTER_API_KEY && !GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No hay clave de IA configurada (OPENROUTER_API_KEY o GEMINI_API_KEY)",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const systemPrompt = `Sos un experto en turismo que analiza páginas web de mayoristas de viajes para extraer información estructurada de paquetes turísticos.

Tu tarea es analizar el contenido de una página web y extraer todos los datos del paquete de viaje.

Reglas importantes:
- Extraé TODOS los datos que puedas encontrar. Si algo no está claro, dejalo vacío.
- Las fechas deben estar en formato YYYY-MM-DD.
- Los horarios en formato HH:MM.
- Los precios deben ser números (sin símbolos de moneda).
- Detectá la moneda (USD, ARS, EUR, etc.) del precio publicado.
- FUNDAMENTAL: Buscá CUALQUIER mención a recargos, impuestos, tasas, fees, gastos administrativos, o cualquier cargo adicional que se deba sumar al precio base. Estos son MUY comunes en mayoristas argentinos. Ejemplos:
  - "Agregar X% en concepto de gastos administrativos"
  - "Precio + IVA"
  - "Sumar impuesto PAIS + percepción ganancias"
  - "Fee de emisión USD X por pasajero"
  - "Gastos de gestión: X%"
  - Cualquier texto que indique que hay que sumar algo al precio publicado
- Si el precio dice "por persona", el basePrice debe ser POR PERSONA.
- Si hay múltiples opciones de habitación/categoría, elegí la más común o la primera que aparezca.
- En observations, poné cualquier información relevante que no encaje en los campos estructurados.
MUY IMPORTANTE: Devolvé ÚNICAMENTE un objeto JSON válido con la siguiente estructura, sin nada más:
{
  "destination": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "travelers": 2,
  "currency": "USD",
  "coverTitle": "string",
  "coverSubtitle": "string",
  "flights": [{ "origin": "string", "destination": "string", "date": "YYYY-MM-DD", "departureTime": "HH:MM", "arrivalTime": "HH:MM", "airline": "string", "flightNumber": "string", "luggage": "string", "notes": "string", "cost": 0 }],
  "lodgings": [{ "name": "string", "category": "string", "address": "string", "checkIn": "YYYY-MM-DD", "checkOut": "YYYY-MM-DD", "regime": "string", "roomType": "string", "nights": 0, "notes": "string", "costPerNight": 0, "destination": "string" }],
  "transfers": [{ "type": "string", "description": "string", "dateTime": "string", "included": true, "cost": 0 }],
  "activities": [{ "name": "string", "description": "string", "date": "string", "time": "string", "duration": "string", "location": "string", "included": true, "cost": 0, "notes": "string" }],
  "insurance": { "company": "string", "plan": "string", "coverage": "string", "notes": "string", "cost": 0 },
  "basePrice": 0,
  "surcharges": [{ "type": "percentage", "label": "string", "value": 0 }],
  "observations": "string"
}`;

    const extractionPrompt = `Analizá el siguiente contenido de una página web de un mayorista de turismo y extraé toda la información del paquete de viaje.

Título de la página: ${pageTitle}

Contenido:
${markdown.substring(0, 15000)}`;

    let aiResponse: Response;

    if (OPENROUTER_API_KEY) {
      // ── OpenRouter con retry y múltiples modelos free ──
      const freeModels = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen3-coder:free",
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
      ];

      let lastResponse: Response | null = null;

      for (const model of freeModels) {
        console.log(`Trying OpenRouter model: ${model}`);
        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://axontur.com",
            "X-Title": "AxonTur Presupuestos",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: extractionPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (resp.ok) {
          lastResponse = resp;
          console.log(`Success with model: ${model}`);
          break;
        }

        console.warn(`Model ${model} returned ${resp.status}, trying next...`);
        lastResponse = resp;

        if (resp.status === 429) {
          // Wait 2 seconds before trying next model
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // For non-429 errors, still try next model
        continue;
      }

      aiResponse = lastResponse!;
    } else {
      // ── Gemini directo (fallback) ──
      console.log("Using Gemini direct API...");
      aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );
    }

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Demasiadas solicitudes. Esperá un momento e intentá de nuevo.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Créditos de IA insuficientes. Recargá tu cuenta para continuar.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error: status", aiResponse.status, errorText);
      
      let parsedError = errorText;
      try {
        const jsonErr = JSON.parse(errorText);
        if (jsonErr.error && jsonErr.error.message) parsedError = jsonErr.error.message;
      } catch (e) {
        // use raw text
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Error de IA (${aiResponse.status}): ${typeof parsedError === 'string' ? parsedError.substring(0, 150) : 'Error desconocido'}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract text from response (different format for OpenRouter vs Gemini)
    let responseText: string | undefined;
    if (OPENROUTER_API_KEY) {
      responseText = aiData.choices?.[0]?.message?.content;
    } else {
      responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!responseText) {
      console.error("No text in AI response", JSON.stringify(aiData).substring(0, 500));
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No se pudo extraer información del paquete. Probá con otra URL.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let extracted: ExtractedPackage;
    try {
      extracted = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse AI JSON response");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al parsear los datos extraídos.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate final price with surcharges
    const travelers = extracted.travelers || 2;
    const basePrice = extracted.basePrice || 0;
    const surcharges = extracted.surcharges || [];
    const finalPrice = calculateFinalPrice(basePrice, surcharges, travelers);

    console.log(
      `Price calculation: base=${basePrice}, surcharges=${surcharges.length}, final=${finalPrice}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...extracted,
          travelers,
          basePrice,
          finalPrice,
          surcharges,
          sourceUrl: formattedUrl,
          pageTitle,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("scrape-package error:", error instanceof Error ? error.name : "Unknown");
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Error desconocido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
