import * as Sentry from "@sentry/react";

export function initSentry() {
  // En desarrollo no inicializamos Sentry para no ensuciar los reportes
  if (import.meta.env.DEV) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    // Captura el 10% de las sesiones como replay visual
    // (grabación de pantalla anónima para reproducir bugs)
    replaysSessionSampleRate: 0.1,

    // Captura el 100% de las sesiones donde ocurre un error
    replaysOnErrorSampleRate: 1.0,

    // Captura el 20% de las transacciones para performance
    tracesSampleRate: 0.2,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Enmascara texto e inputs para proteger datos sensibles
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],

    // Ignora errores conocidos que no son bugs reales
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      "Load failed",
      "NetworkError",
    ],
  });
}

// Helper para capturar errores manualmente con contexto extra
// Uso: captureError(error, { module: 'pricing', quoteId: '123' })
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.error("[Sentry DEV]", error, context);
    return;
  }
  Sentry.withScope(scope => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
