import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  action:         string;  // nombre de la acción, ej: 'scrape_package'
  maxRequests:    number;  // máximo de requests permitidos
  windowMinutes:  number;  // ventana de tiempo en minutos
}

export interface RateLimitResult {
  allowed:    boolean;
  remaining:  number;   // requests restantes en la ventana
  resetInMin: number;   // minutos hasta que se resetea la ventana
}

/**
 * Verifica y registra un intento de uso de una acción costosa.
 * Devuelve { allowed: false } si el usuario superó el límite.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const windowStart = new Date(
    Date.now() - config.windowMinutes * 60 * 1000
  ).toISOString();

  // Contar requests del usuario en la ventana actual
  const { count, error } = await supabase
    .from("rate_limit_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", config.action)
    .gte("created_at", windowStart);

  if (error) {
    // Si falla la query, dejamos pasar para no bloquear al usuario
    // por un error nuestro. Logueamos para investigar.
    console.error("rate_limit check failed:", error.message);
    return { allowed: true, remaining: config.maxRequests, resetInMin: config.windowMinutes };
  }

  const current   = count ?? 0;
  const remaining = Math.max(0, config.maxRequests - current);
  const allowed   = current < config.maxRequests;

  // Si está permitido, registrar este intento
  if (allowed) {
    const { error: insertError } = await supabase
      .from("rate_limit_log")
      .insert({ user_id: userId, action: config.action });

    if (insertError) {
      console.error("rate_limit insert failed:", insertError.message);
    }
  }

  return {
    allowed,
    remaining: allowed ? remaining - 1 : 0,
    resetInMin: config.windowMinutes,
  };
}

/**
 * Respuesta estándar 429 con headers correctos.
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error:   `Límite de uso alcanzado. Podés volver a intentarlo en ${result.resetInMin} minutos.`,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type":    "application/json",
        "Retry-After":     String(result.resetInMin * 60),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
