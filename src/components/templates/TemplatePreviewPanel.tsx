import { Template } from '@/types/quote';
import { Plane, Building2, Shield, Phone, MessageCircle, MapPin, Calendar, CheckCircle2, ChevronRight, Star, Circle } from 'lucide-react';

interface TemplatePreviewPanelProps {
  template: Template;
}

// Mock data for preview
const mockData = {
  destination: 'Cancún',
  client: 'María García',
  travelers: 2,
  startDate: '15 de Marzo, 2026',
  endDate: '22 de Marzo, 2026',
  subtitle: 'Escapada tropical con todo incluido',
  flights: [
    { route: 'Buenos Aires → Cancún', date: '15 Mar', time: '08:30 - 16:45', flight: 'AR 1234' },
    { route: 'Cancún → Buenos Aires', date: '22 Mar', time: '18:00 - 06:30', flight: 'AR 1235' },
  ],
  hotel: 'Grand Palladium Resort & Spa',
  hotelCategory: '★★★★★',
  regime: 'All Inclusive',
  nights: 7,
  itinerary: [
    { day: 1, title: 'Llegada a Cancún', desc: 'Traslado al hotel y check-in', activities: ['Check-in', 'Cena de bienvenida'] },
    { day: 2, title: 'Playa y Relax', desc: 'Día libre en el resort', activities: ['Snorkel', 'Spa'] },
    { day: 3, title: 'Chichén Itzá', desc: 'Excursión a las ruinas mayas', activities: ['Tour guiado', 'Cenote'] },
  ],
};

export function TemplatePreviewPanel({ template }: TemplatePreviewPanelProps) {
  const p = template.colors.primary;
  const s = template.colors.secondary;
  const a = template.colors.accent;
  const bg = template.colors.background || '#ffffff';
  const cardBg = template.colors.cardBackground || '#f8f9fa';
  const textColor = template.colors.text || p;

  const headingFont = template.fonts.heading || 'Playfair Display';
  const bodyFont = template.fonts.body || 'Inter';

  const coverLayout = template.styles.coverLayout || 'classic';
  const headingStyle = template.styles.headingStyle || 'underline';
  const iconStyle = template.styles.iconStyle || 'filled';
  const density = template.styles.contentDensity || 'normal';
  const coverOverlay = template.styles.coverOverlay || 'gradient';
  const overlayOpacity = template.styles.coverOverlayOpacity ?? 70;
  const coverTextAlign = template.styles.coverTextAlign || 'center';
  const logoPos = template.styles.logoPosition || 'top-right';
  const logoSize = template.styles.logoSize || 'medium';
  const tableStyle = template.styles.tableStyle || 'clean';
  const footerStyle = template.styles.footerStyle || 'simple';
  const showCreationDate = template.styles.showCreationDate !== false;
  const preparedForLabel = template.styles.preparedForLabel || 'Preparado para';

  const densityPadding = density === 'compact' ? '6px' : density === 'spacious' ? '16px' : '10px';
  const densityFontSize = density === 'compact' ? '9px' : density === 'spacious' ? '13px' : '11px';

  const logoSizePx = logoSize === 'small' ? '40px' : logoSize === 'large' ? '80px' : '60px';

  // Overlay style for cover
  const getOverlayStyle = (): React.CSSProperties => {
    const opacity = overlayOpacity / 100;
    switch (coverOverlay) {
      case 'solid': return { backgroundColor: `${p}`, opacity };
      case 'blur': return { backdropFilter: 'blur(6px)', backgroundColor: `${p}40` };
      case 'vignette': return { background: `radial-gradient(ellipse at center, transparent 30%, ${p}cc 100%)` };
      case 'none': return { display: 'none' };
      case 'gradient':
      default: return { background: `linear-gradient(to bottom, ${p}cc, ${p}${Math.round(opacity * 155).toString(16).padStart(2, '0')}, ${p}dd)` };
    }
  };

  // Heading render
  const renderHeading = (text: string) => {
    const baseStyle: React.CSSProperties = { fontFamily: headingFont, fontSize: '12px', fontWeight: 700, color: p };
    switch (headingStyle) {
      case 'background':
        return (
          <div style={{ ...baseStyle, color: '#fff', backgroundColor: p, padding: '4px 10px', borderRadius: '3px', marginBottom: '8px' }}>
            {text}
          </div>
        );
      case 'accent-left':
        return (
          <div style={{ ...baseStyle, borderLeft: `3px solid ${a}`, paddingLeft: '8px', marginBottom: '8px' }}>
            {text}
          </div>
        );
      case 'pill':
        return (
          <div style={{ ...baseStyle, backgroundColor: `${p}15`, padding: '4px 14px', borderRadius: '999px', display: 'inline-block', marginBottom: '8px' }}>
            {text}
          </div>
        );
      case 'underline':
      default:
        return (
          <div style={{ ...baseStyle, borderBottom: `2px solid ${s}`, paddingBottom: '4px', marginBottom: '8px' }}>
            {text}
          </div>
        );
    }
  };

  // Icon render
  const renderIcon = (Icon: React.ElementType) => {
    if (iconStyle === 'none') return null;
    if (iconStyle === 'outlined') {
      return <Icon style={{ width: '12px', height: '12px', color: p }} />;
    }
    return (
      <div style={{ width: '20px', height: '20px', backgroundColor: `${p}1a`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon style={{ width: '10px', height: '10px', color: p }} />
      </div>
    );
  };

  // Table row styles
  const getTableRowStyle = (idx: number): React.CSSProperties => {
    switch (tableStyle) {
      case 'striped': return { backgroundColor: idx % 2 === 0 ? bg : cardBg };
      case 'bordered': return { border: `1px solid ${s}` };
      case 'minimal': return { borderBottom: `1px solid ${s}30` };
      case 'clean':
      default: return {};
    }
  };

  // Cover
  const renderCover = () => {
    const textAlign = coverTextAlign;

    const logoElement = template.logoUrl ? (
      <img src={template.logoUrl} alt="Logo" style={{ height: logoSizePx, maxWidth: '120px', objectFit: 'contain' }} />
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: '16px', height: '16px', backgroundColor: a, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plane style={{ width: '8px', height: '8px', color: p }} />
        </div>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.9)', fontFamily: bodyFont }}>{template.agencyName || template.name}</span>
      </div>
    );

    const logoJustify = logoPos === 'top-left' ? 'flex-start' : logoPos === 'top-center' ? 'center' : 'flex-end';
    const isBottomLogo = logoPos === 'bottom-center';

    const contentBlock = (
      <div style={{ textAlign, padding: '12px' }}>
        <p style={{ fontSize: '8px', letterSpacing: '2px', color: a, textTransform: 'uppercase', fontFamily: bodyFont }}>
          PRESUPUESTO DE VIAJE
        </p>
        <h1 style={{ fontFamily: headingFont, fontSize: '22px', fontWeight: 700, color: '#fff', margin: '6px 0' }}>
          {mockData.destination}
        </h1>
        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', fontFamily: bodyFont }}>
          {mockData.subtitle}
        </p>
        <div style={{ display: 'flex', justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start', gap: '12px', marginTop: '10px', fontSize: '8px', color: 'rgba(255,255,255,0.9)' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: a, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '1px' }}>Desde</p>
            <p style={{ fontFamily: headingFont, marginTop: '2px' }}>{mockData.startDate.split(',')[0]}</p>
          </div>
          <div style={{ width: '1px', height: '20px', backgroundColor: `${a}80` }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: a, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '1px' }}>Hasta</p>
            <p style={{ fontFamily: headingFont, marginTop: '2px' }}>{mockData.endDate.split(',')[0]}</p>
          </div>
          <div style={{ width: '1px', height: '20px', backgroundColor: `${a}80` }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: a, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pasajeros</p>
            <p style={{ fontFamily: headingFont, marginTop: '2px' }}>{mockData.travelers}</p>
          </div>
        </div>
        {showCreationDate && (
          <p style={{ fontSize: '7px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>Armado el 10/03/2026</p>
        )}
      </div>
    );

    const clientBlock = (
      <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.2)', padding: '8px 12px' }}>
        <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.6)', fontFamily: bodyFont }}>{preparedForLabel}</p>
        <p style={{ fontSize: '12px', color: '#fff', fontFamily: headingFont, marginTop: '2px' }}>{mockData.client}</p>
      </div>
    );

    if (coverLayout === 'split') {
      return (
        <div style={{ display: 'flex', height: '220px', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ flex: 1, background: `linear-gradient(135deg, ${p}, ${s})`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {contentBlock}
            {clientBlock}
          </div>
          <div style={{ flex: 1, background: `url(https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=400) center/cover` }} />
        </div>
      );
    }

    if (coverLayout === 'minimal') {
      return (
        <div style={{ height: '220px', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px', background: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {!isBottomLogo && (
            <div style={{ display: 'flex', justifyContent: logoJustify, padding: '10px 12px' }}>{logoElement}</div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {contentBlock}
          </div>
          {isBottomLogo && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 12px' }}>{logoElement}</div>
          )}
          {clientBlock}
        </div>
      );
    }

    if (coverLayout === 'fullOverlay') {
      return (
        <div style={{ height: '220px', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px', position: 'relative', background: `url(https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=400) center/cover` }}>
          <div style={{ ...getOverlayStyle(), position: 'absolute', inset: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {!isBottomLogo && (
              <div style={{ display: 'flex', justifyContent: logoJustify, padding: '10px 12px' }}>{logoElement}</div>
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {contentBlock}
            </div>
            {isBottomLogo && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 12px' }}>{logoElement}</div>
            )}
            {clientBlock}
          </div>
        </div>
      );
    }

    // Classic (default)
    return (
      <div style={{ height: '220px', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px', position: 'relative', background: `url(https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=400) center/cover` }}>
        <div style={{ ...getOverlayStyle(), position: 'absolute', inset: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {!isBottomLogo && (
            <div style={{ display: 'flex', justifyContent: logoJustify, padding: '10px 12px' }}>{logoElement}</div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {contentBlock}
          </div>
          {isBottomLogo && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 12px' }}>{logoElement}</div>
          )}
          {clientBlock}
        </div>
      </div>
    );
  };

  // Details section
  const renderDetails = () => {
    const cardStyleCSS: React.CSSProperties = {
      backgroundColor: cardBg,
      borderRadius: template.styles.borderRadius,
      padding: densityPadding,
      marginBottom: '8px',
      ...(template.styles.cardStyle === 'elevated' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } : {}),
      ...(template.styles.cardStyle === 'outlined' ? { border: `1px solid ${s}` } : {}),
      ...(template.styles.cardStyle === 'glass' ? { backgroundColor: `${cardBg}cc`, backdropFilter: 'blur(8px)', border: `1px solid ${s}40` } : {}),
    };

    return (
      <div style={{ backgroundColor: bg, borderRadius: '6px', padding: densityPadding, marginBottom: '10px' }}>
        {renderHeading('Detalles del Viaje')}

        {/* Flights */}
        <div style={{ ...cardStyleCSS }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            {renderIcon(Plane)}
            <span style={{ fontFamily: headingFont, fontSize: '11px', fontWeight: 600, color: p }}>Vuelos</span>
          </div>
          <table style={{ width: '100%', fontSize: densityFontSize, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: tableStyle === 'clean' ? cardBg : 'transparent' }}>
                <th style={{ textAlign: 'left', padding: '3px 6px', color: p, fontWeight: 500 }}>Ruta</th>
                <th style={{ textAlign: 'left', padding: '3px 6px', color: p, fontWeight: 500 }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: '3px 6px', color: p, fontWeight: 500 }}>Horario</th>
                <th style={{ textAlign: 'left', padding: '3px 6px', color: p, fontWeight: 500 }}>Vuelo</th>
              </tr>
            </thead>
            <tbody>
              {mockData.flights.map((f, idx) => (
                <tr key={idx} style={getTableRowStyle(idx)}>
                  <td style={{ padding: '3px 6px', color: textColor }}>{f.route}</td>
                  <td style={{ padding: '3px 6px', color: textColor }}>{f.date}</td>
                  <td style={{ padding: '3px 6px', color: textColor }}>{f.time}</td>
                  <td style={{ padding: '3px 6px', color: textColor }}>{f.flight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lodging */}
        <div style={{ ...cardStyleCSS }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            {renderIcon(Building2)}
            <span style={{ fontFamily: headingFont, fontSize: '11px', fontWeight: 600, color: p }}>Alojamiento</span>
          </div>
          <div style={{ fontSize: densityFontSize, color: textColor }}>
            <p style={{ fontWeight: 600 }}>{mockData.hotel}</p>
            <p style={{ color: `${textColor}99`, marginTop: '2px' }}>{mockData.hotelCategory} · {mockData.regime}</p>
            <p style={{ color: `${textColor}99` }}>{mockData.nights} noches</p>
          </div>
        </div>

        {/* Insurance */}
        <div style={{ ...cardStyleCSS }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            {renderIcon(Shield)}
            <span style={{ fontFamily: headingFont, fontSize: '11px', fontWeight: 600, color: p }}>Asistencia</span>
          </div>
          <p style={{ fontSize: densityFontSize, color: textColor }}>Assist Card · Cobertura USD 60.000</p>
        </div>
      </div>
    );
  };

  // Footer
  const renderFooter = () => {
    const text = template.footerText || `${template.agencyName || template.name} · Tu viaje soñado`;
    switch (footerStyle) {
      case 'banner':
        return (
          <div style={{ backgroundColor: p, color: '#fff', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
            <div>
              <p style={{ fontFamily: headingFont, fontWeight: 700, fontSize: '11px' }}>{template.agencyName || template.name}</p>
              <p style={{ opacity: 0.8, marginTop: '2px' }}>Tu viaje soñado, nuestra pasión</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Phone style={{ width: '10px', height: '10px' }} />
              <span>+54 11 2345-6789</span>
            </div>
          </div>
        );
      case 'centered':
        return (
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <div style={{ width: '40px', height: '1px', backgroundColor: a, margin: '0 auto 6px' }} />
            <p style={{ fontSize: '9px', color: `${p}80` }}>{text}</p>
          </div>
        );
      case 'minimal':
        return (
          <p style={{ fontSize: '8px', color: `${p}60`, textAlign: 'center', padding: '4px' }}>{text}</p>
        );
      case 'simple':
      default:
        return (
          <div style={{ backgroundColor: p, color: '#fff', padding: '10px 14px', borderRadius: '6px', fontSize: '9px' }}>
            <p style={{ fontFamily: headingFont, fontWeight: 700, fontSize: '11px' }}>{template.agencyName || template.name}</p>
            <p style={{ opacity: 0.8, marginTop: '2px' }}>Tu viaje soñado, nuestra pasión</p>
          </div>
        );
    }
  };

  return (
    <div 
      className="rounded-lg border border-border overflow-hidden"
      style={{ fontFamily: bodyFont, fontSize: '11px', backgroundColor: '#f5f5f5' }}
    >
      <div className="p-2 text-center border-b border-border bg-muted">
        <p className="text-[10px] font-medium text-muted-foreground">Vista previa en vivo</p>
      </div>
      <div className="p-3 space-y-0" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {renderCover()}
        {renderDetails()}
        {renderFooter()}
      </div>
    </div>
  );
}
