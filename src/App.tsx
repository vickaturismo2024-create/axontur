import { lazy, Suspense } from "react";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
const Reservations      = lazy(() => import("./pages/Reservations"));
const ReservationImport = lazy(() => import("./pages/ReservationImport"));
const ReservationDetail = lazy(() => import("./pages/ReservationDetail"));
const DataImport        = lazy(() => import("./pages/DataImport"));

// ── Fallback de carga ────────────────────────────────────────────────────────
// Pantalla mínima mientras se descarga el chunk de la ruta.
// Usa las mismas variables CSS del sistema para respetar dark mode.
const PageLoader = () => (
  <div style={{
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "hsl(var(--background))",
  }}>
    <div style={{
      width: 32,
      height: 32,
      borderRadius: "50%",
      border: "2.5px solid hsl(var(--border))",
      borderTopColor: "hsl(var(--primary))",
      animation: "spin 0.7s linear infinite",
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

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
