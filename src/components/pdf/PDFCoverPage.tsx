import { Quote, Template } from '@/types/quote';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plane } from 'lucide-react';

interface PDFCoverPageProps {
  quote: Quote;
  template: Template;
}

export function PDFCoverPage({ quote, template }: PDFCoverPageProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es });
  };

  return (
    <div className="pdf-page relative flex flex-col overflow-hidden">
      {/* Background Image - Using img tag for better print support */}
      {quote.cover.imageUrl && (
        <>
          <img 
            src={quote.cover.imageUrl} 
            alt="Cover background"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ 
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          />
          <div 
            className="absolute inset-0"
            style={{ 
              background: 'linear-gradient(to bottom, rgba(26, 43, 72, 0.75), rgba(26, 43, 72, 0.55), rgba(26, 43, 72, 0.85))',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }} 
          />
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* Header with Logo */}
        <div className="flex items-center justify-between pb-8">
          {template.logoUrl ? (
            <img src={template.logoUrl} alt="Logo" className="h-12" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold">
                <Plane className="h-5 w-5 text-navy" />
              </div>
              <span className="font-serif text-xl font-bold text-white">Vicka Turismo</span>
            </div>
          )}
          <p className="text-sm text-white/70">
            Armado el {format(new Date(), "d/MM/yyyy")}
          </p>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="mb-4 text-lg uppercase tracking-[0.3em] text-gold">
            {quote.cover.title || 'PRESUPUESTO DE VIAJE'}
          </p>
          
          <h1 className="mb-6 font-serif text-5xl font-bold leading-tight text-white">
            {quote.trip.destination}
          </h1>
          
          {quote.cover.subtitle && (
            <p className="mb-8 max-w-md text-lg text-white/80">
              {quote.cover.subtitle}
            </p>
          )}

          <div className="flex items-center gap-8 text-white/90">
            <div className="text-center">
              <p className="text-sm uppercase tracking-wider text-gold">Desde</p>
              <p className="mt-1 font-serif text-lg">{formatDate(quote.trip.startDate)}</p>
            </div>
            <div className="h-8 w-px bg-gold/50" />
            <div className="text-center">
              <p className="text-sm uppercase tracking-wider text-gold">Hasta</p>
              <p className="mt-1 font-serif text-lg">{formatDate(quote.trip.endDate)}</p>
            </div>
            <div className="h-8 w-px bg-gold/50" />
            <div className="text-center">
              <p className="text-sm uppercase tracking-wider text-gold">Pasajeros</p>
              <p className="mt-1 font-serif text-lg">{quote.trip.travelers}</p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="mt-auto border-t border-white/20 pt-6 text-center">
          <p className="text-sm text-white/60">Preparado para</p>
          <p className="mt-1 font-serif text-xl text-white">{quote.client.name}</p>
        </div>
      </div>
    </div>
  );
}
