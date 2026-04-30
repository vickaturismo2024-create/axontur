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
import Dashboard from "./pages/Dashboard";
import QuoteEditor from "./pages/QuoteEditor";
import Templates from "./pages/Templates";
import ExportPDF from "./pages/ExportPDF";
import Tutorials from "./pages/Tutorials";
import Auth from "./pages/Auth";
import PublicPDF from "./pages/PublicPDF";
import Agency from "./pages/Agency";
import Settings from "./pages/Settings";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import Reports from "./pages/Reports";
import Calendar from "./pages/Calendar";
import Files from "./pages/Files";
import FileDetail from "./pages/FileDetail";
import Accounts from "./pages/Accounts";
import Reservations from "./pages/Reservations";
import ReservationImport from "./pages/ReservationImport";
import ReservationDetail from "./pages/ReservationDetail";
import AcceptInvitation from "./pages/AcceptInvitation";
import NotFound from "./pages/NotFound";

// Create QueryClient outside component to prevent recreation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => (
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
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/pdf/:id" element={<PublicPDF />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/quote/:id" element={<ProtectedRoute><QuoteEditor /></ProtectedRoute>} />
                <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
                <Route path="/export/:id" element={<ProtectedRoute><ExportPDF /></ProtectedRoute>} />
                <Route path="/agency" element={<ProtectedRoute><Agency /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
                <Route path="/suppliers/:id" element={<ProtectedRoute><SupplierDetail /></ProtectedRoute>} />
                <Route path="/files" element={<ProtectedRoute><Files /></ProtectedRoute>} />
                <Route path="/files/:id" element={<ProtectedRoute><FileDetail /></ProtectedRoute>} />
                <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
                <Route path="/reportes" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/tutoriales" element={<ProtectedRoute><Tutorials /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                <Route path="/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
                <Route path="/reservations/import" element={<ProtectedRoute><ReservationImport /></ProtectedRoute>} />
                <Route path="/reservations/:id" element={<ProtectedRoute><ReservationDetail /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TourProvider>
          </BrowserRouter>
        </TooltipProvider>
        </SettingsProvider>
      </QuotesProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
