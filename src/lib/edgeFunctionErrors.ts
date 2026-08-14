/**
 * Extrae un mensaje de error legible y descriptivo a partir del error retornado por supabase.functions.invoke.
 * Supabase envuelve los errores HTTP (4xx, 5xx) en FunctionsHttpError con el mensaje genérico
 * "Edge Function returned a non-2xx status code".
 * El contenido real (JSON devuelto por la función) se encuentra en error.context (un objeto Response).
 */
export async function getEdgeFunctionErrorMessage(
  error: unknown,
  fallbackMessage = "Error al procesar la solicitud con la función"
): Promise<string> {
  if (!error) return fallbackMessage;

  const err = error as any;

  // Si tiene context (típico de FunctionsHttpError en supabase-js)
  if (err?.context) {
    try {
      if (typeof err.context.json === "function") {
        // Clonamos si es necesario o leemos el JSON directamente
        const cloned = typeof err.context.clone === "function" ? err.context.clone() : err.context;
        const body = await cloned.json();
        if (body?.error && typeof body.error === "string") return body.error;
        if (body?.message && typeof body.message === "string") return body.message;
        if (body?.error?.message && typeof body.error.message === "string") return body.error.message;
      }
    } catch {
      // Si no es JSON o ya fue consumido, intentamos como texto
      try {
        if (typeof err.context.text === "function") {
          const cloned = typeof err.context.clone === "function" ? err.context.clone() : err.context;
          const text = await cloned.text();
          if (text && text.trim().length > 0) return text;
        }
      } catch {
        // Fallback
      }
    }
  }

  // Si tiene un mensaje descriptivo que no sea el genérico de non-2xx
  if (
    typeof err?.message === "string" &&
    err.message.trim().length > 0 &&
    !err.message.includes("non-2xx status code")
  ) {
    return err.message;
  }

  return fallbackMessage;
}
