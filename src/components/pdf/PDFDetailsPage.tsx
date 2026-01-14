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
    <div className="mb-6 rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="pdf-page">
      <h2 className="mb-6 border-b border-border pb-3 font-serif text-2xl font-bold text-foreground">
        Detalles del Viaje
      </h2>

      {/* Vuelos */}
      {template.sectionsToggles.flights && quote.flights.length > 0 && (
        <SectionCard icon={Plane} title="Vuelos">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Ruta</th>
                  <th className="px-3 py-2 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium">Horario</th>
                  <th className="px-3 py-2 text-left font-medium">Vuelo</th>
                </tr>
              </thead>
              <tbody>
                {quote.flights.map((flight, idx) => (
                  <tr key={flight.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                    <td className="px-3 py-2">
                      {flight.origin} → {flight.destination}
                    </td>
                    <td className="px-3 py-2">{formatDate(flight.date)}</td>
                    <td className="px-3 py-2">
                      {flight.departureTime} - {flight.arrivalTime}
                    </td>
                    <td className="px-3 py-2">
                      {flight.airline} {flight.flightNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {quote.flights[0]?.luggage && (
            <p className="mt-2 text-xs text-muted-foreground">
              Equipaje: {quote.flights[0].luggage}
            </p>
          )}
        </SectionCard>
      )}

      {/* Alojamiento */}
      {template.sectionsToggles.lodging && quote.lodging.name && (
        <SectionCard icon={Building2} title="Alojamiento">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-foreground">{quote.lodging.name}</h4>
              <p className="text-sm text-muted-foreground">{quote.lodging.category}</p>
              <p className="mt-2 text-sm">{quote.lodging.address}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Check-in:</span> {formatDate(quote.lodging.checkIn)}</p>
              <p><span className="text-muted-foreground">Check-out:</span> {formatDate(quote.lodging.checkOut)}</p>
              <p><span className="text-muted-foreground">Régimen:</span> {quote.lodging.regime}</p>
              <p><span className="text-muted-foreground">Habitación:</span> {quote.lodging.roomType}</p>
              <p><span className="text-muted-foreground">Noches:</span> {quote.lodging.nights}</p>
            </div>
          </div>
          {quote.lodging.notes && (
            <p className="mt-3 rounded bg-muted/50 p-2 text-xs text-muted-foreground">
              {quote.lodging.notes}
            </p>
          )}
        </SectionCard>
      )}

      {/* Traslados */}
      {template.sectionsToggles.transfers && quote.transfers.length > 0 && (
        <SectionCard icon={Car} title="Traslados">
          <ul className="space-y-2">
            {quote.transfers.map((transfer) => (
              <li key={transfer.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium">{transfer.type}:</span> {transfer.description}
                </span>
                <span className={`rounded px-2 py-0.5 text-xs ${
                  transfer.included 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
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
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><span className="text-muted-foreground">Compañía:</span> {quote.insurance.company}</p>
              <p><span className="text-muted-foreground">Plan:</span> {quote.insurance.plan}</p>
            </div>
            <div>
              <p><span className="text-muted-foreground">Cobertura:</span> {quote.insurance.coverage}</p>
            </div>
          </div>
          {quote.insurance.notes && (
            <p className="mt-2 text-xs text-muted-foreground">{quote.insurance.notes}</p>
          )}
        </SectionCard>
      )}

      {/* Valor del viaje */}
      <SectionCard icon={DollarSign} title="Valor del Viaje">
        <div className="rounded-lg bg-gradient-to-r from-primary to-navy-light p-4 text-white">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-white/70">Precio total</p>
              <p className="font-serif text-3xl font-bold">
                {quote.trip.currency} {quote.pricing.totalPrice.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/70">Por persona</p>
              <p className="font-serif text-xl">
                {quote.trip.currency} {quote.pricing.pricePerPerson.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <p><span className="text-muted-foreground">Impuestos:</span> {quote.trip.currency} {quote.pricing.taxes.toLocaleString()}</p>
          <p><span className="text-muted-foreground">Forma de pago:</span> {quote.pricing.paymentMethod}</p>
          <p><span className="text-muted-foreground">Condiciones:</span> {quote.pricing.conditions}</p>
          {quote.pricing.observations && (
            <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
              ⚠️ {quote.pricing.observations}
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
