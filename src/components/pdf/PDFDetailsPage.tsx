import { Quote, Template } from '@/types/quote';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plane, Building2, Car, Shield, DollarSign } from 'lucide-react';

interface PDFDetailsPageProps {
  quote: Quote;
  template: Template;
}

export function PDFDetailsPage({ quote, template }: PDFDetailsPageProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM yyyy", { locale: es });
  };

  // Template colors
  const primaryColor = template.colors.primary;
  const secondaryColor = template.colors.secondary;
  const accentColor = template.colors.accent;
  const bgColor = template.colors.background || '#ffffff';
  const cardBgColor = template.colors.cardBackground || '#f8f9fa';

  const SectionCard = ({ 
    icon: Icon, 
    title, 
    children 
  }: { 
    icon: React.ElementType; 
    title: string; 
    children: React.ReactNode 
  }) => (
    <div 
      className="rounded-lg border"
      style={{ 
        marginBottom: '12px', 
        padding: '12px',
        backgroundColor: bgColor,
        borderColor: secondaryColor,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}
    >
      <div className="flex items-center" style={{ marginBottom: '8px', gap: '8px' }}>
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
          <Icon style={{ width: '12px', height: '12px', color: primaryColor }} />
        </div>
        <h3 className="font-serif font-semibold" style={{ fontSize: '14px', color: primaryColor }}>{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="pdf-page" style={{ backgroundColor: cardBgColor }}>
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
        Detalles del Viaje
      </h2>

      {/* Vuelos */}
      {template.sectionsToggles.flights && quote.flights.length > 0 && (
        <SectionCard icon={Plane} title="Vuelos">
          <div 
            className="overflow-hidden rounded border"
            style={{ borderColor: secondaryColor }}
          >
            <table className="w-full" style={{ fontSize: '11px' }}>
              <thead style={{ backgroundColor: cardBgColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <tr>
                  <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Ruta</th>
                  <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Fecha</th>
                  <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Horario</th>
                  <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Vuelo</th>
                </tr>
              </thead>
              <tbody>
                {quote.flights.map((flight, idx) => (
                  <tr 
                    key={flight.id} 
                    style={{ 
                      backgroundColor: idx % 2 === 0 ? bgColor : cardBgColor,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <td style={{ padding: '6px 8px' }}>
                      {flight.origin} → {flight.destination}
                    </td>
                    <td style={{ padding: '6px 8px' }}>{formatDate(flight.date)}</td>
                    <td style={{ padding: '6px 8px' }}>
                      {flight.departureTime} - {flight.arrivalTime}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {flight.airline} {flight.flightNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {quote.flights[0]?.luggage && (
            <p style={{ marginTop: '6px', fontSize: '10px', color: `${primaryColor}99` }}>
              Equipaje: {quote.flights[0].luggage}
            </p>
          )}
        </SectionCard>
      )}

      {/* Alojamiento */}
      {template.sectionsToggles.lodging && quote.lodging.name && (
        <SectionCard icon={Building2} title="Alojamiento">
          <div className="grid grid-cols-2" style={{ gap: '12px' }}>
            <div>
              <h4 className="font-semibold" style={{ fontSize: '12px', color: primaryColor }}>{quote.lodging.name}</h4>
              <p style={{ fontSize: '11px', color: `${primaryColor}99` }}>{quote.lodging.category}</p>
              <p style={{ marginTop: '6px', fontSize: '11px' }}>{quote.lodging.address}</p>
            </div>
            <div style={{ fontSize: '11px' }}>
              <p><span style={{ color: `${primaryColor}99` }}>Check-in:</span> {formatDate(quote.lodging.checkIn)}</p>
              <p><span style={{ color: `${primaryColor}99` }}>Check-out:</span> {formatDate(quote.lodging.checkOut)}</p>
              <p><span style={{ color: `${primaryColor}99` }}>Régimen:</span> {quote.lodging.regime}</p>
              <p><span style={{ color: `${primaryColor}99` }}>Habitación:</span> {quote.lodging.roomType}</p>
              <p><span style={{ color: `${primaryColor}99` }}>Noches:</span> {quote.lodging.nights}</p>
            </div>
          </div>
          {quote.lodging.notes && (
            <p 
              className="rounded"
              style={{ 
                marginTop: '8px', 
                padding: '6px', 
                fontSize: '10px', 
                backgroundColor: cardBgColor,
                color: `${primaryColor}99`,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              {quote.lodging.notes}
            </p>
          )}
        </SectionCard>
      )}

      {/* Traslados */}
      {template.sectionsToggles.transfers && quote.transfers.length > 0 && (
        <SectionCard icon={Car} title="Traslados">
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {quote.transfers.map((transfer) => (
              <li key={transfer.id} className="flex items-center justify-between" style={{ fontSize: '11px' }}>
                <span>
                  <span className="font-medium">{transfer.type}:</span> {transfer.description}
                </span>
                <span 
                  className="rounded"
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '9px',
                    backgroundColor: transfer.included ? 'hsl(142 70% 95%)' : `${accentColor}33`,
                    color: transfer.included ? 'hsl(142 70% 30%)' : primaryColor,
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  {transfer.included ? 'Incluido' : 'Opcional'}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Asistencia al viajero */}
      {template.sectionsToggles.insurance && quote.insurance.company && (
        <SectionCard icon={Shield} title="Asistencia al Viajero">
          <div className="grid grid-cols-2" style={{ gap: '12px', fontSize: '11px' }}>
            <div>
              <p><span style={{ color: `${primaryColor}99` }}>Compañía:</span> {quote.insurance.company}</p>
              <p><span style={{ color: `${primaryColor}99` }}>Plan:</span> {quote.insurance.plan}</p>
            </div>
            <div>
              <p><span style={{ color: `${primaryColor}99` }}>Cobertura:</span> {quote.insurance.coverage}</p>
            </div>
          </div>
          {quote.insurance.notes && (
            <p style={{ marginTop: '6px', fontSize: '10px', color: `${primaryColor}99` }}>{quote.insurance.notes}</p>
          )}
        </SectionCard>
      )}

      {/* Valor del viaje */}
      <SectionCard icon={DollarSign} title="Valor del Viaje">
        <div 
          className="rounded-lg text-white"
          style={{ 
            padding: '12px',
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
        >
          <div className="flex items-end justify-between">
            <div>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Precio total</p>
              <p className="font-serif font-bold" style={{ fontSize: '22px' }}>
                {quote.trip.currency} {quote.pricing.totalPrice.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Por persona</p>
              <p className="font-serif" style={{ fontSize: '16px' }}>
                {quote.trip.currency} {quote.pricing.pricePerPerson.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p><span style={{ color: `${primaryColor}99` }}>Impuestos:</span> {quote.trip.currency} {quote.pricing.taxes.toLocaleString()}</p>
          <p><span style={{ color: `${primaryColor}99` }}>Forma de pago:</span> {quote.pricing.paymentMethod}</p>
          <p><span style={{ color: `${primaryColor}99` }}>Condiciones:</span> {quote.pricing.conditions}</p>
          {quote.pricing.observations && (
            <p 
              className="rounded"
              style={{ 
                marginTop: '6px', 
                padding: '6px', 
                fontSize: '10px',
                backgroundColor: `${accentColor}33`,
                color: primaryColor,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              ⚠️ {quote.pricing.observations}
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
