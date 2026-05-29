import { Quote, Template, OccupancyPricing } from '@/types/quote';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plane } from 'lucide-react';
import { t } from '@/lib/templateStyles';


interface PDFCoverPageProps {
  quote: Quote;
  template: Template;
  isMobile?: boolean;
}

export function PDFCoverPage({ quote, template, isMobile = false }: PDFCoverPageProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = parseISO(dateString);
      const dateFormat = template.styles.dateFormat || 'long';
      if (dateFormat === 'short') return format(date, "dd/MM/yyyy");
      if (dateFormat === 'medium') return format(date, "d MMM yyyy", { locale: es });
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch { return dateString; }
  };

  const primaryColor = template.colors.primary;
  const accentColor = template.colors.accent;
  const hasImage = quote.cover.imageUrl && quote.cover.imageUrl.trim() !== '';

  // New style options with defaults
  const coverLayout = template.styles.coverLayout || 'classic';
  const coverOverlay = template.styles.coverOverlay || 'gradient';
  const overlayOpacity = template.styles.coverOverlayOpacity ?? 70;
  const coverTextAlign = template.styles.coverTextAlign || 'center';
  const logoPos = template.styles.logoPosition || 'top-right';
  const logoSize = template.styles.logoSize || 'medium';
  const showCreationDate = template.styles.showCreationDate !== false;
  const preparedForLabel = template.styles.preparedForLabel || t(template, 'preparedFor');

  const logoSizePx = logoSize === 'small' ? '60px' : logoSize === 'large' ? '150px' : '100px';
  const logoMaxWidth = logoSize === 'small' ? '120px' : logoSize === 'large' ? '300px' : '200px';

  const logoJustify = logoPos === 'top-left' ? 'flex-start' : logoPos === 'top-center' ? 'center' : 'flex-end';
  const isBottomLogo = logoPos === 'bottom-center';

  const textAlignItems = coverTextAlign === 'left' ? 'flex-start' : coverTextAlign === 'right' ? 'flex-end' : 'center';

  // Overlay style
  const getOverlayStyle = (): React.CSSProperties => {
    const opacity = overlayOpacity / 100;
    switch (coverOverlay) {
      case 'solid': return { backgroundColor: primaryColor, opacity, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
      case 'blur': return { backdropFilter: 'blur(8px)', backgroundColor: `${primaryColor}40`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
      case 'vignette': return { background: `radial-gradient(ellipse at center, transparent 30%, ${primaryColor}cc 100%)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };
      case 'none': return { display: 'none' };
      case 'gradient':
      default: return { 
        background: `linear-gradient(to bottom, ${primaryColor}cc, ${primaryColor}${Math.round(opacity * 155).toString(16).padStart(2, '0')}, ${primaryColor}dd)`,
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'
      };
    }
  };

  // Logo element
  const logoElement = template.logoUrl ? (
    <img src={template.logoUrl} alt="Logo" className="object-contain" style={{ height: logoSizePx, maxWidth: logoMaxWidth }} />
  ) : (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center justify-center rounded" style={{ width: '24px', height: '24px', backgroundColor: accentColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <Plane className="h-3 w-3" style={{ color: primaryColor }} />
      </div>
      <span className="text-sm font-medium text-white/90">{template.agencyName || template.name}</span>
    </div>
  );

  // Content block (dates, destination, subtitle)
  const contentBlock = (
    <div className="flex flex-1 flex-col justify-center" style={{ padding: isMobile ? '24px 0' : '40px 0', textAlign: coverTextAlign, alignItems: textAlignItems }}>
      <p className="uppercase tracking-[0.25em]" style={{ marginBottom: isMobile ? '10px' : '16px', fontSize: isMobile ? '12px' : '14px', color: accentColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        {quote.cover.title || t(template, 'coverEyebrow')}
      </p>
      <h1 className="font-serif font-bold leading-tight text-white" style={{ marginBottom: isMobile ? '12px' : '20px', fontSize: isMobile ? '28px' : '42px' }}>
        {quote.trip.destination}
      </h1>
      {quote.cover.subtitle && (
        <p className="text-white/80" style={{ marginBottom: isMobile ? '20px' : '32px', maxWidth: '350px', fontSize: isMobile ? '13px' : '14px', lineHeight: '1.5', ...(coverTextAlign === 'center' ? { margin: `0 auto ${isMobile ? '20px' : '32px'}` } : {}) }}>
          {quote.cover.subtitle}
        </p>
      )}
      <div className={`flex items-center text-white/90 ${isMobile ? 'flex-wrap justify-center' : ''}`} style={{ gap: isMobile ? '12px' : '24px', justifyContent: isMobile ? 'center' : textAlignItems }}>
        <div className="text-center">
          <p className="uppercase tracking-wider" style={{ fontSize: isMobile ? '10px' : '11px', color: accentColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t(template, 'from')}</p>
          <p className="font-serif text-white" style={{ marginTop: '4px', fontSize: isMobile ? '12px' : '14px' }}>{formatDate(quote.trip.startDate)}</p>
        </div>
        <div style={{ height: '24px', width: '1px', backgroundColor: `${accentColor}80`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
        <div className="text-center">
          <p className="uppercase tracking-wider" style={{ fontSize: isMobile ? '10px' : '11px', color: accentColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t(template, 'to')}</p>
          <p className="font-serif text-white" style={{ marginTop: '4px', fontSize: isMobile ? '12px' : '14px' }}>{formatDate(quote.trip.endDate)}</p>
        </div>
        <div style={{ height: '24px', width: '1px', backgroundColor: `${accentColor}80`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
        <div className="text-center">
          <p className="uppercase tracking-wider" style={{ fontSize: isMobile ? '10px' : '11px', color: accentColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t(template, 'travelers')}</p>
          <p className="font-serif text-white" style={{ marginTop: '4px', fontSize: isMobile ? '12px' : '14px' }}>{quote.trip.travelers}</p>
          {quote.pricing?.useOccupancyPricing && quote.pricing?.occupancyPricing && quote.pricing.occupancyPricing.length > 0 && (
            <p style={{ marginTop: '2px', fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>
              {quote.pricing.occupancyPricing.map((occ: OccupancyPricing) => {
                const label = occ.roomType === 'single' ? 'SGL' : occ.roomType === 'double' ? 'DBL' : occ.roomType === 'triple' ? 'TPL' : occ.roomType === 'quadruple' ? 'QUAD' : 'HAB';
                return `${occ.roomCount} ${label}`;
              }).join(' + ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Client block
  const clientBlock = (
    <div className="text-center" style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '20px' }}>
      <p className="text-white/60" style={{ fontSize: '12px' }}>{preparedForLabel}</p>
      <p className="font-serif text-white" style={{ marginTop: '4px', fontSize: '18px' }}>{quote.client.name}</p>
    </div>
  );

  // Creation date
  const creationDate = showCreationDate ? (
    <p className="text-xs text-white/60">Armado el {format(new Date(), "d/MM/yyyy")}</p>
  ) : null;

  // Logo header
  const logoHeader = !isBottomLogo ? (
    <div className="flex items-center" style={{ paddingBottom: '12px', justifyContent: logoJustify }}>
      <div className="flex items-center gap-4">
        {creationDate}
        {logoElement}
      </div>
    </div>
  ) : (
    <div className="flex items-center" style={{ paddingBottom: '12px', justifyContent: 'flex-end' }}>
      {creationDate}
    </div>
  );

  // Bottom logo
  const bottomLogo = isBottomLogo ? (
    <div className="flex justify-center" style={{ paddingBottom: '12px' }}>{logoElement}</div>
  ) : null;

  // SPLIT layout
  if (coverLayout === 'split') {
    return (
      <div className={`${isMobile ? 'pdf-page-mobile pdf-cover-page-mobile' : 'pdf-page pdf-cover-page'} relative flex`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        {/* Left: content */}
        <div className="flex flex-col" style={{ flex: 1, background: `linear-gradient(135deg, ${primaryColor}, ${template.colors.secondary})`, padding: '20px' }}>
          <div className="relative z-10 flex flex-1 flex-col h-full">
            {logoHeader}
            {contentBlock}
            {bottomLogo}
            {clientBlock}
          </div>
        </div>
        {/* Right: image */}
        {hasImage && (
          <div style={{ flex: 1, position: 'relative' }}>
            <img src={quote.cover.imageUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}
        {!hasImage && (
          <div style={{ flex: 1, background: `linear-gradient(135deg, ${template.colors.secondary}, ${accentColor})` }} />
        )}
      </div>
    );
  }

  // MINIMAL layout (no image)
  if (coverLayout === 'minimal') {
    return (
      <div className={`${isMobile ? 'pdf-page-mobile pdf-cover-page-mobile' : 'pdf-page pdf-cover-page'} relative flex flex-col`} style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${template.colors.secondary} 100%)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div className="relative z-10 flex flex-1 flex-col h-full">
          {logoHeader}
          {contentBlock}
          {bottomLogo}
          {clientBlock}
        </div>
      </div>
    );
  }

  // CLASSIC and FULLOVERLAY (same structure, fullOverlay just has denser overlay)
  return (
    <div className={`${isMobile ? 'pdf-page-mobile pdf-cover-page-mobile' : 'pdf-page pdf-cover-page'} relative flex flex-col`} style={{ background: hasImage ? undefined : `linear-gradient(135deg, ${primaryColor} 0%, ${template.colors.secondary} 100%)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      {hasImage && (
        <>
          <img src={quote.cover.imageUrl} alt="Cover background" className="absolute inset-0 w-full h-full object-cover" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          <div className="absolute inset-0" style={getOverlayStyle()} />
        </>
      )}
      <div className="relative z-10 flex flex-1 flex-col h-full">
        {logoHeader}
        {contentBlock}
        {bottomLogo}
        {clientBlock}
      </div>
    </div>
  );
}
