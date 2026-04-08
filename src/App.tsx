import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { QuotesProvider } from "@/contexts/QuotesContext";
import { TourProvider } from "@/contexts/TourContext";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import QuoteEditor from "./pages/QuoteEditor";
import Templates from "./pages/Templates";
import ExportPDF from "./pages/ExportPDF";
import Tutorials from "./pages/Tutorials";
import Auth from "./pages/Auth";
import PublicPDF from "./pages/PublicPDF";
import Agency from "./pages/Agency";
import Clients from "./pages/Clients";
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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <TourProvider>
              <TourOverlay />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/pdf/:id" element={<PublicPDF />} />
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/quote/:id" element={<ProtectedRoute><QuoteEditor /></ProtectedRoute>} />
                <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
                <Route path="/export/:id" element={<ProtectedRoute><ExportPDF /></ProtectedRoute>} />
                <Route path="/tutoriales" element={<ProtectedRoute><Tutorials /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TourProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QuotesProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
