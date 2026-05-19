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
    // Máximo 10 scrapes por usuario por hora.
    // Firecrawl cobra por request — esto protege contra abuso.
    const rl = await checkRateLimit(supabase, user.id, {
      action:        "scrape_package",
      maxRequests:   10,
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

    // Step 1: Scrape with Firecrawl
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "El conector de Firecrawl no está configurado",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let formattedUrl = url.trim();
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error("Firecrawl error: status", scrapeResponse.status);
      return new Response(
        JSON.stringify({
          success: false,
          error: "No se pudo acceder a la página. Verificá la URL.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const markdown =
      scrapeData.data?.markdown || scrapeData.markdown || "";
    const pageTitle =
      scrapeData.data?.metadata?.title || scrapeData.metadata?.title || "";

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

    // Step 2: Extract structured data with Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "LOVABLE_API_KEY no está configurada",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const systemPrompt = `Sos un experto en turismo que analiza páginas web de mayoristas de viajes para extraer información estructurada de paquetes turísticos.

Tu tarea es analizar el contenido de una página web y extraer todos los datos del paquete de viaje usando la herramienta proporcionada.

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
- En observations, poné cualquier información relevante que no encaje en los campos estructurados.`;

    const extractionPrompt = `Analizá el siguiente contenido de una página web de un mayorista de turismo y extraé toda la información del paquete de viaje.

Título de la página: ${pageTitle}

Contenido:
${markdown.substring(0, 15000)}`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: extractionPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_package",
                description:
                  "Extrae los datos estructurados del paquete turístico desde la página web",
                parameters: {
                  type: "object",
                  properties: {
                    destination: {
                      type: "string",
                      description: "Destino principal del viaje",
                    },
                    startDate: {
                      type: "string",
                      description: "Fecha de inicio (YYYY-MM-DD)",
                    },
                    endDate: {
                      type: "string",
                      description: "Fecha de fin (YYYY-MM-DD)",
                    },
                    travelers: {
                      type: "number",
                      description:
                        "Cantidad de viajeros base del paquete (default 2)",
                    },
                    currency: {
                      type: "string",
                      description: "Moneda del precio (USD, ARS, EUR, etc.)",
                    },
                    coverTitle: {
                      type: "string",
                      description:
                        "Título sugerido para la portada del presupuesto",
                    },
                    coverSubtitle: {
                      type: "string",
                      description: "Subtítulo sugerido para la portada",
                    },
                    flights: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          origin: { type: "string" },
                          destination: { type: "string" },
                          date: {
                            type: "string",
                            description: "YYYY-MM-DD",
                          },
                          departureTime: {
                            type: "string",
                            description: "HH:MM",
                          },
                          arrivalTime: {
                            type: "string",
                            description: "HH:MM",
                          },
                          airline: { type: "string" },
                          flightNumber: { type: "string" },
                          luggage: {
                            type: "string",
                            description: "Detalle de equipaje incluido",
                          },
                          notes: { type: "string" },
                          cost: {
                            type: "number",
                            description: "Costo del vuelo si está detallado",
                          },
                        },
                        required: ["origin", "destination"],
                        additionalProperties: false,
                      },
                    },
                    lodgings: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          category: {
                            type: "string",
                            description: "Ej: 4 estrellas, 5 estrellas",
                          },
                          address: { type: "string" },
                          checkIn: {
                            type: "string",
                            description: "YYYY-MM-DD",
                          },
                          checkOut: {
                            type: "string",
                            description: "YYYY-MM-DD",
                          },
                          regime: {
                            type: "string",
                            description:
                              "Ej: Desayuno, Media pensión, All Inclusive",
                          },
                          roomType: {
                            type: "string",
                            description: "Ej: Doble, Triple, Suite",
                          },
                          nights: { type: "number" },
                          notes: { type: "string" },
                          costPerNight: { type: "number" },
                          destination: {
                            type: "string",
                            description: "Ciudad/destino del alojamiento",
                          },
                        },
                        required: ["name"],
                        additionalProperties: false,
                      },
                    },
                    transfers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            description:
                              "Ej: Aeropuerto-Hotel, Hotel-Aeropuerto",
                          },
                          description: { type: "string" },
                          dateTime: { type: "string" },
                          included: { type: "boolean" },
                          cost: { type: "number" },
                        },
                        required: ["type", "description"],
                        additionalProperties: false,
                      },
                    },
                    activities: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          description: { type: "string" },
                          date: { type: "string" },
                          time: { type: "string" },
                          duration: { type: "string" },
                          location: { type: "string" },
                          included: { type: "boolean" },
                          cost: { type: "number" },
                          notes: { type: "string" },
                        },
                        required: ["name"],
                        additionalProperties: false,
                      },
                    },
                    insurance: {
                      type: "object",
                      properties: {
                        company: { type: "string" },
                        plan: { type: "string" },
                        coverage: { type: "string" },
                        notes: { type: "string" },
                        cost: { type: "number" },
                      },
                      additionalProperties: false,
                    },
                    basePrice: {
                      type: "number",
                      description:
                        "Precio base publicado por el mayorista (sin recargos adicionales)",
                    },
                    surcharges: {
                      type: "array",
                      description:
                        "Recargos, impuestos, tasas o fees que se deben agregar al precio base. MUY IMPORTANTE: buscá cualquier mención de porcentajes o montos adicionales.",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: [
                              "percentage",
                              "fixed_total",
                              "fixed_per_person",
                            ],
                            description:
                              "percentage: porcentaje sobre precio base. fixed_total: monto fijo total. fixed_per_person: monto fijo por pasajero.",
                          },
                          label: {
                            type: "string",
                            description:
                              "Nombre del recargo (ej: Gastos administrativos, IVA, Impuesto PAIS)",
                          },
                          value: {
                            type: "number",
                            description:
                              "Valor numérico (porcentaje sin %, o monto fijo)",
                          },
                        },
                        required: ["type", "label", "value"],
                        additionalProperties: false,
                      },
                    },
                    observations: {
                      type: "string",
                      description:
                        "Información adicional relevante (condiciones, restricciones, notas del mayorista)",
                    },
                  },
                  required: [
                    "destination",
                    "basePrice",
                    "surcharges",
                    "currency",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_package" },
          },
        }),
      }
    );

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
      console.error("AI gateway error: status", aiResponse.status);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al procesar la página con IA",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract tool call arguments
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_package") {
      console.error("No tool call in AI response");
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
      extracted = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse tool call arguments");
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
