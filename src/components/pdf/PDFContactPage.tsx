import { Quote, Template } from '@/types/quote';
import { MapPin, Phone, MessageCircle, Instagram, ExternalLink } from 'lucide-react';
import QRCode from 'react-qr-code';

interface PDFContactPageProps {
  quote: Quote;
  template: Template;
}

export function PDFContactPage({ quote, template }: PDFContactPageProps) {
  // Template colors
  const primaryColor = template.colors.primary;
  const secondaryColor = template.colors.secondary;
  const bgColor = template.colors.background || '#ffffff';
  const cardBgColor = template.colors.cardBackground || '#f8f9fa';

  // Get all lodgings - prioritize lodgings array, fallback to legacy lodging
  const allLodgings = (quote.lodgings && quote.lodgings.length > 0) 
    ? quote.lodgings 
    : (quote.lodging?.name ? [quote.lodging] : []);

  const getMapsUrl = (address: string) => 
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;

  return (
    <div className="pdf-page flex flex-col" style={{ backgroundColor: cardBgColor }}>
      <h2 
        className="font-serif font-bold border-b"
        style={{ 
          marginBottom: '16px', 
          paddingBottom: '10px', 
          fontSize: '18px',
          borderColor: secondaryColor,
          color: primaryColor
        }}
      >
        Ubicación y Contacto
      </h2>

      {/* Ubicaciones de alojamientos */}
      {allLodgings.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
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
              {allLodgings.length > 1 ? 'Ubicaciones de los Alojamientos' : 'Ubicación del Alojamiento'}
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allLodgings.map((lodging, index) => (
              <div 
                key={lodging.id || index}
                className="rounded-lg border"
                style={{ 
                  padding: '12px',
                  backgroundColor: bgColor,
                  borderColor: secondaryColor
                }}
              >
                <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                  <div>
                    {allLodgings.length > 1 && lodging.destination && (
                      <p style={{ fontSize: '10px', marginBottom: '4px', color: `${primaryColor}80`, fontWeight: 500 }}>
                        {lodging.destination}
                      </p>
                    )}
                    <h4 className="font-semibold" style={{ fontSize: '13px', color: primaryColor }}>
                      {lodging.name}
                    </h4>
                    <p style={{ marginTop: '4px', fontSize: '11px', color: `${primaryColor}99` }}>
                      {lodging.address}
                    </p>
                    
                    {lodging.address && (
                      <a 
                        href={getMapsUrl(lodging.address)}
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
                    )}
                  </div>

                  {/* Placeholder de mapa */}
                  <div 
                    className="overflow-hidden rounded-lg"
                    style={{ 
                      backgroundColor: cardBgColor,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <div 
                      className="flex items-center justify-center"
                      style={{ 
                        height: allLodgings.length > 1 ? '80px' : '100px',
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
            ))}
          </div>
        </div>
      )}

      {/* Contactos con QR */}
      {template.whatsappAgents && template.whatsappAgents.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 
            className="flex items-center font-serif font-semibold"
            style={{ marginBottom: '12px', fontSize: '14px', gap: '8px', color: primaryColor }}
          >
            <MessageCircle style={{ width: '16px', height: '16px', color: 'hsl(142 70% 35%)' }} />
            Contactanos por WhatsApp
          </h3>

          <div className="grid grid-cols-2" style={{ gap: '12px' }}>
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
      )}

      {/* Información de la agencia */}
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold" style={{ fontSize: '16px' }}>Vicka Turismo</h3>
            <p style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
              Tu viaje soñado, nuestra pasión
            </p>
          </div>
          <div className="flex items-center" style={{ gap: '16px' }}>
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

      {/* Footer */}
      {template.footerText && (
        <p 
          className="text-center"
          style={{ marginTop: '12px', fontSize: '10px', color: `${primaryColor}99` }}
        >
          {template.footerText}
        </p>
      )}
    </div>
  );
}
