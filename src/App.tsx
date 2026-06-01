import { lazy, Suspense, useEffect, useState } from "react";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Plane } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { QuotesProvider } from "@/contexts/QuotesContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { TourProvider } from "@/contexts/TourContext";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { BirthdayNotifier } from "@/components/notifications/BirthdayNotifier";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

// ── Páginas públicas ─────────────────────────────────────────────────────────
// Se cargan de forma estática porque no tienen dependencias pesadas
// y necesitan renderizar sin autenticación previa.
import Auth             from "./pages/Auth";
import PublicPDF        from "./pages/PublicPDF";
import AcceptInvitation from "./pages/AcceptInvitation";
import Unsubscribe      from "./pages/Unsubscribe";
import NotFound         from "./pages/NotFound";

// ── Páginas protegidas — lazy ────────────────────────────────────────────────
// Cada una genera su propio chunk. Las libs pesadas (recharts, ExcelJS,
// jsPDF, pdfjs-dist) quedan fuera del bundle inicial.
const Dashboard         = lazy(() => import("./pages/Dashboard"));
const Quotes            = lazy(() => import("./pages/Quotes"));
const QuoteEditor       = lazy(() => import("./pages/QuoteEditor"));
const Templates         = lazy(() => import("./pages/Templates"));
const ExportPDF         = lazy(() => import("./pages/ExportPDF"));
const Tutorials         = lazy(() => import("./pages/Tutorials"));
const Agency            = lazy(() => import("./pages/Agency"));
const Settings          = lazy(() => import("./pages/Settings"));
const Clients           = lazy(() => import("./pages/Clients"));
const ClientDetail      = lazy(() => import("./pages/ClientDetail"));
const Suppliers         = lazy(() => import("./pages/Suppliers"));
const SupplierDetail    = lazy(() => import("./pages/SupplierDetail"));
const Reports           = lazy(() => import("./pages/Reports"));
const Calendar          = lazy(() => import("./pages/Calendar"));
const Files             = lazy(() => import("./pages/Files"));
const FileDetail        = lazy(() => import("./pages/FileDetail"));
const Accounts          = lazy(() => import("./pages/Accounts"));
const CashBox           = lazy(() => import("./pages/CashBox"));
const Reservations      = lazy(() => import("./pages/Reservations"));
const ReservationImport = lazy(() => import("./pages/ReservationImport"));
const ReservationDetail = lazy(() => import("./pages/ReservationDetail"));
const DataImport        = lazy(() => import("./pages/DataImport"));

// ── Fallback de carga ────────────────────────────────────────────────────────
// Pantalla mínima mientras se descarga el chunk de la ruta.
// Usa las mismas variables CSS del sistema para respetar dark mode.
const PageLoader = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background/95 backdrop-blur-md animate-fadeIn transition-all duration-300">
    <div className="relative flex flex-col items-center gap-4">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
        <Plane className="h-6 w-6 text-primary animate-pulse" />
      </div>
      <div className="text-center">
        <h3 className="font-sans text-sm font-bold text-foreground tracking-widest uppercase">AxonTur</h3>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider animate-pulse font-medium">Cargando aplicación...</p>
      </div>
    </div>
  </div>
);

const RouteTransitionIndicator = () => {
  const location = useLocation();
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    setTransitioning(true);
    const timer = setTimeout(() => setTransitioning(false), 250);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!transitioning) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--gold))] to-[hsl(var(--primary))] z-[9999] route-progress-bar" />
      <style>{`
        .route-progress-bar {
          animation: routeProgress 0.25s ease-out forwards;
          transform-origin: left;
        }
        @keyframes routeProgress {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.7); }
          100% { transform: scaleX(1); opacity: 0; }
        }
      `}</style>
    </>
  );
};

// ── QueryClient ──────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// ── App ──────────────────────────────────────────────────────────────────────
const App = () => (
  <Sentry.ErrorBoundary fallback={
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      background: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
      fontFamily: "sans-serif",
    }}>
      <p style={{ fontSize: "16px", fontWeight: 500 }}>Ocurrió un error inesperado.</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "8px 20px",
          borderRadius: "8px",
          border: "1px solid hsl(var(--border))",
          background: "transparent",
          cursor: "pointer",
          color: "hsl(var(--foreground))",
          fontSize: "14px",
        }}
      >
        Recargar página
      </button>
    </div>
  }>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <QuotesProvider>
          <SettingsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <TourProvider>
                  <TourOverlay />
                  <BirthdayNotifier />
                  <RouteTransitionIndicator />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Públicas — sin lazy, sin ProtectedRoute */}
                      <Route path="/auth"               element={<Auth />} />
                      <Route path="/accept-invitation"  element={<AcceptInvitation />} />
                      <Route path="/unsubscribe"         element={<Unsubscribe />} />
                      <Route path="/pdf/:id"             element={<PublicPDF />} />

                      {/* Protegidas — lazy */}
                      <Route path="/"                    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/quotes"              element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
                      <Route path="/quote/:id"           element={<ProtectedRoute><QuoteEditor /></ProtectedRoute>} />
                      <Route path="/templates"           element={<ProtectedRoute><Templates /></ProtectedRoute>} />
                      <Route path="/export/:id"          element={<ProtectedRoute><ExportPDF /></ProtectedRoute>} />
                      <Route path="/agency"              element={<ProtectedRoute><Agency /></ProtectedRoute>} />
                      <Route path="/settings"            element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/clients"             element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                      <Route path="/clients/:id"         element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
                      <Route path="/suppliers"           element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
                      <Route path="/suppliers/:id"       element={<ProtectedRoute><SupplierDetail /></ProtectedRoute>} />
                      <Route path="/files"               element={<ProtectedRoute><Files /></ProtectedRoute>} />
                      <Route path="/files/:id"           element={<ProtectedRoute><FileDetail /></ProtectedRoute>} />
                      <Route path="/accounts"            element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
                      <Route path="/caja"                element={<ProtectedRoute><CashBox /></ProtectedRoute>} />
                      <Route path="/reportes"            element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                      <Route path="/tutoriales"          element={<ProtectedRoute><Tutorials /></ProtectedRoute>} />
                      <Route path="/calendar"            element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                      <Route path="/reservations"        element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
                      <Route path="/reservations/import" element={<ProtectedRoute><ReservationImport /></ProtectedRoute>} />
                      <Route path="/reservations/:id"    element={<ProtectedRoute><ReservationDetail /></ProtectedRoute>} />
                      <Route path="/importar"            element={<ProtectedRoute><DataImport /></ProtectedRoute>} />

                      <Route path="*"                    element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </TourProvider>
              </BrowserRouter>
            </TooltipProvider>
          </SettingsProvider>
        </QuotesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
