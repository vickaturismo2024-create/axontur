import { Template } from '@/types/quote';
import { Plane, Building2, Shield, Phone, MessageCircle, MapPin, Calendar, CheckCircle2, ChevronRight, Star, Circle, Instagram } from 'lucide-react';
import { useSettingsSafe } from '@/contexts/SettingsContext';

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
  const settings = useSettingsSafe()?.settings;
  const agencyName = (template.agencyName?.trim() || settings?.agency_name?.trim() || '').trim();
  const agencyPhone = (template.agencyPhone?.trim() || settings?.phone?.trim() || '').trim();
  const agencyInstagram = (template.agencyInstagram?.trim() || '').replace(/^@/, '');
  const agencyTagline = (template.agencyTagline?.trim() || '').trim();
  const hasAgencyInfo = !!(agencyName || agencyPhone || agencyInstagram || agencyTagline);

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
        {agencyName && <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.9)', fontFamily: bodyFont }}>{agencyName}</span>}
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

  // Itinerary preview
  const renderItinerary = () => {
    const itLayout = template.styles.itineraryLayout || 'timeline';
    const dotSt = template.styles.itineraryDotStyle || 'numbered';
    const cardSt = template.styles.itineraryCardStyle || 'bordered';
    const actIcon = template.styles.itineraryActivityIcon || 'checkmark';
    const showDate = template.styles.itineraryShowDayDate !== false;
    const sumStyle = template.styles.itinerarySummaryStyle || 'gradient-banner';

    const ActIcon = () => {
      const st = { width: '8px', height: '8px', color: a, flexShrink: 0 } as React.CSSProperties;
      switch (actIcon) {
        case 'bullet': return <Circle style={{ ...st, fill: a }} />;
        case 'arrow': return <ChevronRight style={st} />;
        case 'star': return <Star style={{ ...st, fill: a }} />;
        default: return <CheckCircle2 style={st} />;
      }
    };

    const Marker = ({ n }: { n: number }) => {
      const base: React.CSSProperties = { width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '8px', fontWeight: 700 };
      switch (dotSt) {
        case 'icon': return <div style={{ ...base, backgroundColor: `${p}1a` }}><Calendar style={{ width: '10px', height: '10px', color: p }} /></div>;
        case 'filled': return <div style={{ ...base, backgroundColor: p }}><span style={{ color: '#fff' }}>●</span></div>;
        case 'ring': return <div style={{ ...base, border: `2px solid ${p}`, backgroundColor: bg }}><span style={{ color: p }}>{n}</span></div>;
        default: return <div style={{ ...base, backgroundColor: p, color: '#fff' }}>{n}</div>;
      }
    };

    const getCardSt = (): React.CSSProperties => {
      switch (cardSt) {
        case 'filled': return { padding: '6px', backgroundColor: cardBg, borderRadius: '4px' };
        case 'minimal': return { padding: '6px 0', borderBottom: `1px solid ${s}40` };
        case 'accent-top': return { padding: '6px', backgroundColor: bg, borderRadius: '4px', borderTop: `2px solid ${a}` };
        default: return { padding: '6px', backgroundColor: bg, borderRadius: '4px', border: `1px solid ${s}` };
      }
    };

    const DayCard = ({ day }: { day: typeof mockData.itinerary[0] }) => (
      <div style={getCardSt()}>
        {showDate && <p style={{ fontSize: '7px', color: `${p}80`, marginBottom: '2px' }}>📅 Lun 15 Mar</p>}
        <p style={{ fontFamily: headingFont, fontSize: '9px', fontWeight: 600, color: p }}>{day.title}</p>
        <p style={{ fontSize: '8px', color: `${p}80`, marginTop: '1px' }}>{day.desc}</p>
        <div style={{ marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {day.activities.map((act, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '7px', color: textColor }}>
              <ActIcon /> {act}
            </div>
          ))}
        </div>
      </div>
    );

    return (
      <div style={{ backgroundColor: bg, borderRadius: '6px', padding: densityPadding, marginBottom: '10px' }}>
        {renderHeading('Itinerario')}
        
        {itLayout === 'timeline' && (
          <div style={{ position: 'relative', paddingLeft: '16px' }}>
            <div style={{ position: 'absolute', left: '9px', top: 0, bottom: 0, width: '2px', background: `linear-gradient(to bottom, ${p}, ${a}, ${p}4d)` }} />
            {mockData.itinerary.map((day) => (
              <div key={day.day} style={{ display: 'flex', gap: '8px', marginBottom: '8px', position: 'relative' }}>
                <div style={{ marginLeft: '-16px' }}><Marker n={day.day} /></div>
                <div style={{ flex: 1 }}><DayCard day={day} /></div>
              </div>
            ))}
          </div>
        )}

        {itLayout === 'cards' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {mockData.itinerary.map((day) => (
              <div key={day.day}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                  <Marker n={day.day} />
                  <span style={{ fontSize: '8px', fontWeight: 600, color: p }}>Día {day.day}</span>
                </div>
                <DayCard day={day} />
              </div>
            ))}
          </div>
        )}

        {itLayout === 'compact' && (
          <div>
            {mockData.itinerary.map((day) => (
              <div key={day.day} style={{ display: 'flex', gap: '6px', marginBottom: '4px', paddingBottom: '4px', borderBottom: `1px solid ${s}30` }}>
                <div style={{ minWidth: '28px', textAlign: 'center' }}>
                  <span style={{ fontFamily: headingFont, fontSize: '14px', fontWeight: 700, color: p }}>{day.day}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '9px', fontWeight: 600, color: p }}>{day.title}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '2px' }}>
                    {day.activities.map((act, i) => (
                      <span key={i} style={{ fontSize: '7px', padding: '1px 4px', backgroundColor: `${p}0d`, borderRadius: '3px', color: p }}>{act}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {itLayout === 'magazine' && (
          <div>
            {mockData.itinerary.map((day, idx) => (
              <div key={day.day} style={{ marginBottom: '8px', padding: '8px', borderRadius: '6px', backgroundColor: idx % 2 === 0 ? `${p}08` : bg, borderLeft: `3px solid ${idx % 2 === 0 ? a : p}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: headingFont, fontSize: '14px', fontWeight: 700, color: p }}>Día {day.day}</span>
                  {showDate && <span style={{ fontSize: '7px', color: `${p}70` }}>Lun 15 Mar</span>}
                </div>
                <p style={{ fontSize: '9px', fontWeight: 600, color: p }}>{day.title}</p>
                <p style={{ fontSize: '8px', color: `${p}90`, marginTop: '2px' }}>{day.desc}</p>
                <div style={{ marginTop: '4px', paddingTop: '3px', borderTop: `1px solid ${s}40`, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {day.activities.map((act, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '7px', color: `${p}cc` }}>
                      <ActIcon /> {act}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {sumStyle !== 'none' && (
          <div style={{ 
            marginTop: '8px', padding: '6px', borderRadius: '4px', textAlign: 'center', fontSize: '8px', color: p,
            ...(sumStyle === 'gradient-banner' ? { background: `linear-gradient(to right, ${s}80, ${a}33)` } : {}),
            ...(sumStyle === 'card' ? { border: `1px solid ${s}`, backgroundColor: bg } : {}),
          }}>
            <span style={{ fontWeight: 600 }}>3 días</span> de aventura en <span style={{ fontWeight: 600 }}>Cancún</span>
          </div>
        )}
      </div>
    );
  };

  // Footer
  const renderFooter = () => {
    const text = template.footerText || (agencyName ? `${agencyName}${agencyTagline ? ' · ' + agencyTagline : ''}` : '');
    const agencyBlock = (
      <div>
        {agencyName && (
          <p style={{ fontFamily: headingFont, fontWeight: 700, fontSize: '11px' }}>{agencyName}</p>
        )}
        {agencyTagline && (
          <p style={{ opacity: 0.8, marginTop: '2px' }}>{agencyTagline}</p>
        )}
      </div>
    );
    const contactBlock = (agencyPhone || agencyInstagram) ? (
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {agencyPhone && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Phone style={{ width: '10px', height: '10px' }} />
            <span>{agencyPhone}</span>
          </span>
        )}
        {agencyInstagram && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Instagram style={{ width: '10px', height: '10px' }} />
            <span>@{agencyInstagram}</span>
          </span>
        )}
      </div>
    ) : null;

    switch (footerStyle) {
      case 'banner':
        if (!hasAgencyInfo) return null;
        return (
          <div style={{ backgroundColor: p, color: '#fff', padding: '10px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
            {agencyBlock}
            {contactBlock}
          </div>
        );
      case 'centered':
        if (!text) return null;
        return (
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <div style={{ width: '40px', height: '1px', backgroundColor: a, margin: '0 auto 6px' }} />
            <p style={{ fontSize: '9px', color: `${p}80` }}>{text}</p>
          </div>
        );
      case 'minimal':
        if (!text) return null;
        return (
          <p style={{ fontSize: '8px', color: `${p}60`, textAlign: 'center', padding: '4px' }}>{text}</p>
        );
      case 'simple':
      default:
        if (!hasAgencyInfo) return null;
        return (
          <div style={{ backgroundColor: p, color: '#fff', padding: '10px 14px', borderRadius: '6px', fontSize: '9px' }}>
            {agencyBlock}
            {contactBlock}
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
        {renderItinerary()}
        {renderFooter()}
      </div>
    </div>
  );
}
