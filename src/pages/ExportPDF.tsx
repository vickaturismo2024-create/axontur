import { useParams, useNavigate } from 'react-router-dom';
import { useQuotes } from '@/contexts/QuotesContext';
import { defaultTemplate } from '@/data/demoData';
import { PDFCoverPage } from '@/components/pdf/PDFCoverPage';
import { PDFDetailsPages } from '@/components/pdf/PDFDetailsPages';
import { PDFContactPages } from '@/components/pdf/PDFContactPages';
import { PDFItineraryPages } from '@/components/pdf/PDFItineraryPages';
import { PDFShareMenu } from '@/components/pdf/PDFShareMenu';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ExportPDF = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { quotes, templates, updateQuote } = useQuotes();

  const quote = quotes.find(q => q.id === id);
  const template = quote 
    ? templates.find(t => t.id === quote.templateId) || defaultTemplate
    : defaultTemplate;

  if (!quote) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Presupuesto no encontrado</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleSetExpiry = async (expiry: string | undefined) => {
    try {
      await updateQuote({ ...quote, publicLinkExpiry: expiry || '' });
    } catch (e) {
      console.error('Error setting expiry:', e);
    }
  };

  return (
    <div className="min-h-screen bg-muted print:bg-white print:min-h-0">
      {/* Controls - Hidden when printing */}
      <div className="no-print sticky top-0 z-50 border-b bg-card p-4 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <PDFShareMenu quote={quote} template={template} onPrint={handlePrint} onSetExpiry={handleSetExpiry} />
        </div>
      </div>

      {/* PDF Pages - Centered for preview, full-width for print */}
      <div className="container mx-auto py-8 print:p-0 print:m-0 print:max-w-none">
        <div className="flex flex-col items-center gap-8 print:gap-0 print:items-stretch">
          {/* Página 1: Portada */}
          <PDFCoverPage quote={quote} template={template} />

          {/* Páginas de Detalles (1 o más) */}
          <PDFDetailsPages quote={quote} template={template} />

          {/* Páginas de Contacto (1 o más) */}
          <PDFContactPages quote={quote} template={template} />

          {/* Páginas de Itinerario (1 o más) */}
          {template.sectionsToggles.itinerary && quote.itineraryDays.length > 0 && (
            <PDFItineraryPages quote={quote} template={template} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportPDF;
