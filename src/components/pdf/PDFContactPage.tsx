import { Quote, Template } from '@/types/quote';
import { MapPin, Phone, MessageCircle, Instagram, ExternalLink } from 'lucide-react';
import QRCode from 'react-qr-code';

interface PDFContactPageProps {
  quote: Quote;
  template: Template;
}

export function PDFContactPage({ quote, template }: PDFContactPageProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quote.lodging.address)}`;

  return (
    <div className="pdf-page flex flex-col">
      <h2 className="mb-6 border-b border-border pb-3 font-serif text-2xl font-bold text-foreground">
        Ubicación y Contacto
      </h2>

      {/* Ubicación del alojamiento */}
      <div className="mb-8 rounded-lg border border-border bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-serif text-lg font-semibold">Ubicación del Alojamiento</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="font-semibold text-foreground">{quote.lodging.name}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{quote.lodging.address}</p>
            
            <a 
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Ver en Google Maps
            </a>
          </div>

          {/* Placeholder de mapa */}
          <div className="overflow-hidden rounded-lg bg-muted">
            <div className="flex h-48 items-center justify-center bg-gradient-to-br from-muted to-secondary">
              <div className="text-center">
                <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Mapa de ubicación
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contactos con QR */}
      <div className="mb-8">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Contactanos por WhatsApp
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          {template.whatsappAgents.map((agent, index) => (
            <div 
              key={index}
              className="flex items-center gap-4 rounded-lg border border-border bg-white p-4"
            >
              <div className="rounded-lg bg-white p-2 shadow-sm">
                <QRCode 
                  value={`https://wa.me/${agent.phone}`}
                  size={80}
                  level="M"
                />
              </div>
              <div>
                <p className="font-semibold text-foreground">{agent.name}</p>
                <p className="text-sm text-muted-foreground">+{agent.phone}</p>
                <a 
                  href={`https://wa.me/${agent.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 hover:underline"
                >
                  Abrir chat
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Información de la agencia */}
      <div className="mt-auto rounded-lg bg-primary p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold">Vicka Turismo</h3>
            <p className="mt-1 text-sm text-primary-foreground/80">
              Tu viaje soñado, nuestra pasión
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="text-sm">+54 11 2345-6789</span>
            </div>
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              <span className="text-sm">@vickaturismo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      {template.footerText && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {template.footerText}
        </p>
      )}
    </div>
  );
}
