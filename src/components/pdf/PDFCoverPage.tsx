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

  // Template colors
  const primaryColor = template.colors.primary;
  const accentColor = template.colors.accent;

  // Default background if no image
  const hasImage = quote.cover.imageUrl && quote.cover.imageUrl.trim() !== '';

  return (
    <div 
      className="pdf-page relative flex flex-col overflow-hidden"
      style={{
        background: hasImage ? undefined : `linear-gradient(135deg, ${primaryColor} 0%, ${template.colors.secondary} 100%)`,
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
              background: `linear-gradient(to bottom, ${primaryColor}cc, ${primaryColor}99, ${primaryColor}dd)`,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }} 
          />
        </>
      )}
      
      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col h-full">
        {/* Header with Logo - positioned top right */}
        <div className="flex items-center justify-end" style={{ paddingBottom: '12px' }}>
          <div className="flex items-center gap-4">
            <p className="text-xs text-white/60">
              Armado el {format(new Date(), "d/MM/yyyy")}
            </p>
            {template.logoUrl ? (
              <img 
                src={template.logoUrl} 
                alt="Logo" 
                className="object-contain"
                style={{ height: '100px', maxWidth: '200px' }}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <div 
                  className="flex items-center justify-center rounded"
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    backgroundColor: accentColor,
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  <Plane className="h-3 w-3" style={{ color: primaryColor }} />
                </div>
                <span className="text-sm font-medium text-white/90">Vicka Turismo</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Centered */}
        <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ padding: '40px 0' }}>
          <p 
            className="uppercase tracking-[0.25em]"
            style={{ 
              marginBottom: '16px', 
              fontSize: '14px',
              color: accentColor,
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
                  color: accentColor,
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
                backgroundColor: `${accentColor}80`,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }} 
            />
            <div className="text-center">
              <p 
                className="uppercase tracking-wider"
                style={{ 
                  fontSize: '11px', 
                  color: accentColor,
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
                backgroundColor: `${accentColor}80`,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }} 
            />
            <div className="text-center">
              <p 
                className="uppercase tracking-wider"
                style={{ 
                  fontSize: '11px', 
                  color: accentColor,
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
