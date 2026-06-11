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

    const { text, isLegacy } = await req.json();
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
      .replace(/^\s*system\s*:\s*/gim, "[FILTERED]")
      .replace(/^\s*assistant\s*:\s*/gim, "[FILTERED]")
      .replace(/\bignore\s+(?:all\s+)?(?:previous\s+)?instructions?\b/gi, "[FILTERED]")
      .replace(/\bdo\s+not\s+use\s+(?:the\s+)?tool\b/gi, "[FILTERED]")
      .substring(0, 50000);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    let systemPrompt = '';
    let toolName = 'extract_flight_data';
    let toolParameters: any = {};

    if (isLegacy) {
      systemPrompt = `You extract structured historical travel agency reservation details from the raw text content of a PDF report.

The output must include:
- legacyId: The reservation/file number (e.g. 5960)
- agent: The seller's name (e.g. VICTORIA ARROSPIDE)
- clientLegacyId: The customer code (e.g. 1532)
- clientName: The full customer name (e.g. GONGORA NELSON ADRIAN)
- clientPhone: The customer phone or cell number if mentioned (e.g. 2241681058)
- clientAddress: The customer address if mentioned (e.g. 7160 MAIPU)
- startDate: The trip departure/start date in YYYY-MM-DD (e.g. 2026-07-11)
- endDate: The trip return/end date in YYYY-MM-DD if mentioned
- numPax: The total number of passengers (e.g. 6)
- currency: The main currency of the reservation (USD or ARS)
- passengers: Array of passengers, each containing:
  - name: Full name (e.g. BONAVITA MARIA VIRGINIA)
  - type: Passenger type, e.g. "ADULTO", "MENOR", "INFANTE"
  - dni: DNI number (e.g. 23801647)
  - birthDate: Birth date in YYYY-MM-DD format (convert e.g. 24/08/74 to 1974-08-24, 08/10/00 to 2000-10-08). Make sure to distinguish between 19xx and 20xx birthdates based on age or logical context.
- services: Array of services, each containing:
  - supplierName: The supplier/provider name (e.g. TTS VIAJES S.A., RYAN AIR, FERRY GNV)
  - description: Detailed service description (e.g. AEREOS AR, TERRESTRES (HOTELES + TRENES))
  - serviceType: The service type, which MUST be one of: flight, lodging, transfer, activity, insurance, cruise, train, rental_car, ferry, or other.
  - startDate: Service start/departure date in YYYY-MM-DD format
  - endDate: Service end/arrival date in YYYY-MM-DD format
  - cost: Cost amount in the primary currency (number). If there are separate Pesos and Dolares columns, use the one with data.
  - price: Sale price/importe amount in the primary currency (number). If there are separate Pesos and Dolares columns, use the one with data.
  - costArs: Cost in ARS (pesos) if available separately (number, 0 if not available)
  - costUsd: Cost in USD (dolares) if available separately (number, 0 if not available)
  - priceArs: Sale price in ARS if available separately (number, 0 if not available)
  - priceUsd: Sale price in USD if available separately (number, 0 if not available)
  - currency: Primary currency of the service (USD or ARS). If the PDF has both Pesos and Dolares columns, set this to the one with the larger amount.
  - origin: For flight/train/ferry, 3-letter IATA code or city name of origin (e.g. EZE, MAD)
  - destination: For flight/train/ferry, 3-letter IATA code or city name of destination (e.g. MIA, CDG)
  - airline: For flights, the airline name (e.g. Aerolineas Argentinas)
  - flightNumber: For flights, flight number code (e.g. AR1302)
  - cabinClass: For flight/train/ferry, cabin class (Economy, Premium Economy, Business, First)
  - departureTime: For flights, departure time in HH:MM format (e.g. 14:30)
  - arrivalTime: For flights, arrival time in HH:MM format (e.g. 23:15)
  - luggage: Luggage allowance details (e.g. 1x23kg, Cabin only)
  - luggageType: personal | personal_carryon | personal_carryon_checked | custom
  - roomType: For lodging/rental_car, type of room/car (e.g. Standard Doble, SUV Mediano)
  - regime: For lodging, regime type (Sin régimen, Solo alojamiento, Desayuno, Media pensión, Pensión completa, Todo incluido)
  - hotelCategory: For lodging, category (e.g. 5 estrellas, Boutique)
  - company: For rental_car/cruise/train/ferry, operator company name (e.g. Hertz, MSC, Renfe)
  - pickupLocation: For rental_car, pickup location
  - dropoffLocation: For rental_car, dropoff location
  - shipName: For cruise/ferry, ship name
  - embarkationPort: For cruise, embarkation port
  - disembarkationPort: For cruise, disembarkation port
  - deck: For cruise, deck name/number
  - cabinNumber: For cruise/train/ferry, cabin or seat number
  - coverage: For insurance, coverage amount details
  - insurancePlan: For insurance, plan name
- receipts: Array of receipts (cobros/client payments), each containing:
  - concept: Concept text (e.g. ER 1000-00002602 PAGO TOTAL AEREOS IDA...)
  - date: Payment date in YYYY-MM-DD format
  - amount: Amount (number)
  - currency: Currency (USD or ARS)
- payments: Array of supplier payments (pagos a operadores), each containing:
  - supplierName: Supplier name paid (e.g. TTS VIAJES S.A., SERVICIOS VARIOS)
  - date: Payment date in YYYY-MM-DD format
  - amount: Amount (number)
  - currency: Currency (USD or ARS)`;

      toolName = 'extract_legacy_reservation_data';
      toolParameters = {
        type: "object",
        properties: {
          legacyId: { type: "string", description: "Reservation number / ID_RES" },
          agent: { type: "string", description: "Seller/vendedor name" },
          clientLegacyId: { type: "string", description: "Customer number / CLIENTE N" },
          clientName: { type: "string", description: "Customer name" },
          clientPhone: { type: "string", description: "Customer phone/celular" },
          clientAddress: { type: "string", description: "Customer address" },
          startDate: { type: "string", description: "Start date in YYYY-MM-DD" },
          endDate: { type: "string", description: "End date in YYYY-MM-DD" },
          numPax: { type: "number", description: "Number of passengers" },
          currency: { type: "string", description: "Main currency of reservation (USD or ARS)" },
          passengers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", description: "ADULTO, MENOR, etc." },
                dni: { type: "string" },
                birthDate: { type: "string", description: "YYYY-MM-DD format (interpret 2-digit years, e.g. 10/10/69 is 1969-10-10, 08/10/00 is 2000-10-08)" },
              },
              required: ["name"],
            },
          },
          services: {
            type: "array",
            items: {
              type: "object",
              properties: {
                supplierName: { type: "string" },
                description: { type: "string" },
                serviceType: {
                  type: "string",
                  enum: ["flight", "lodging", "transfer", "activity", "insurance", "cruise", "train", "rental_car", "ferry", "other"],
                },
                startDate: { type: "string", description: "YYYY-MM-DD" },
                endDate: { type: "string", description: "YYYY-MM-DD" },
                cost: { type: "number" },
                price: { type: "number" },
                costArs: { type: "number", description: "Cost in ARS if available" },
                costUsd: { type: "number", description: "Cost in USD if available" },
                priceArs: { type: "number", description: "Sale price in ARS if available" },
                priceUsd: { type: "number", description: "Sale price in USD if available" },
                currency: { type: "string", enum: ["USD", "ARS"] },
                origin: { type: "string" },
                destination: { type: "string" },
                airline: { type: "string" },
                flightNumber: { type: "string" },
                cabinClass: { type: "string" },
                departureTime: { type: "string" },
                arrivalTime: { type: "string" },
                luggage: { type: "string" },
                luggageType: { type: "string", enum: ["personal", "personal_carryon", "personal_carryon_checked", "custom"] },
                roomType: { type: "string" },
                regime: { type: "string" },
                hotelCategory: { type: "string" },
                company: { type: "string" },
                pickupLocation: { type: "string" },
                dropoffLocation: { type: "string" },
                shipName: { type: "string" },
                embarkationPort: { type: "string" },
                disembarkationPort: { type: "string" },
                deck: { type: "string" },
                cabinNumber: { type: "string" },
                coverage: { type: "string" },
                insurancePlan: { type: "string" },
              },
              required: ["supplierName", "description", "serviceType", "cost", "price", "currency"],
            },
          },
          receipts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                concept: { type: "string" },
                date: { type: "string", description: "YYYY-MM-DD" },
                amount: { type: "number" },
                currency: { type: "string", enum: ["USD", "ARS"] },
              },
              required: ["concept", "date", "amount", "currency"],
            },
          },
          payments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                supplierName: { type: "string" },
                date: { type: "string", description: "YYYY-MM-DD" },
                amount: { type: "number" },
                currency: { type: "string", enum: ["USD", "ARS"] },
              },
              required: ["supplierName", "date", "amount", "currency"],
            },
          },
        },
        required: ["legacyId", "clientName", "services"],
      };
    } else {
      systemPrompt = `You extract structured flight reservation data from raw text content of e-tickets, itineraries and PDF confirmations from airlines or travel agencies.

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

      toolName = 'extract_flight_data';
      toolParameters = {
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
              required: ["origin", "destination", "date"],
            },
          },
        },
        required: ["flights"],
      };
    }

    // Retry logic with exponential backoff
    const MAX_RETRIES = 2;
    let lastError: Error | null = null;
    let response: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`Retry attempt ${attempt} after ${delay}ms`);
      }

      try {
        response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-1.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: isLegacy ? `Extract legacy reservation data from this PDF text content:\n\n${sanitized}` : `Extract flight data from this PDF text content:\n\n${sanitized}` },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: toolName,
                  description: "Extract structured data",
                  parameters: toolParameters,
                },
              },
            ],
            tool_choice: { type: "function", function: { name: toolName } },
          }),
        });

        if (response.ok || (response.status !== 429 && response.status !== 500 && response.status !== 503)) {
          break; // Success or non-retryable error
        }
        lastError = new Error(`HTTP ${response.status}`);
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr));
        if (attempt === MAX_RETRIES) break;
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to reach AI service");
    }

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
    if (!toolCall || toolCall.function.name !== toolName) {
      console.error("AI response missing tool call:", JSON.stringify(data).substring(0, 500));
      throw new Error("Failed to extract structured data");
    }

    let parsed;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (jsonErr) {
      console.error("AI returned malformed JSON:", toolCall.function.arguments?.substring(0, 500));
      throw new Error("AI returned invalid JSON response");
    }

    if (isLegacy) {
      console.log(`User ${user.id} parsed Legacy PDF: ${parsed.legacyId}, services: ${parsed.services?.length || 0}`);
      return new Response(
        JSON.stringify(parsed),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
