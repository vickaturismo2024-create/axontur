import { Quote, Template } from '@/types/quote';
import { MapPin, Phone, MessageCircle, Instagram, ExternalLink } from 'lucide-react';
import QRCode from 'react-qr-code';
import { PDFPageWrapper } from './PDFPageWrapper';
import { ReactNode } from 'react';
import { t, getFooterContainerStyle } from '@/lib/templateStyles';
import { useSettingsSafe } from '@/contexts/SettingsContext';

interface PDFContactPagesProps {
  quote: Quote;
  template: Template;
  isMobile?: boolean;
}

// Height estimates for pagination (realistic values)
const HEIGHTS = {
  PAGE_MAX: 900, // Realistic max for A4 content area
  HEADER: 50,
  SECTION_HEADER: 40,
  LODGING_LOCATION: 150,
  WHATSAPP_SECTION: 140,
  AGENCY_BANNER: 100,
  FOOTER: 40,
};

interface Section {
  id: string;
  height: number;
  component: ReactNode;
  isFixed?: boolean; // Sections that must be at the end
}

export function PDFContactPages({ quote, template, isMobile = false }: PDFContactPagesProps) {
  const settingsCtx = useSettingsSafe();
  const settings = settingsCtx?.settings;

  // Template colors
  const primaryColor = template.colors.primary;
  const secondaryColor = template.colors.secondary;
  const bgColor = template.colors.background || '#ffffff';
  const cardBgColor = template.colors.cardBackground || '#f8f9fa';

  // Agency info: template overrides → settings fallback → empty (never template.name)
  const agencyName = (template.agencyName?.trim() || settings?.agency_name?.trim() || '').trim();
  const agencyPhone = (template.agencyPhone?.trim() || settings?.phone?.trim() || '').trim();
  const agencyInstagramRaw = (template.agencyInstagram?.trim() || '').replace(/^@/, '');
  const agencyInstagram = agencyInstagramRaw;
  const agencyTagline = (template.agencyTagline?.trim() || '').trim();
  const hasAgencyBanner = !!(agencyName || agencyPhone || agencyInstagram || agencyTagline);

  // Get all lodgings
  const allLodgings = (quote.lodgings && quote.lodgings.length > 0) 
    ? quote.lodgings 
    : (quote.lodging?.name ? [quote.lodging] : []);
  
  const lodgingsWithAddress = allLodgings.filter(l => l.address);

  const getFullAddress = (address: string, destination?: string) => {
    const dest = destination || quote.trip?.destination;
    return dest ? `${address}, ${dest}` : address;
  };

  const getMapsUrl = (address: string, destination?: string) => 
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getFullAddress(address, destination) || '')}`;

  // Build sections
  const buildSections = (): Section[] => {
    const sections: Section[] = [];

    // Location section header (if there are lodgings with addresses)
    if ((template.sectionsToggles?.lodging !== false) && lodgingsWithAddress.length > 0) {
      // Add each lodging location as a separate section for better pagination
      lodgingsWithAddress.forEach((lodging, index) => {
        sections.push({
          id: `location-${lodging.id || index}`,
          height: HEIGHTS.LODGING_LOCATION + (index === 0 ? HEIGHTS.SECTION_HEADER : 0),
          component: (
            <div>
              {index === 0 && (
                <div className="flex items-center" style={{ marginBottom: '12px', gap: '8px' }}>
                  <div 
                    className="flex items-center justify-center rounded"
                    style={{ 
                      width: '24px', 
                      height: '24px',
                      backgroundColor: `${primaryColor}1a`,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <MapPin style={{ width: '12px', height: '12px', color: primaryColor }} />
                  </div>
                  <h3 className="font-serif font-semibold" style={{ fontSize: '14px', color: primaryColor }}>
                    {lodgingsWithAddress.length > 1 ? 'Ubicaciones de los Alojamientos' : 'Ubicación del Alojamiento'}
                  </h3>
                </div>
              )}
              <div 
                className="rounded-lg border"
                style={{ 
                  padding: '12px',
                  marginBottom: '12px',
                  backgroundColor: bgColor,
                  borderColor: lodging.isOption ? `${secondaryColor}` : secondaryColor,
                  borderStyle: lodging.isOption ? 'dashed' : 'solid'
                }}
              >
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`} style={{ gap: '12px' }}>
                  <div>
                    {lodging.isOption && (
                      <span 
                        className="rounded"
                        style={{ 
                          display: 'inline-block',
                          marginBottom: '4px',
                          padding: '1px 6px', 
                          fontSize: '9px', 
                          fontWeight: 600,
                          backgroundColor: `${secondaryColor}80`,
                          color: primaryColor
                        }}
                      >
                        🏷️ {lodging.optionLabel || 'Opción'}
                      </span>
                    )}
                    {lodgingsWithAddress.length > 1 && lodging.destination && (
                      <p style={{ fontSize: '10px', marginBottom: '4px', color: `${primaryColor}80`, fontWeight: 500 }}>
                        📍 {lodging.destination}
                      </p>
                    )}
                    <h4 className="font-semibold" style={{ fontSize: '13px', color: primaryColor }}>
                      {lodging.name}
                    </h4>
                    <p style={{ marginTop: '4px', fontSize: '11px', color: `${primaryColor}99` }}>
                      {lodging.address}
                    </p>
                    
                    <a 
                      href={getMapsUrl(lodging.address, lodging.destination)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg text-white"
                      style={{ 
                        marginTop: '10px', 
                        padding: '6px 10px', 
                        fontSize: '10px',
                        gap: '4px',
                        backgroundColor: primaryColor,
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <ExternalLink style={{ width: '10px', height: '10px' }} />
                      Ver en Google Maps
                    </a>
                  </div>

                  <div 
                    className="overflow-hidden rounded-lg"
                    style={{ 
                      backgroundColor: cardBgColor,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <iframe
                      src={`https://www.google.com/maps?q=${encodeURIComponent(getFullAddress(lodging.address, lodging.destination))}&output=embed`}
                      width="100%"
                      height={lodgingsWithAddress.length > 1 ? '80' : '100'}
                      style={{ border: 0, borderRadius: '8px' }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Mapa de ${lodging.name}`}
                      className="print:hidden"
                    />
                    <div 
                      className="hidden print:flex items-center justify-center"
                      style={{ 
                        height: lodgingsWithAddress.length > 1 ? '80px' : '100px',
                        background: `linear-gradient(to bottom right, ${cardBgColor}, ${secondaryColor})`,
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <div className="text-center">
                        <MapPin style={{ margin: '0 auto', width: '20px', height: '20px', color: `${primaryColor}99` }} />
                        <p style={{ marginTop: '4px', fontSize: '9px', color: `${primaryColor}99` }}>
                          Mapa
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        });
      });
    }

    // WhatsApp section
    if (template.whatsappAgents && template.whatsappAgents.length > 0) {
      sections.push({
        id: 'whatsapp',
        height: HEIGHTS.WHATSAPP_SECTION,
        component: (
          <div style={{ marginBottom: '20px' }}>
            <h3 
              className="flex items-center font-serif font-semibold"
              style={{ marginBottom: '12px', fontSize: '14px', gap: '8px', color: primaryColor }}
            >
              <MessageCircle style={{ width: '16px', height: '16px', color: 'hsl(142 70% 35%)' }} />
              {t(template, 'whatsappTitle')}
            </h3>

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`} style={{ gap: '12px' }}>
              {template.whatsappAgents.map((agent, index) => (
                <div 
                  key={index}
                  className="flex items-center rounded-lg border"
                  style={{ 
                    padding: '12px', 
                    gap: '12px',
                    backgroundColor: bgColor,
                    borderColor: secondaryColor
                  }}
                >
                  <div 
                    className="rounded-lg"
                    style={{ 
                      padding: '6px',
                      backgroundColor: bgColor,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <QRCode 
                      value={`https://wa.me/${agent.phone}`}
                      size={60}
                      level="M"
                      fgColor={primaryColor}
                    />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ fontSize: '12px', color: primaryColor }}>
                      {agent.name}
                    </p>
                    <p style={{ fontSize: '11px', color: `${primaryColor}99` }}>+{agent.phone}</p>
                    <a 
                      href={`https://wa.me/${agent.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center"
                      style={{ 
                        marginTop: '4px', 
                        fontSize: '10px', 
                        gap: '4px',
                        color: 'hsl(142 70% 35%)'
                      }}
                    >
                      Abrir chat
                      <ExternalLink style={{ width: '10px', height: '10px' }} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      });
    }

    // Agency banner (fixed at end)
    sections.push({
      id: 'agency',
      height: HEIGHTS.AGENCY_BANNER,
      isFixed: true,
      component: (
        <div 
          className="rounded-lg text-white"
          style={{ 
            marginTop: 'auto', 
            padding: '16px',
            backgroundColor: primaryColor,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
        >
          <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center justify-between'}`}>
            <div>
              <h3 className="font-serif font-bold" style={{ fontSize: isMobile ? '14px' : '16px' }}>{template.agencyName || template.name}</h3>
              <p style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                Tu viaje soñado, nuestra pasión
              </p>
            </div>
            <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2' : ''}`} style={{ gap: isMobile ? '8px' : '16px' }}>
              <div className="flex items-center" style={{ gap: '6px', fontSize: '11px' }}>
                <Phone style={{ width: '12px', height: '12px' }} />
                <span>+54 11 2345-6789</span>
              </div>
              <div className="flex items-center" style={{ gap: '6px', fontSize: '11px' }}>
                <Instagram style={{ width: '12px', height: '12px' }} />
                <span>@vickaturismo</span>
              </div>
            </div>
          </div>
        </div>
      )
    });

    // Footer (fixed at end) — respeta footerStyle de la plantilla
    if (template.footerText) {
      const footerStyle = getFooterContainerStyle(template);
      sections.push({
        id: 'footer',
        height: HEIGHTS.FOOTER,
        isFixed: true,
        component: (
          <div style={footerStyle.wrapper}>
            <span style={{ color: footerStyle.textColor }}>{template.footerText}</span>
          </div>
        )
      });
    }

    return sections;
  };

  // Group sections into pages, keeping fixed sections on last page
  const groupSectionsIntoPages = (sections: Section[]): Section[][] => {
    const fixedSections = sections.filter(s => s.isFixed);
    const regularSections = sections.filter(s => !s.isFixed);
    
    const fixedHeight = fixedSections.reduce((acc, s) => acc + s.height, 0);
    
    const pages: Section[][] = [];
    let currentPage: Section[] = [];
    let currentHeight = HEIGHTS.HEADER;

    for (const section of regularSections) {
      // Check if adding this section would exceed page height
      // On the last page (when remaining sections fit), leave room for fixed sections
      const isLastSectionBatch = regularSections.indexOf(section) === regularSections.length - 1;
      const maxHeight = isLastSectionBatch 
        ? HEIGHTS.PAGE_MAX - fixedHeight 
        : HEIGHTS.PAGE_MAX;

      if (currentHeight + section.height > maxHeight) {
        if (currentPage.length > 0) {
          pages.push(currentPage);
        }
        currentPage = [section];
        currentHeight = HEIGHTS.HEADER + section.height;
      } else {
        currentPage.push(section);
        currentHeight += section.height;
      }
    }

    // Add fixed sections to the last page
    if (currentPage.length > 0 || fixedSections.length > 0) {
      currentPage.push(...fixedSections);
      pages.push(currentPage);
    }

    return pages;
  };

  const sections = buildSections();
  const pages = groupSectionsIntoPages(sections);

  return (
    <>
      {pages.map((pageSections, pageIndex) => (
        <PDFPageWrapper
          key={`contact-page-${pageIndex}`}
          title="Ubicación y Contacto"
          continuation={pageIndex > 0}
          backgroundColor={cardBgColor}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          isMobile={isMobile}
          headingStyle={template.styles.headingStyle}
          accentColor={template.colors.accent}
          contentDensity={template.styles.contentDensity}
        >
          <div className="flex flex-col h-full">
            <div className="flex-1">
              {pageSections.filter(s => !s.isFixed).map((section) => (
                <div key={section.id}>{section.component}</div>
              ))}
            </div>
            {pageSections.filter(s => s.isFixed).map((section) => (
              <div key={section.id}>{section.component}</div>
            ))}
          </div>
        </PDFPageWrapper>
      ))}
    </>
  );
}
