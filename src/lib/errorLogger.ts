import { supabase } from '@/integrations/supabase/client';

export interface ErrorReportOptions {
  error: Error | unknown;
  errorInfo?: React.ErrorInfo | null;
  componentName?: string;
  metadata?: Record<string, any>;
}

/**
 * Registra errores de renderizado o excepciones operativas en la base de datos
 * de forma asíncrona y no bloqueante (fail-safe).
 */
export async function logSystemError(options: ErrorReportOptions): Promise<void> {
  const { error, errorInfo, componentName, metadata = {} } = options;

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : JSON.stringify(error) || 'Unknown error';

  const errorName = error instanceof Error ? error.name : 'UncaughtException';
  const errorStack = error instanceof Error ? error.stack : undefined;
  const componentStack = errorInfo?.componentStack || undefined;
  const currentRoute = typeof window !== 'undefined' ? window.location.pathname : '';
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  // Log local en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.error(`[SystemErrorLogger] Fallo capturado en ${componentName || 'App'}:`, error, errorInfo);
  }

  try {
    // Obtener sesión activa para vincular usuario y agencia si existen
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const userId = user?.id || null;

    // Intentar obtener agency_id de metadatos o perfil si está disponible
    let agencyId = metadata?.agency_id || null;
    if (!agencyId && userId) {
      const { data: member } = await supabase
        .from('agency_members')
        .select('agency_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (member?.agency_id) {
        agencyId = member.agency_id;
      }
    }

    // Insertar reporte en la base de datos
    await supabase.from('system_errors_log').insert({
      agency_id: agencyId,
      user_id: userId,
      error_name: errorName,
      error_message: errorMessage,
      error_stack: errorStack,
      component_stack: componentStack,
      route: currentRoute,
      user_agent: userAgent,
      metadata: {
        ...metadata,
        component: componentName,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (loggingError) {
    // Si la base de datos o la red fallan, no rompemos la aplicación
    console.warn('[SystemErrorLogger] No se pudo enviar el reporte de error a Supabase:', loggingError);
  }
}
