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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pnrText } = await req.json();
    
    if (!pnrText || typeof pnrText !== 'string') {
      return new Response(
        JSON.stringify({ error: "PNR text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input length to prevent abuse
    if (pnrText.length > 10000) {
      return new Response(
        JSON.stringify({ error: "PNR text too long (max 10000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize input to mitigate prompt injection attacks
    const sanitizedPnr = pnrText
      .replace(/system\s*:/gi, '[FILTERED]')
      .replace(/assistant\s*:/gi, '[FILTERED]')
      .replace(/\bignore\s+(all\s+)?(previous\s+)?instructions?\b/gi, '[FILTERED]')
      .replace(/\bforget\s+(all\s+)?(previous\s+)?instructions?\b/gi, '[FILTERED]')
      .substring(0, 10000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert at parsing airline PNR (Passenger Name Record) data from GDS systems like Amadeus, Sabre, Galileo, and Worldspan.

Extract flight information from the PNR text provided and return structured JSON data.

IMPORTANT: You must use the extract_flights function to return the data. Return ALL flight segments found in the PNR.

CRITICAL: Detect connecting flights (stopovers/escalas). When flights are part of the same connection:
- They occur on the same day or consecutive days
- The destination of one flight matches the origin of the next
- Mark them with the same connectionGroupId (generate a unique ID like "conn_1", "conn_2")
- Set flightType to "stopover" for connecting flights

For each flight segment, extract:
- origin: Origin airport code and city (e.g., "Buenos Aires (EZE)")
- destination: Destination airport code and city (e.g., "Cancún (CUN)")
- date: Flight date in YYYY-MM-DD format
- departureTime: Departure time in HH:MM format (24h)
- arrivalTime: Arrival time in HH:MM format, add "+1" if arrives next day (e.g., "06:30+1")
- airline: Full airline name
- flightNumber: Flight number with airline code (e.g., "AM456")
- luggage: Luggage allowance if mentioned, otherwise empty
- luggageType: One of "personal", "personal_carryon", "personal_carryon_checked", or "custom" based on luggage info
- notes: Any additional notes like cabin class, stops, connection info
- flightType: "direct" for direct flights, "stopover" for connecting flights, "charter" for charter flights
- connectionGroupId: Same ID for flights that are part of the same connection/itinerary, empty for standalone flights

Common GDS formats:
- Amadeus: "1 AR1234 Y 15MAR EZEEZE HK1 1430 2200"
- Sabre: "1 AA 1234Y 15MAR DFWLAX HK1 1430 1600"
- Format variations include airline code, flight number, booking class, date, route, status, times

Parse dates carefully - they may be in formats like "15MAR", "15MAR24", "2024-03-15", etc.
Convert city codes to readable names when possible (EZE = Buenos Aires, CUN = Cancún, MIA = Miami, etc).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse the following PNR/flight information:\n\n${sanitizedPnr}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_flights",
              description: "Extract flight segments from PNR data",
              parameters: {
                type: "object",
                properties: {
                  flights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        origin: { type: "string", description: "Origin city and airport code" },
                        destination: { type: "string", description: "Destination city and airport code" },
                        date: { type: "string", description: "Flight date in YYYY-MM-DD format" },
                        departureTime: { type: "string", description: "Departure time in HH:MM format" },
                        arrivalTime: { type: "string", description: "Arrival time in HH:MM format, add +1 if next day" },
                        airline: { type: "string", description: "Full airline name" },
                        flightNumber: { type: "string", description: "Flight number with airline code" },
                        luggage: { type: "string", description: "Luggage allowance if mentioned" },
                        luggageType: { type: "string", enum: ["personal", "personal_carryon", "personal_carryon_checked", "custom"], description: "Type of luggage" },
                        notes: { type: "string", description: "Additional notes like cabin class, stops" },
                        flightType: { type: "string", enum: ["direct", "stopover", "charter"], description: "Type of flight" },
                        connectionGroupId: { type: "string", description: "ID to group connected flights (same for all legs of a connection)" }
                      },
                      required: ["origin", "destination", "date", "departureTime", "arrivalTime", "airline", "flightNumber"]
                    }
                  }
                },
                required: ["flights"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_flights" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Log only status code, not full error text that may contain sensitive info
      console.error("AI gateway error:", response.status);
      throw new Error("Error processing request");
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_flights") {
      throw new Error("Failed to extract flight data from AI response");
    }

    const flightData = JSON.parse(toolCall.function.arguments);
    
    console.log(`User ${user.id} parsed PNR with ${flightData.flights?.length || 0} flights`);
    
    return new Response(
      JSON.stringify({ flights: flightData.flights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    // Log error type only, not full details
    console.error("Error parsing PNR:", error instanceof Error ? error.name : "Unknown");
    return new Response(
      JSON.stringify({ error: "Error al procesar el PNR. Por favor, intenta nuevamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
