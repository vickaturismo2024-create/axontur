import { Quote, Template } from '@/types/quote';
import { MapPin, Phone, MessageCircle, Instagram, ExternalLink } from 'lucide-react';
import QRCode from 'react-qr-code';

interface PDFContactPageProps {
  quote: Quote;
  template: Template;
}

export function PDFContactPage({ quote, template }: PDFContactPageProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quote.lodging.address || '')}`;

  return (
    <div className="pdf-page flex flex-col">
      <h2 
        className="font-serif font-bold border-b"
        style={{ 
          marginBottom: '16px', 
          paddingBottom: '10px', 
          fontSize: '18px',
          borderColor: 'hsl(40 20% 88%)',
          color: 'hsl(215 50% 15%)'
        }}
      >
        Ubicación y Contacto
      </h2>

      {/* Ubicación del alojamiento */}
      {quote.lodging.name && (
        <div 
          className="rounded-lg border bg-white"
          style={{ 
            marginBottom: '20px', 
            padding: '16px',
            borderColor: 'hsl(40 20% 88%)'
          }}
        >
          <div className="flex items-center" style={{ marginBottom: '12px', gap: '8px' }}>
            <div 
              className="flex items-center justify-center rounded"
              style={{ 
                width: '24px', 
                height: '24px',
                backgroundColor: 'hsl(215 50% 23% / 0.1)',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              <MapPin style={{ width: '12px', height: '12px', color: 'hsl(215 50% 23%)' }} />
            </div>
            <h3 className="font-serif font-semibold" style={{ fontSize: '14px' }}>Ubicación del Alojamiento</h3>
          </div>

          <div className="grid grid-cols-2" style={{ gap: '16px' }}>
            <div>
              <h4 className="font-semibold" style={{ fontSize: '13px', color: 'hsl(215 50% 15%)' }}>
                {quote.lodging.name}
              </h4>
              <p style={{ marginTop: '4px', fontSize: '11px', color: 'hsl(215 20% 45%)' }}>
                {quote.lodging.address}
              </p>
              
              <a 
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg text-white"
                style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px', 
                  fontSize: '11px',
                  gap: '6px',
                  backgroundColor: 'hsl(215 50% 23%)',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                <ExternalLink style={{ width: '12px', height: '12px' }} />
                Ver en Google Maps
              </a>
            </div>

            {/* Placeholder de mapa */}
            <div 
              className="overflow-hidden rounded-lg"
              style={{ 
                backgroundColor: 'hsl(40 20% 94%)',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              <div 
                className="flex items-center justify-center"
                style={{ 
                  height: '120px',
                  background: 'linear-gradient(to bottom right, hsl(40 20% 94%), hsl(38 45% 85%))',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              >
                <div className="text-center">
                  <MapPin style={{ margin: '0 auto', width: '24px', height: '24px', color: 'hsl(215 20% 45%)' }} />
                  <p style={{ marginTop: '6px', fontSize: '10px', color: 'hsl(215 20% 45%)' }}>
                    Mapa de ubicación
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contactos con QR */}
      {template.whatsappAgents && template.whatsappAgents.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 
            className="flex items-center font-serif font-semibold"
            style={{ marginBottom: '12px', fontSize: '14px', gap: '8px' }}
          >
            <MessageCircle style={{ width: '16px', height: '16px', color: 'hsl(142 70% 35%)' }} />
            Contactanos por WhatsApp
          </h3>

          <div className="grid grid-cols-2" style={{ gap: '12px' }}>
            {template.whatsappAgents.map((agent, index) => (
              <div 
                key={index}
                className="flex items-center rounded-lg border bg-white"
                style={{ 
                  padding: '12px', 
                  gap: '12px',
                  borderColor: 'hsl(40 20% 88%)'
                }}
              >
                <div 
                  className="rounded-lg bg-white"
                  style={{ 
                    padding: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  <QRCode 
                    value={`https://wa.me/${agent.phone}`}
                    size={60}
                    level="M"
                  />
                </div>
                <div>
                  <p className="font-semibold" style={{ fontSize: '12px', color: 'hsl(215 50% 15%)' }}>
                    {agent.name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)' }}>+{agent.phone}</p>
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
          backgroundColor: 'hsl(215 50% 23%)',
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
          style={{ marginTop: '12px', fontSize: '10px', color: 'hsl(215 20% 45%)' }}
        >
          {template.footerText}
        </p>
      )}
    </div>
  );
}
