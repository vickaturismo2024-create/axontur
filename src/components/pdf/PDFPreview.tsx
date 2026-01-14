import { Quote, Template } from '@/types/quote';
import { PDFCoverPage } from './PDFCoverPage';
import { PDFDetailsPage } from './PDFDetailsPage';
import { PDFContactPage } from './PDFContactPage';
import { PDFItineraryPage } from './PDFItineraryPage';
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

          {/* Página 2: Detalles */}
          <div className="mb-8">
            <PDFDetailsPage quote={quote} template={template} />
          </div>

          {/* Página 3: Contacto */}
          <div className="mb-8">
            <PDFContactPage quote={quote} template={template} />
          </div>

          {/* Página 4: Itinerario */}
          {template.sectionsToggles.itinerary && quote.itineraryDays.length > 0 && (
            <div className="mb-8">
              <PDFItineraryPage quote={quote} template={template} />
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
