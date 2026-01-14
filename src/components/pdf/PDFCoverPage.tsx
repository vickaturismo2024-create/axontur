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

  // Default background if no image
  const hasImage = quote.cover.imageUrl && quote.cover.imageUrl.trim() !== '';

  return (
    <div 
      className="pdf-page relative flex flex-col overflow-hidden"
      style={{
        background: hasImage ? undefined : 'linear-gradient(135deg, hsl(215 50% 23%) 0%, hsl(215 40% 35%) 100%)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}
    >
      {/* Background Image - Using img tag for better print support */}
      {hasImage && (
        <>
          <img 
            src={quote.cover.imageUrl} 
            alt="Cover background"
            className="absolute inset-0 w-full h-full object-cover"
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
      <div className="relative z-10 flex flex-1 flex-col h-full">
        {/* Header with Logo */}
        <div className="flex items-center justify-between" style={{ paddingBottom: '20px' }}>
          {template.logoUrl ? (
            <img src={template.logoUrl} alt="Logo" className="h-10 max-w-[120px] object-contain" />
          ) : (
            <div className="flex items-center gap-2">
              <div 
                className="flex items-center justify-center rounded-lg"
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  backgroundColor: 'hsl(38 70% 55%)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                <Plane className="h-4 w-4" style={{ color: 'hsl(215 50% 23%)' }} />
              </div>
              <span className="font-serif text-lg font-bold text-white">Vicka Turismo</span>
            </div>
          )}
          <p className="text-xs text-white/70">
            Armado el {format(new Date(), "d/MM/yyyy")}
          </p>
        </div>

        {/* Main Content - Centered */}
        <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ padding: '40px 0' }}>
          <p 
            className="uppercase tracking-[0.25em]"
            style={{ 
              marginBottom: '16px', 
              fontSize: '14px',
              color: 'hsl(38 70% 55%)',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            {quote.cover.title || 'PRESUPUESTO DE VIAJE'}
          </p>
          
          <h1 
            className="font-serif font-bold leading-tight text-white"
            style={{ marginBottom: '20px', fontSize: '42px' }}
          >
            {quote.trip.destination}
          </h1>
          
          {quote.cover.subtitle && (
            <p 
              className="text-white/80"
              style={{ marginBottom: '32px', maxWidth: '350px', fontSize: '14px', lineHeight: '1.5' }}
            >
              {quote.cover.subtitle}
            </p>
          )}

          <div className="flex items-center text-white/90" style={{ gap: '24px' }}>
            <div className="text-center">
              <p 
                className="uppercase tracking-wider"
                style={{ 
                  fontSize: '11px', 
                  color: 'hsl(38 70% 55%)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                Desde
              </p>
              <p className="font-serif text-white" style={{ marginTop: '4px', fontSize: '14px' }}>
                {formatDate(quote.trip.startDate)}
              </p>
            </div>
            <div 
              style={{ 
                height: '24px', 
                width: '1px', 
                backgroundColor: 'rgba(201, 162, 39, 0.5)',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }} 
            />
            <div className="text-center">
              <p 
                className="uppercase tracking-wider"
                style={{ 
                  fontSize: '11px', 
                  color: 'hsl(38 70% 55%)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                Hasta
              </p>
              <p className="font-serif text-white" style={{ marginTop: '4px', fontSize: '14px' }}>
                {formatDate(quote.trip.endDate)}
              </p>
            </div>
            <div 
              style={{ 
                height: '24px', 
                width: '1px', 
                backgroundColor: 'rgba(201, 162, 39, 0.5)',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }} 
            />
            <div className="text-center">
              <p 
                className="uppercase tracking-wider"
                style={{ 
                  fontSize: '11px', 
                  color: 'hsl(38 70% 55%)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                Pasajeros
              </p>
              <p className="font-serif text-white" style={{ marginTop: '4px', fontSize: '14px' }}>
                {quote.trip.travelers}
              </p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div 
          className="text-center"
          style={{ 
            marginTop: 'auto', 
            borderTop: '1px solid rgba(255,255,255,0.2)', 
            paddingTop: '20px' 
          }}
        >
          <p className="text-white/60" style={{ fontSize: '12px' }}>Preparado para</p>
          <p className="font-serif text-white" style={{ marginTop: '4px', fontSize: '18px' }}>
            {quote.client.name}
          </p>
        </div>
      </div>
    </div>
  );
}
