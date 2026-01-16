import { Quote, Template } from '@/types/quote';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plane, 
  Building2, 
  Car, 
  Shield, 
  DollarSign, 
  Train, 
  Ship, 
  Anchor,
  Compass,
  MapPin,
  Clock,
  Calendar
} from 'lucide-react';
import { PDFPageWrapper } from './PDFPageWrapper';
import { ReactNode } from 'react';

interface PDFDetailsPagesProps {
  quote: Quote;
  template: Template;
}

// Height estimates in pixels for pagination (more conservative estimates)
// A4 page is 297mm with 15mm padding on each side = 267mm content height
// 267mm ≈ 1009px at 96dpi, but we use more conservative 850px to account for variations
const HEIGHTS = {
  PAGE_MAX: 850, // Conservative max height to avoid overflow
  HEADER: 60,
  SECTION_HEADER: 50,
  FLIGHT_ROW: 40,
  LODGING_CARD: 160,
  CRUISE_BASE: 220,
  CRUISE_ITINERARY_ROW: 30,
  TRANSFER_ROW: 35,
  TRAIN_ROW: 40,
  FERRY_ROW: 40,
  RENTAL_CAR: 110,
  ACTIVITY: 100,
  INSURANCE: 110,
  PRICING: 220,
};

interface Section {
  id: string;
  height: number;
  component: ReactNode;
}

export function PDFDetailsPages({ quote, template }: PDFDetailsPagesProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  // Template colors
  const primaryColor = template.colors.primary;
  const secondaryColor = template.colors.secondary;
  const accentColor = template.colors.accent;
  const bgColor = template.colors.background || '#ffffff';
  const cardBgColor = template.colors.cardBackground || '#f8f9fa';

  // Get all lodgings
  const allLodgings = (quote.lodgings && quote.lodgings.length > 0) 
    ? quote.lodgings 
    : (quote.lodging?.name ? [quote.lodging] : []);
  const mainLodgings = allLodgings.filter(l => !l.isOption);
  const optionLodgings = allLodgings.filter(l => l.isOption);

  // Section card component
  const SectionCard = ({ 
    icon: Icon, 
    title, 
    children 
  }: { 
    icon: React.ElementType; 
    title: string; 
    children: ReactNode 
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

  // Build sections array with their estimated heights
  const buildSections = (): Section[] => {
    const sections: Section[] = [];

    // Flights section
    if (template.sectionsToggles.flights && quote.flights.length > 0) {
      sections.push({
        id: 'flights',
        height: HEIGHTS.SECTION_HEADER + (quote.flights.length * HEIGHTS.FLIGHT_ROW) + 40,
        component: (
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
                      <td style={{ padding: '6px 8px' }}>{flight.origin} → {flight.destination}</td>
                      <td style={{ padding: '6px 8px' }}>{formatDate(flight.date)}</td>
                      <td style={{ padding: '6px 8px' }}>{flight.departureTime} - {flight.arrivalTime}</td>
                      <td style={{ padding: '6px 8px' }}>{flight.airline} {flight.flightNumber}</td>
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
        )
      });
    }

    // Main Lodgings section
    if (template.sectionsToggles.lodging && mainLodgings.length > 0) {
      sections.push({
        id: 'mainLodgings',
        height: HEIGHTS.SECTION_HEADER + (mainLodgings.length * HEIGHTS.LODGING_CARD),
        component: (
          <SectionCard icon={Building2} title={mainLodgings.length > 1 ? "Alojamientos" : "Alojamiento"}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mainLodgings.map((lodging, index) => (
                <div 
                  key={lodging.id || index}
                  className="rounded border"
                  style={{ 
                    padding: '10px',
                    borderColor: secondaryColor,
                    backgroundColor: index % 2 === 0 ? bgColor : cardBgColor
                  }}
                >
                  {mainLodgings.length > 1 && lodging.destination && (
                    <p style={{ fontSize: '10px', marginBottom: '4px', color: accentColor, fontWeight: 600 }}>
                      📍 {lodging.destination}
                    </p>
                  )}
                  <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                    <div>
                      <h4 className="font-semibold" style={{ fontSize: '12px', color: primaryColor }}>{lodging.name}</h4>
                      <p style={{ fontSize: '11px', color: `${primaryColor}99` }}>{lodging.category}</p>
                      {lodging.address && (
                        <p style={{ marginTop: '4px', fontSize: '11px' }}>{lodging.address}</p>
                      )}
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      {lodging.checkIn && <p><span style={{ color: `${primaryColor}99` }}>Check-in:</span> {formatDate(lodging.checkIn)}</p>}
                      {lodging.checkOut && <p><span style={{ color: `${primaryColor}99` }}>Check-out:</span> {formatDate(lodging.checkOut)}</p>}
                      {lodging.regime && <p><span style={{ color: `${primaryColor}99` }}>Régimen:</span> {lodging.regime}</p>}
                      {lodging.roomType && <p><span style={{ color: `${primaryColor}99` }}>Habitación:</span> {lodging.roomType}</p>}
                      {lodging.nights !== undefined && lodging.nights > 0 && <p><span style={{ color: `${primaryColor}99` }}>Noches:</span> {lodging.nights}</p>}
                    </div>
                  </div>
                  {lodging.notes && (
                    <p 
                      className="rounded"
                      style={{ 
                        marginTop: '6px', 
                        padding: '4px 6px', 
                        fontSize: '10px', 
                        backgroundColor: cardBgColor,
                        color: `${primaryColor}99`,
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      {lodging.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )
      });
    }

    // Option Lodgings section
    if (template.sectionsToggles.lodging && optionLodgings.length > 0) {
      sections.push({
        id: 'optionLodgings',
        height: HEIGHTS.SECTION_HEADER + 30 + (optionLodgings.length * HEIGHTS.LODGING_CARD),
        component: (
          <SectionCard icon={Building2} title="Opciones de Alojamiento">
            <p style={{ fontSize: '10px', marginBottom: '10px', color: `${primaryColor}80`, fontStyle: 'italic' }}>
              A continuación se presentan opciones alternativas para su elección:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {optionLodgings.map((lodging, index) => (
                <div 
                  key={lodging.id || index}
                  className="rounded border"
                  style={{ 
                    padding: '10px',
                    borderColor: accentColor,
                    borderStyle: 'dashed',
                    backgroundColor: bgColor
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span 
                      className="rounded"
                      style={{ 
                        padding: '2px 8px', 
                        fontSize: '10px', 
                        fontWeight: 600,
                        backgroundColor: `${accentColor}33`,
                        color: primaryColor
                      }}
                    >
                      🏷️ {lodging.optionLabel || `Opción ${index + 1}`}
                    </span>
                    {lodging.pricePerNight !== undefined && lodging.pricePerNight > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: primaryColor }}>
                        {quote.trip.currency} {lodging.pricePerNight}/noche
                      </span>
                    )}
                  </div>
                  {lodging.destination && (
                    <p style={{ fontSize: '10px', marginBottom: '4px', color: `${primaryColor}80` }}>
                      📍 {lodging.destination}
                    </p>
                  )}
                  <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                    <div>
                      <h4 className="font-semibold" style={{ fontSize: '12px', color: primaryColor }}>{lodging.name}</h4>
                      <p style={{ fontSize: '11px', color: `${primaryColor}99` }}>{lodging.category}</p>
                      {lodging.address && (
                        <p style={{ marginTop: '4px', fontSize: '11px' }}>{lodging.address}</p>
                      )}
                    </div>
                    <div style={{ fontSize: '11px' }}>
                      {lodging.checkIn && <p><span style={{ color: `${primaryColor}99` }}>Check-in:</span> {formatDate(lodging.checkIn)}</p>}
                      {lodging.checkOut && <p><span style={{ color: `${primaryColor}99` }}>Check-out:</span> {formatDate(lodging.checkOut)}</p>}
                      {lodging.regime && <p><span style={{ color: `${primaryColor}99` }}>Régimen:</span> {lodging.regime}</p>}
                      {lodging.roomType && <p><span style={{ color: `${primaryColor}99` }}>Habitación:</span> {lodging.roomType}</p>}
                      {lodging.nights !== undefined && lodging.nights > 0 && <p><span style={{ color: `${primaryColor}99` }}>Noches:</span> {lodging.nights}</p>}
                    </div>
                  </div>
                  {lodging.notes && (
                    <p 
                      className="rounded"
                      style={{ 
                        marginTop: '6px', 
                        padding: '4px 6px', 
                        fontSize: '10px', 
                        backgroundColor: cardBgColor,
                        color: `${primaryColor}99`
                      }}
                    >
                      {lodging.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )
      });
    }

    // Cruise section
    if ((template.sectionsToggles?.cruise !== false) && quote.cruise?.shipName) {
      const cruiseItineraryLength = quote.cruise.itinerary?.length || 0;
      sections.push({
        id: 'cruise',
        height: HEIGHTS.CRUISE_BASE + (cruiseItineraryLength * HEIGHTS.CRUISE_ITINERARY_ROW),
        component: (
          <SectionCard icon={Anchor} title="Crucero">
            <div className="grid grid-cols-2" style={{ gap: '12px' }}>
              <div>
                <h4 className="font-semibold" style={{ fontSize: '12px', color: primaryColor }}>
                  {quote.cruise.shipName}
                </h4>
                <p style={{ fontSize: '11px', color: `${primaryColor}99` }}>{quote.cruise.company}</p>
                <div style={{ marginTop: '6px', fontSize: '11px' }}>
                  <p><span style={{ color: `${primaryColor}99` }}>Cabina:</span> {quote.cruise.cabinType} {quote.cruise.cabinNumber && `- ${quote.cruise.cabinNumber}`}</p>
                  {quote.cruise.deck && <p><span style={{ color: `${primaryColor}99` }}>Cubierta:</span> {quote.cruise.deck}</p>}
                  {quote.cruise.regime && <p><span style={{ color: `${primaryColor}99` }}>Régimen:</span> {quote.cruise.regime}</p>}
                  {quote.cruise.nights > 0 && <p><span style={{ color: `${primaryColor}99` }}>Noches:</span> {quote.cruise.nights}</p>}
                </div>
              </div>
              <div style={{ fontSize: '11px' }}>
                <p><span style={{ color: `${primaryColor}99` }}>Embarque:</span> {quote.cruise.embarkationPort}</p>
                {quote.cruise.embarkationDate && <p style={{ fontSize: '10px', color: `${primaryColor}80` }}>{formatDate(quote.cruise.embarkationDate)}</p>}
                <p style={{ marginTop: '4px' }}><span style={{ color: `${primaryColor}99` }}>Desembarque:</span> {quote.cruise.disembarkationPort}</p>
                {quote.cruise.disembarkationDate && <p style={{ fontSize: '10px', color: `${primaryColor}80` }}>{formatDate(quote.cruise.disembarkationDate)}</p>}
              </div>
            </div>

            {quote.cruise.itinerary && quote.cruise.itinerary.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: primaryColor, marginBottom: '6px' }}>Itinerario:</p>
                <div className="overflow-hidden rounded border" style={{ borderColor: secondaryColor }}>
                  <table className="w-full" style={{ fontSize: '10px' }}>
                    <thead style={{ backgroundColor: cardBgColor }}>
                      <tr>
                        <th className="text-left font-medium" style={{ padding: '4px 6px', color: primaryColor }}>Día</th>
                        <th className="text-left font-medium" style={{ padding: '4px 6px', color: primaryColor }}>Puerto</th>
                        <th className="text-left font-medium" style={{ padding: '4px 6px', color: primaryColor }}>Llegada</th>
                        <th className="text-left font-medium" style={{ padding: '4px 6px', color: primaryColor }}>Salida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.cruise.itinerary.map((port, idx) => (
                        <tr key={port.id} style={{ backgroundColor: idx % 2 === 0 ? bgColor : cardBgColor }}>
                          <td style={{ padding: '4px 6px' }}>{port.day}</td>
                          <td style={{ padding: '4px 6px' }}>{port.port}{port.country && `, ${port.country}`}</td>
                          <td style={{ padding: '4px 6px' }}>{port.arrivalTime || '-'}</td>
                          <td style={{ padding: '4px 6px' }}>{port.departureTime || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {quote.cruise.extras && (
              <div style={{ marginTop: '10px', fontSize: '10px' }}>
                <p style={{ fontWeight: 600, color: primaryColor, marginBottom: '4px' }}>Extras incluidos:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {quote.cruise.extras.tips && (
                    <span className="rounded" style={{ padding: '2px 6px', backgroundColor: `${accentColor}33`, color: primaryColor }}>
                      Propinas: {quote.cruise.extras.tips}
                    </span>
                  )}
                  {quote.cruise.extras.beverages && (
                    <span className="rounded" style={{ padding: '2px 6px', backgroundColor: `${accentColor}33`, color: primaryColor }}>
                      Bebidas: {quote.cruise.extras.beverages}
                    </span>
                  )}
                  {quote.cruise.extras.wifi && (
                    <span className="rounded" style={{ padding: '2px 6px', backgroundColor: `${accentColor}33`, color: primaryColor }}>
                      WiFi: {quote.cruise.extras.wifi}
                    </span>
                  )}
                  {quote.cruise.extras.excursions && (
                    <span className="rounded" style={{ padding: '2px 6px', backgroundColor: `${accentColor}33`, color: primaryColor }}>
                      Excursiones: {quote.cruise.extras.excursions}
                    </span>
                  )}
                  {quote.cruise.extras.specialDining && (
                    <span className="rounded" style={{ padding: '2px 6px', backgroundColor: `${accentColor}33`, color: primaryColor }}>
                      Cenas especiales: {quote.cruise.extras.specialDining}
                    </span>
                  )}
                  {quote.cruise.extras.spa && (
                    <span className="rounded" style={{ padding: '2px 6px', backgroundColor: `${accentColor}33`, color: primaryColor }}>
                      Spa: {quote.cruise.extras.spa}
                    </span>
                  )}
                </div>
                {quote.cruise.extras.other && (
                  <p style={{ marginTop: '4px', color: `${primaryColor}99` }}>{quote.cruise.extras.other}</p>
                )}
              </div>
            )}

            {quote.cruise.notes && (
              <p className="rounded" style={{ marginTop: '8px', padding: '6px', fontSize: '10px', backgroundColor: cardBgColor, color: `${primaryColor}99` }}>
                {quote.cruise.notes}
              </p>
            )}
          </SectionCard>
        )
      });
    }

    // Transfers section
    if (template.sectionsToggles.transfers && quote.transfers.length > 0) {
      sections.push({
        id: 'transfers',
        height: HEIGHTS.SECTION_HEADER + (quote.transfers.length * HEIGHTS.TRANSFER_ROW) + 20,
        component: (
          <SectionCard icon={Car} title="Traslados">
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {quote.transfers.map((transfer) => (
                <li key={transfer.id} className="flex items-center justify-between" style={{ fontSize: '11px' }}>
                  <span>
                    <span className="font-medium">{transfer.type}:</span> {transfer.description}
                    {transfer.dateTime && <span style={{ marginLeft: '6px', color: `${primaryColor}80` }}>({transfer.dateTime})</span>}
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
        )
      });
    }

    // Trains section
    if ((template.sectionsToggles?.trains !== false) && quote.trains && quote.trains.length > 0) {
      sections.push({
        id: 'trains',
        height: HEIGHTS.SECTION_HEADER + (quote.trains.length * HEIGHTS.TRAIN_ROW) + 40,
        component: (
          <SectionCard icon={Train} title="Trenes">
            <div className="overflow-hidden rounded border" style={{ borderColor: secondaryColor }}>
              <table className="w-full" style={{ fontSize: '11px' }}>
                <thead style={{ backgroundColor: cardBgColor }}>
                  <tr>
                    <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Ruta</th>
                    <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Fecha</th>
                    <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Horario</th>
                    <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Tren</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.trains.map((train, idx) => (
                    <tr key={train.id} style={{ backgroundColor: idx % 2 === 0 ? bgColor : cardBgColor }}>
                      <td style={{ padding: '6px 8px' }}>{train.origin} → {train.destination}</td>
                      <td style={{ padding: '6px 8px' }}>{formatDate(train.date)}</td>
                      <td style={{ padding: '6px 8px' }}>{train.departureTime} - {train.arrivalTime}</td>
                      <td style={{ padding: '6px 8px' }}>
                        {train.company} {train.trainNumber}
                        {train.class && <span style={{ marginLeft: '4px', fontSize: '10px', color: `${primaryColor}80` }}>({train.class})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )
      });
    }

    // Ferries section
    if ((template.sectionsToggles?.ferries !== false) && quote.ferries && quote.ferries.length > 0) {
      sections.push({
        id: 'ferries',
        height: HEIGHTS.SECTION_HEADER + (quote.ferries.length * HEIGHTS.FERRY_ROW) + 40,
        component: (
          <SectionCard icon={Ship} title="Ferrys">
            <div className="overflow-hidden rounded border" style={{ borderColor: secondaryColor }}>
              <table className="w-full" style={{ fontSize: '11px' }}>
                <thead style={{ backgroundColor: cardBgColor }}>
                  <tr>
                    <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Ruta</th>
                    <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Fecha</th>
                    <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Horario</th>
                    <th className="text-left font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Compañía</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.ferries.map((ferry, idx) => (
                    <tr key={ferry.id} style={{ backgroundColor: idx % 2 === 0 ? bgColor : cardBgColor }}>
                      <td style={{ padding: '6px 8px' }}>{ferry.origin} → {ferry.destination}</td>
                      <td style={{ padding: '6px 8px' }}>{formatDate(ferry.date)}</td>
                      <td style={{ padding: '6px 8px' }}>{ferry.departureTime} - {ferry.arrivalTime}</td>
                      <td style={{ padding: '6px 8px' }}>
                        {ferry.company}
                        {ferry.vessel && <span style={{ marginLeft: '4px', fontSize: '10px', color: `${primaryColor}80` }}>({ferry.vessel})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )
      });
    }

    // Rental Cars section
    if ((template.sectionsToggles?.rentalCars !== false) && quote.rentalCars && quote.rentalCars.length > 0) {
      sections.push({
        id: 'rentalCars',
        height: HEIGHTS.SECTION_HEADER + (quote.rentalCars.length * HEIGHTS.RENTAL_CAR),
        component: (
          <SectionCard icon={Car} title="Autos de Alquiler">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quote.rentalCars.map((car, index) => (
                <div 
                  key={car.id}
                  className="rounded border"
                  style={{ padding: '8px', borderColor: secondaryColor, backgroundColor: index % 2 === 0 ? bgColor : cardBgColor }}
                >
                  <div className="grid grid-cols-2" style={{ gap: '8px', fontSize: '11px' }}>
                    <div>
                      <p className="font-semibold" style={{ color: primaryColor }}>{car.company}</p>
                      {car.carType && <p style={{ fontSize: '10px', color: `${primaryColor}80` }}>{car.carType}</p>}
                    </div>
                    <div style={{ fontSize: '10px' }}>
                      <p><span style={{ color: `${primaryColor}99` }}>Retiro:</span> {car.pickupLocation}</p>
                      <p>{formatDate(car.pickupDate)} {car.pickupTime}</p>
                      <p style={{ marginTop: '4px' }}><span style={{ color: `${primaryColor}99` }}>Devolución:</span> {car.dropoffLocation}</p>
                      <p>{formatDate(car.dropoffDate)} {car.dropoffTime}</p>
                    </div>
                  </div>
                  {car.extras && (
                    <p style={{ marginTop: '4px', fontSize: '10px', color: `${primaryColor}80` }}>Extras: {car.extras}</p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )
      });
    }

    // Activities section
    if ((template.sectionsToggles?.activities !== false) && quote.activities && quote.activities.length > 0) {
      sections.push({
        id: 'activities',
        height: HEIGHTS.SECTION_HEADER + (quote.activities.length * HEIGHTS.ACTIVITY),
        component: (
          <SectionCard icon={Compass} title="Actividades y Excursiones">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quote.activities.map((activity, index) => (
                <div 
                  key={activity.id}
                  className="rounded border flex items-start justify-between"
                  style={{ padding: '8px', borderColor: secondaryColor, backgroundColor: index % 2 === 0 ? bgColor : cardBgColor }}
                >
                  <div style={{ flex: 1 }}>
                    <p className="font-semibold" style={{ fontSize: '12px', color: primaryColor }}>{activity.name}</p>
                    {activity.description && (
                      <p style={{ fontSize: '10px', color: `${primaryColor}80`, marginTop: '2px' }}>{activity.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '10px', color: `${primaryColor}99` }}>
                      {activity.date && (
                        <span className="flex items-center" style={{ gap: '2px' }}>
                          <Calendar style={{ width: '10px', height: '10px' }} />
                          {formatDate(activity.date)}
                        </span>
                      )}
                      {activity.time && (
                        <span className="flex items-center" style={{ gap: '2px' }}>
                          <Clock style={{ width: '10px', height: '10px' }} />
                          {activity.time}
                        </span>
                      )}
                      {activity.duration && <span>Duración: {activity.duration}</span>}
                      {activity.location && (
                        <span className="flex items-center" style={{ gap: '2px' }}>
                          <MapPin style={{ width: '10px', height: '10px' }} />
                          {activity.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span 
                      className="rounded"
                      style={{ 
                        padding: '2px 6px', 
                        fontSize: '9px',
                        backgroundColor: activity.included ? 'hsl(142 70% 95%)' : `${accentColor}33`,
                        color: activity.included ? 'hsl(142 70% 30%)' : primaryColor
                      }}
                    >
                      {activity.included ? 'Incluida' : 'Opcional'}
                    </span>
                    {activity.price !== undefined && activity.price > 0 && (
                      <p style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600, color: primaryColor }}>
                        {quote.trip.currency} {activity.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )
      });
    }

    // Insurance section
    if (template.sectionsToggles.insurance && quote.insurance?.company) {
      sections.push({
        id: 'insurance',
        height: HEIGHTS.INSURANCE,
        component: (
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
        )
      });
    }

    // Pricing section (always last)
    sections.push({
      id: 'pricing',
      height: HEIGHTS.PRICING,
      component: (
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
                  {quote.trip.currency} {(quote.pricing?.totalPrice || 0).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Por persona</p>
                <p className="font-serif" style={{ fontSize: '16px' }}>
                  {quote.trip.currency} {(quote.pricing?.pricePerPerson || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {quote.pricing?.taxes !== undefined && quote.pricing.taxes > 0 && (
              <p><span style={{ color: `${primaryColor}99` }}>Impuestos:</span> {quote.trip.currency} {quote.pricing.taxes.toLocaleString()}</p>
            )}
            {quote.pricing?.paymentMethod && (
              <p><span style={{ color: `${primaryColor}99` }}>Forma de pago:</span> {quote.pricing.paymentMethod}</p>
            )}
            {quote.pricing?.conditions && (
              <p><span style={{ color: `${primaryColor}99` }}>Condiciones:</span> {quote.pricing.conditions}</p>
            )}
            {quote.pricing?.observations && (
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
      )
    });

    return sections;
  };

  // Group sections into pages
  const groupSectionsIntoPages = (sections: Section[]): Section[][] => {
    const pages: Section[][] = [];
    let currentPage: Section[] = [];
    let currentHeight = HEIGHTS.HEADER;

    for (const section of sections) {
      if (currentHeight + section.height > HEIGHTS.PAGE_MAX) {
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

    if (currentPage.length > 0) {
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
          key={`details-page-${pageIndex}`}
          title="Detalles del Viaje"
          continuation={pageIndex > 0}
          backgroundColor={cardBgColor}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        >
          {pageSections.map((section) => (
            <div key={section.id}>{section.component}</div>
          ))}
        </PDFPageWrapper>
      ))}
    </>
  );
}
