import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Quote, Template } from '@/types/quote';
import { defaultTemplate } from '@/data/demoData';
import { PDFCoverPage } from '@/components/pdf/PDFCoverPage';
import { PDFDetailsPages } from '@/components/pdf/PDFDetailsPages';
import { PDFContactPages } from '@/components/pdf/PDFContactPages';
import { PDFItineraryPages } from '@/components/pdf/PDFItineraryPages';
import { Loader2 } from 'lucide-react';

// Transform snake_case DB row to camelCase Quote
function mapDbRowToQuote(row: any): Quote {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    templateId: row.template_id || '',
    client: row.client as any,
    trip: row.trip as any,
    cover: row.cover as any,
    flights: row.flights as any,
    lodging: row.lodging as any,
    lodgings: row.lodgings as any,
    transfers: row.transfers as any,
    trains: row.trains as any,
    ferries: row.ferries as any,
    rentalCars: row.rental_cars as any,
    activities: row.activities as any,
    cruise: row.cruise as any,
    insurance: row.insurance as any,
    pricing: row.pricing as any,
    itineraryDays: row.itinerary_days as any,
  };
}

function mapDbRowToTemplate(row: any): Template {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url || '',
    colors: row.colors as any,
    fonts: row.fonts as any,
    styles: row.styles as any,
    whatsappAgents: row.whatsapp_agents as any,
    footerText: row.footer_text || '',
    sectionsToggles: row.sections_toggles as any,
  };
}

const PDF_PAGE_WIDTH = 794; // 210mm in px
const MOBILE_BREAKPOINT = 768;

const PublicPDF = () => {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [template, setTemplate] = useState<Template>(defaultTemplate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Responsive scale + mobile detection
  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const mobile = containerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);

      if (!mobile) {
        const padding = 32;
        const availableWidth = containerWidth - padding;
        const newScale = Math.min(availableWidth / PDF_PAGE_WIDTH, 1);
        setScale(newScale);
      }
    }
    if (contentRef.current && !isMobile) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isMobile]);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [updateScale]);

  useEffect(() => {
    if (!id) return;

    const fetchQuote = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-quote?id=${id}`;
        const response = await fetch(url, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });

        if (!response.ok) {
          setError('Presupuesto no encontrado');
          setLoading(false);
          return;
        }

        const result = await response.json();
        setQuote(mapDbRowToQuote(result.quote));
        if (result.template) {
          setTemplate(mapDbRowToTemplate(result.template));
        }
      } catch (err) {
        setError('Error al cargar el presupuesto');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Cargando presupuesto...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">{error || 'Presupuesto no encontrado'}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            El enlace puede haber expirado o el presupuesto no existe.
          </p>
        </div>
      </div>
    );
  }

  const pdfContent = (
    <div ref={contentRef} className={`flex flex-col items-center gap-8 print:gap-0 print:items-stretch ${isMobile ? 'pdf-mobile-view gap-4' : ''}`}>
      <PDFCoverPage quote={quote} template={template} />
      <PDFDetailsPages quote={quote} template={template} />
      <PDFContactPages quote={quote} template={template} />
      {template.sectionsToggles.itinerary && quote.itineraryDays.length > 0 && (
        <PDFItineraryPages quote={quote} template={template} />
      )}
    </div>
  );

  // Mobile: render pages directly without transform scaling
  if (isMobile) {
    return (
      <div ref={containerRef} className="min-h-screen bg-muted overflow-x-hidden print:bg-white print:min-h-0">
        <div className="py-2 px-1 print:p-0 print:m-0">
          {pdfContent}
        </div>
      </div>
    );
  }

  // Desktop: keep A4 scaled rendering
  return (
    <div ref={containerRef} className="min-h-screen bg-muted overflow-x-hidden print:bg-white print:min-h-0">
      <div className="mx-auto py-4 print:p-0 print:m-0 print:max-w-none">
        <div
          className="print:!h-auto"
          style={{
            height: contentHeight ? contentHeight * scale : 'auto',
            overflow: 'hidden',
          }}
        >
          <div
            className="print:!transform-none"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
            }}
          >
            {pdfContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPDF;
