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
      className="rounded-lg border bg-white"
      style={{ 
        marginBottom: '12px', 
        padding: '12px',
        borderColor: 'hsl(40 20% 88%)',
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
            backgroundColor: 'hsl(215 50% 23% / 0.1)',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
        >
          <Icon style={{ width: '12px', height: '12px', color: 'hsl(215 50% 23%)' }} />
        </div>
        <h3 className="font-serif font-semibold" style={{ fontSize: '14px', color: 'hsl(215 50% 15%)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="pdf-page">
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
        Detalles del Viaje
      </h2>

      {/* Vuelos */}
      {template.sectionsToggles.flights && quote.flights.length > 0 && (
        <SectionCard icon={Plane} title="Vuelos">
          <div 
            className="overflow-hidden rounded border"
            style={{ borderColor: 'hsl(40 20% 88%)' }}
          >
            <table className="w-full" style={{ fontSize: '11px' }}>
              <thead style={{ backgroundColor: 'hsl(40 20% 94%)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <tr>
                  <th className="text-left font-medium" style={{ padding: '6px 8px' }}>Ruta</th>
                  <th className="text-left font-medium" style={{ padding: '6px 8px' }}>Fecha</th>
                  <th className="text-left font-medium" style={{ padding: '6px 8px' }}>Horario</th>
                  <th className="text-left font-medium" style={{ padding: '6px 8px' }}>Vuelo</th>
                </tr>
              </thead>
              <tbody>
                {quote.flights.map((flight, idx) => (
                  <tr 
                    key={flight.id} 
                    style={{ 
                      backgroundColor: idx % 2 === 0 ? 'white' : 'hsl(40 20% 97%)',
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
            <p style={{ marginTop: '6px', fontSize: '10px', color: 'hsl(215 20% 45%)' }}>
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
              <h4 className="font-semibold" style={{ fontSize: '12px', color: 'hsl(215 50% 15%)' }}>{quote.lodging.name}</h4>
              <p style={{ fontSize: '11px', color: 'hsl(215 20% 45%)' }}>{quote.lodging.category}</p>
              <p style={{ marginTop: '6px', fontSize: '11px' }}>{quote.lodging.address}</p>
            </div>
            <div style={{ fontSize: '11px' }}>
              <p><span style={{ color: 'hsl(215 20% 45%)' }}>Check-in:</span> {formatDate(quote.lodging.checkIn)}</p>
              <p><span style={{ color: 'hsl(215 20% 45%)' }}>Check-out:</span> {formatDate(quote.lodging.checkOut)}</p>
              <p><span style={{ color: 'hsl(215 20% 45%)' }}>Régimen:</span> {quote.lodging.regime}</p>
              <p><span style={{ color: 'hsl(215 20% 45%)' }}>Habitación:</span> {quote.lodging.roomType}</p>
              <p><span style={{ color: 'hsl(215 20% 45%)' }}>Noches:</span> {quote.lodging.nights}</p>
            </div>
          </div>
          {quote.lodging.notes && (
            <p 
              className="rounded"
              style={{ 
                marginTop: '8px', 
                padding: '6px', 
                fontSize: '10px', 
                backgroundColor: 'hsl(40 20% 97%)',
                color: 'hsl(215 20% 45%)',
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
                    backgroundColor: transfer.included ? 'hsl(142 70% 95%)' : 'hsl(45 93% 95%)',
                    color: transfer.included ? 'hsl(142 70% 30%)' : 'hsl(45 93% 30%)',
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
              <p><span style={{ color: 'hsl(215 20% 45%)' }}>Compañía:</span> {quote.insurance.company}</p>
              <p><span style={{ color: 'hsl(215 20% 45%)' }}>Plan:</span> {quote.insurance.plan}</p>
            </div>
            <div>
              <p><span style={{ color: 'hsl(215 20% 45%)' }}>Cobertura:</span> {quote.insurance.coverage}</p>
            </div>
          </div>
          {quote.insurance.notes && (
            <p style={{ marginTop: '6px', fontSize: '10px', color: 'hsl(215 20% 45%)' }}>{quote.insurance.notes}</p>
          )}
        </SectionCard>
      )}

      {/* Valor del viaje */}
      <SectionCard icon={DollarSign} title="Valor del Viaje">
        <div 
          className="rounded-lg text-white"
          style={{ 
            padding: '12px',
            background: 'linear-gradient(135deg, hsl(215 50% 23%) 0%, hsl(215 40% 35%) 100%)',
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
          <p><span style={{ color: 'hsl(215 20% 45%)' }}>Impuestos:</span> {quote.trip.currency} {quote.pricing.taxes.toLocaleString()}</p>
          <p><span style={{ color: 'hsl(215 20% 45%)' }}>Forma de pago:</span> {quote.pricing.paymentMethod}</p>
          <p><span style={{ color: 'hsl(215 20% 45%)' }}>Condiciones:</span> {quote.pricing.conditions}</p>
          {quote.pricing.observations && (
            <p 
              className="rounded"
              style={{ 
                marginTop: '6px', 
                padding: '6px', 
                fontSize: '10px',
                backgroundColor: 'hsl(45 93% 95%)',
                color: 'hsl(30 80% 30%)',
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
