import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QuotesProvider } from "@/contexts/QuotesContext";
import Dashboard from "./pages/Dashboard";
import QuoteEditor from "./pages/QuoteEditor";
import Templates from "./pages/Templates";
import ExportPDF from "./pages/ExportPDF";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <QuotesProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/quote/:id" element={<QuoteEditor />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/export/:id" element={<ExportPDF />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QuotesProvider>
  </QueryClientProvider>
);

export default App;
