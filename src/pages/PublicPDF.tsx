import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Quote, Template } from '@/types/quote';
import { defaultTemplate } from '@/data/demoData';
import { PDFCoverPage } from '@/components/pdf/PDFCoverPage';
import { PDFDetailsPages } from '@/components/pdf/PDFDetailsPages';
import { PDFContactPages } from '@/components/pdf/PDFContactPages';
import { PDFItineraryPages } from '@/components/pdf/PDFItineraryPages';
import { Loader2, CheckCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { generatePDF } from '@/lib/generatePDF';

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
    approvedAt: row.approved_at,
    approvedByName: row.approved_by_name,
  };
}

function mapDbRowToTemplate(row: any): Template {
  return {
    id: row.id,
    name: row.name,
    agencyName: row.agency_name || '',
    agencyPhone: row.agency_phone || '',
    agencyInstagram: row.agency_instagram || '',
    agencyTagline: row.agency_tagline || '',
    logoUrl: row.logo_url || '',
    colors: row.colors as any,
    fonts: row.fonts as any,
    styles: row.styles as any,
    whatsappAgents: row.whatsapp_agents as any,
    footerText: row.footer_text || '',
    sectionsToggles: row.sections_toggles as any,
  };
}

const PDF_PAGE_WIDTH = 794;

const PublicPDF = () => {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [template, setTemplate] = useState<Template>(defaultTemplate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Approval state
  const [approvalName, setApprovalName] = useState('');
  const [approving, setApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Desktop scale calculation
  const updateScale = useCallback(() => {
    if (!isMobile && containerRef.current) {
      const padding = 32;
      const availableWidth = containerRef.current.clientWidth - padding;
      const newScale = Math.min(availableWidth / PDF_PAGE_WIDTH, 1);
      setScale(newScale);
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
          headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || 'Presupuesto no encontrado');
          setLoading(false);
          return;
        }

        const result = await response.json();
        const q = mapDbRowToQuote(result.quote);
        setQuote(q);
        setIsApproved(!!q.approvedAt);
        if (result.template) {
          setTemplate(mapDbRowToTemplate(result.template));
        }

        // Track view (fire and forget)
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/quote_views`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ quote_id: id }),
        }).catch(() => {});
      } catch (err) {
        setError('Error al cargar el presupuesto');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [id]);

  useEffect(() => {
    if (!loading && quote) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('download') === 'true') {
        const timer = setTimeout(async () => {
          try {
            await generatePDF('#pdf-export-container', `presupuesto-${quote.trip.destination.replace(/\s+/g, '-')}.pdf`);
            toast.success('Descarga del PDF iniciada');
          } catch (e) {
            console.error('Error generating auto PDF:', e);
            toast.error('Error al descargar el PDF automáticamente');
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, quote]);

  const handleApprove = async () => {
    if (!id || !approvalName.trim()) return;
    setApproving(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-quote`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, name: approvalName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsApproved(true);
        toast.success('¡Presupuesto aprobado exitosamente!');
      } else if (res.status === 409) {
        setIsApproved(true);
      } else {
        toast.error(data.error || 'Error al aprobar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setApproving(false);
    }
  };

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
        <div className="text-center px-4">
          <p className="text-lg font-medium text-destructive">{error || 'Presupuesto no encontrado'}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            El enlace puede haber expirado o el presupuesto no existe.
          </p>
        </div>
      </div>
    );
  }

  const approvalSection = (
    <div className={`print:hidden ${isMobile ? 'px-3 pb-4' : 'mx-auto max-w-lg my-8'}`}>
      {isApproved ? (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <h3 className="mt-3 text-lg font-semibold text-emerald-800">Presupuesto aprobado</h3>
          <p className="mt-1 text-sm text-emerald-600">
            {quote.approvedByName ? `Aprobado por ${quote.approvedByName}` : 'Este presupuesto ya fue aprobado'}
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border-2 border-primary/20 bg-card shadow-lg ${isMobile ? 'p-4' : 'p-6'}`}>
          <h3 className={`font-semibold text-center mb-1 ${isMobile ? 'text-base' : 'text-lg'}`}>¿Aprobás este presupuesto?</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Ingresá tu nombre para confirmar la aprobación
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Tu nombre completo"
              value={approvalName}
              onChange={(e) => setApprovalName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleApprove} disabled={!approvalName.trim() || approving}>
              {approving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Aprobar
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const pdfContent = (
    <div ref={contentRef} className={`flex flex-col items-center print:gap-0 print:items-stretch ${isMobile ? 'gap-2' : 'gap-8'}`}>
      <PDFCoverPage quote={quote} template={template} isMobile={isMobile} />
      <PDFDetailsPages quote={quote} template={template} isMobile={isMobile} />
      <PDFContactPages quote={quote} template={template} isMobile={isMobile} />
      {template.sectionsToggles.itinerary && quote.itineraryDays.length > 0 && (
        <PDFItineraryPages quote={quote} template={template} isMobile={isMobile} />
      )}
    </div>
  );

  const desktopPdfContentForCapture = (
    <div
      id="pdf-export-container"
      className="absolute left-[-9999px] top-[-9999px] flex flex-col items-center gap-8"
      style={{ width: '794px' }}
    >
      <PDFCoverPage quote={quote} template={template} isMobile={false} />
      <PDFDetailsPages quote={quote} template={template} isMobile={false} />
      <PDFContactPages quote={quote} template={template} isMobile={false} />
      {template.sectionsToggles.itinerary && quote.itineraryDays.length > 0 && (
        <PDFItineraryPages quote={quote} template={template} isMobile={false} />
      )}
    </div>
  );

  // Mobile layout: full-width, no scaling
  if (isMobile) {
    return (
      <div ref={containerRef} className="min-h-screen bg-muted overflow-x-hidden print:bg-white print:min-h-0">
        <div className="py-2 px-1 print:p-0 print:m-0">
          {pdfContent}
          {approvalSection}
        </div>
        {desktopPdfContentForCapture}
      </div>
    );
  }

  // Desktop layout: scaled A4 pages
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
        {approvalSection}
      </div>
      {desktopPdfContentForCapture}
    </div>
  );
};

export default PublicPDF;
