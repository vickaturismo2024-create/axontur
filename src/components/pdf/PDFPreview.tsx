import { Quote, Template } from '@/types/quote';
import { PDFCoverPage } from './PDFCoverPage';
import { PDFDetailsPages } from './PDFDetailsPages';
import { PDFContactPages } from './PDFContactPages';
import { PDFItineraryPages } from './PDFItineraryPages';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PDFPreviewProps {
  quote: Quote;
  template: Template;
}

export function PDFPreview({ quote, template }: PDFPreviewProps) {
  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="flex flex-col items-center gap-8 p-4">
        <div className="scale-[0.6] origin-top transform md:scale-75 lg:scale-90">
          {/* Página 1: Portada */}
          <div className="mb-8">
            <PDFCoverPage quote={quote} template={template} />
          </div>

          {/* Páginas de Detalles (múltiples si es necesario) */}
          <PDFDetailsPages quote={quote} template={template} />

          {/* Páginas de Contacto (múltiples si es necesario) */}
          <PDFContactPages quote={quote} template={template} />

          {/* Páginas de Itinerario (múltiples si es necesario) */}
          {template.sectionsToggles.itinerary && quote.itineraryDays.length > 0 && (
            <PDFItineraryPages quote={quote} template={template} />
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
