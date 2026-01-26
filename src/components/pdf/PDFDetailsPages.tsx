import { Quote, Template, ItemPricesConfig, OccupancyPricing, OccupancyTypeWithOptions } from '@/types/quote';
import { format, parseISO } from 'date-fns';
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
  Calendar,
  Users
} from 'lucide-react';
import { PDFPageWrapper } from './PDFPageWrapper';
import { ReactNode } from 'react';
import { useLodgingGroups, organizeLodgingsByGroups } from '@/hooks/useLodgingGroups';

// Parse dates correctly - use parseISO for YYYY-MM-DD format to avoid timezone issues
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    return format(date, "d MMM yyyy", { locale: es });
  } catch {
    return dateString;
  }
};

interface PDFDetailsPagesProps {
  quote: Quote;
  template: Template;
}

// Height estimates in pixels for pagination
// A4 page is 297mm with 15mm padding on each side = 267mm content height
// 267mm ≈ 1009px at 96dpi, we use 900px as realistic limit
const HEIGHTS = {
  PAGE_MAX: 900, // Realistic max for A4 content area
  HEADER: 50,
  SECTION_HEADER: 45,
  FLIGHT_ROW: 32,
  LODGING_CARD: 140,
  LODGING_GROUP_HEADER: 40,
  CRUISE_BASE: 180,
  CRUISE_ITINERARY_ROW: 28,
  TRANSFER_ROW: 32,
  TRAIN_ROW: 32,
  FERRY_ROW: 32,
  RENTAL_CAR: 100,
  ACTIVITY: 80,
  INSURANCE: 100,
  PRICING: 180,
};

interface Section {
  id: string;
  height: number;
  component: ReactNode;
}

export function PDFDetailsPages({ quote, template }: PDFDetailsPagesProps) {
  // Use the module-level formatDate function (defined above with parseISO)

  // Template colors
  const primaryColor = template.colors.primary;
  const secondaryColor = template.colors.secondary;
  const accentColor = template.colors.accent;
  const bgColor = template.colors.background || '#ffffff';
  const cardBgColor = template.colors.cardBackground || '#f8f9fa';

  // Item prices visibility config
  const showItemPrices = quote.pricing?.showItemPrices ?? false;
  const itemPricesConfig: ItemPricesConfig = quote.pricing?.itemPricesConfig ?? {
    flights: false,
    lodging: false,
    transfers: false,
    trains: false,
    ferries: false,
    rentalCars: false,
    activities: false,
    cruise: false,
    insurance: false,
  };

  // Format currency helper
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === 0) return null;
    return `${quote.trip.currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Get all lodgings
  const allLodgings = (quote.lodgings && quote.lodgings.length > 0) 
    ? quote.lodgings 
    : (quote.lodging?.name ? [quote.lodging] : []);
  const mainLodgings = allLodgings.filter(l => !l.isOption);
  const optionLodgings = allLodgings.filter(l => l.isOption);

  // Get lodging groups
  const { groups } = useLodgingGroups(allLodgings);
  const { grouped: groupedLodgings, ungrouped: ungroupedOptions } = organizeLodgingsByGroups(allLodgings, groups);

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
      const showFlightPrices = showItemPrices && itemPricesConfig.flights;
      const flightsTotalPrice = quote.flights.reduce((sum, f) => sum + (f.price || 0), 0);
      
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
                    {showFlightPrices && (
                      <th className="text-right font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Precio</th>
                    )}
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
                      {showFlightPrices && (
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>
                          {formatCurrency(flight.price) || '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {showFlightPrices && flightsTotalPrice > 0 && (
                  <tfoot style={{ backgroundColor: cardBgColor, borderTop: `1px solid ${secondaryColor}` }}>
                    <tr>
                      <td colSpan={4} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: primaryColor }}>
                        Total vuelos:
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: primaryColor }}>
                        {formatCurrency(flightsTotalPrice)}
                      </td>
                    </tr>
                  </tfoot>
                )}
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
      const showLodgingPrices = showItemPrices && itemPricesConfig.lodging;
      
      // Helper to get lodging total price
      const getLodgingPrice = (lodging: typeof mainLodgings[0]) => {
        if (lodging.pricingMode === 'total') {
          return lodging.totalPrice || 0;
        }
        return (lodging.pricePerNight || 0) * (lodging.nights || 0);
      };

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
                      {lodging.checkIn && lodging.checkIn.trim() !== '' && <p><span style={{ color: `${primaryColor}99` }}>Check-in:</span> {formatDate(lodging.checkIn)}</p>}
                      {lodging.checkOut && lodging.checkOut.trim() !== '' && <p><span style={{ color: `${primaryColor}99` }}>Check-out:</span> {formatDate(lodging.checkOut)}</p>}
                      {lodging.regime && lodging.regime.trim() !== '' && <p><span style={{ color: `${primaryColor}99` }}>Régimen:</span> {lodging.regime}</p>}
                      {lodging.roomType && lodging.roomType.trim() !== '' && <p><span style={{ color: `${primaryColor}99` }}>Habitación:</span> {lodging.roomType}</p>}
                      {lodging.nights !== undefined && lodging.nights > 0 && <p><span style={{ color: `${primaryColor}99` }}>Noches:</span> {lodging.nights}</p>}
                      {showLodgingPrices && getLodgingPrice(lodging) > 0 && (
                        <p style={{ marginTop: '4px', fontWeight: 600, color: primaryColor }}>
                          Precio: {formatCurrency(getLodgingPrice(lodging))}
                        </p>
                      )}
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

    // Option Lodgings section - now with grouping support
    if (template.sectionsToggles.lodging && optionLodgings.length > 0) {
      const showLodgingPrices = showItemPrices && itemPricesConfig.lodging;
      
      // Helper to get lodging total price
      const getOptionLodgingPrice = (lodging: typeof optionLodgings[0]) => {
        if (lodging.pricingMode === 'total') {
          return lodging.totalPrice || 0;
        }
        return (lodging.pricePerNight || 0) * (lodging.nights || 0);
      };

      // Render a single lodging option card
      const renderLodgingCard = (lodging: typeof optionLodgings[0], index: number, showDestination: boolean = true) => (
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
            {showLodgingPrices && getOptionLodgingPrice(lodging) > 0 ? (
              <span style={{ fontSize: '11px', fontWeight: 600, color: primaryColor }}>
                {formatCurrency(getOptionLodgingPrice(lodging))}
              </span>
            ) : lodging.pricePerNight !== undefined && lodging.pricePerNight > 0 ? (
              <span style={{ fontSize: '11px', fontWeight: 600, color: primaryColor }}>
                {quote.trip.currency} {lodging.pricePerNight}/noche
              </span>
            ) : null}
          </div>
          {showDestination && lodging.destination && (
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
              {lodging.checkIn && lodging.checkIn.trim() !== '' && <p><span style={{ color: `${primaryColor}99` }}>Check-in:</span> {formatDate(lodging.checkIn)}</p>}
              {lodging.checkOut && lodging.checkOut.trim() !== '' && <p><span style={{ color: `${primaryColor}99` }}>Check-out:</span> {formatDate(lodging.checkOut)}</p>}
              {lodging.regime && lodging.regime.trim() !== '' && <p><span style={{ color: `${primaryColor}99` }}>Régimen:</span> {lodging.regime}</p>}
              {lodging.roomType && lodging.roomType.trim() !== '' && <p><span style={{ color: `${primaryColor}99` }}>Habitación:</span> {lodging.roomType}</p>}
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
      );

      // Calculate height based on groups and ungrouped
      const groupCount = groupedLodgings.size;
      const totalCards = optionLodgings.length;
      const totalHeight = HEIGHTS.SECTION_HEADER + 30 + 
        (groupCount * HEIGHTS.LODGING_GROUP_HEADER) + 
        (totalCards * HEIGHTS.LODGING_CARD);

      sections.push({
        id: 'optionLodgings',
        height: totalHeight,
        component: (
          <SectionCard icon={Building2} title="Opciones de Alojamiento">
            <p style={{ fontSize: '10px', marginBottom: '10px', color: `${primaryColor}80`, fontStyle: 'italic' }}>
              A continuación se presentan opciones alternativas para su elección:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Render grouped lodgings */}
              {Array.from(groupedLodgings.entries()).map(([groupId, { group, lodgings: groupLodgings }]) => (
                <div key={groupId}>
                  {/* Group header */}
                  <div 
                    className="rounded-t"
                    style={{ 
                      padding: '8px 12px',
                      backgroundColor: `${secondaryColor}20`,
                      borderBottom: `2px solid ${accentColor}`,
                      marginBottom: '8px'
                    }}
                  >
                    <p style={{ fontSize: '11px', fontWeight: 600, color: primaryColor }}>
                      📍 {group.destination || 'Sin destino'}
                      {group.checkIn && group.checkOut && (
                        <span style={{ marginLeft: '8px', fontWeight: 400, color: `${primaryColor}80` }}>
                          ({formatDate(group.checkIn)} - {formatDate(group.checkOut)}, {group.nights} noches)
                        </span>
                      )}
                    </p>
                  </div>
                  {/* Group lodging cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px' }}>
                    {groupLodgings.map((lodging, idx) => renderLodgingCard(lodging, idx, false))}
                  </div>
                </div>
              ))}
              
              {/* Render ungrouped lodgings */}
              {ungroupedOptions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {groupedLodgings.size > 0 && (
                    <p style={{ fontSize: '10px', color: `${primaryColor}60`, marginTop: '8px' }}>
                      Otras opciones:
                    </p>
                  )}
                  {ungroupedOptions.map((lodging, index) => renderLodgingCard(lodging, index, true))}
                </div>
              )}
              
              {/* Fallback: if no groups and no ungrouped (shouldn't happen but safe) */}
              {groupedLodgings.size === 0 && ungroupedOptions.length === 0 && optionLodgings.map((lodging, index) => 
                renderLodgingCard(lodging, index, true)
              )}
            </div>
          </SectionCard>
        )
      });
    }

    // Cruise section
    if ((template.sectionsToggles?.cruise !== false) && quote.cruise?.shipName) {
      const showCruisePrices = showItemPrices && itemPricesConfig.cruise;
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
                {showCruisePrices && formatCurrency(quote.cruise.price) && (
                  <p style={{ marginTop: '6px', fontWeight: 600, color: primaryColor }}>
                    Precio: {formatCurrency(quote.cruise.price)}
                  </p>
                )}
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
      const showTransferPrices = showItemPrices && itemPricesConfig.transfers;
      const transfersTotalPrice = quote.transfers.reduce((sum, t) => sum + (t.price || 0), 0);
      
      sections.push({
        id: 'transfers',
        height: HEIGHTS.SECTION_HEADER + (quote.transfers.length * HEIGHTS.TRANSFER_ROW) + 20,
        component: (
          <SectionCard icon={Car} title="Traslados">
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {quote.transfers.map((transfer) => (
                <li key={transfer.id} className="flex items-center justify-between" style={{ fontSize: '11px' }}>
                  <span style={{ flex: 1 }}>
                    <span className="font-medium">{transfer.type}:</span> {transfer.description}
                    {transfer.dateTime && <span style={{ marginLeft: '6px', color: `${primaryColor}80` }}>({transfer.dateTime})</span>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {showTransferPrices && formatCurrency(transfer.price) && (
                      <span style={{ fontWeight: 500 }}>{formatCurrency(transfer.price)}</span>
                    )}
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
                  </div>
                </li>
              ))}
            </ul>
            {showTransferPrices && transfersTotalPrice > 0 && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${secondaryColor}`, textAlign: 'right' }}>
                <span style={{ fontWeight: 600, color: primaryColor }}>
                  Total traslados: {formatCurrency(transfersTotalPrice)}
                </span>
              </div>
            )}
          </SectionCard>
        )
      });
    }

    // Trains section
    if ((template.sectionsToggles?.trains !== false) && quote.trains && quote.trains.length > 0) {
      const showTrainPrices = showItemPrices && itemPricesConfig.trains;
      const trainsTotalPrice = quote.trains.reduce((sum, t) => sum + (t.price || 0), 0);
      
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
                    {showTrainPrices && (
                      <th className="text-right font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Precio</th>
                    )}
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
                      {showTrainPrices && (
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>
                          {formatCurrency(train.price) || '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {showTrainPrices && trainsTotalPrice > 0 && (
                  <tfoot style={{ backgroundColor: cardBgColor, borderTop: `1px solid ${secondaryColor}` }}>
                    <tr>
                      <td colSpan={4} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: primaryColor }}>
                        Total trenes:
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: primaryColor }}>
                        {formatCurrency(trainsTotalPrice)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </SectionCard>
        )
      });
    }

    // Ferries section
    if ((template.sectionsToggles?.ferries !== false) && quote.ferries && quote.ferries.length > 0) {
      const showFerryPrices = showItemPrices && itemPricesConfig.ferries;
      const ferriesTotalPrice = quote.ferries.reduce((sum, f) => sum + (f.price || 0), 0);
      
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
                    {showFerryPrices && (
                      <th className="text-right font-medium" style={{ padding: '6px 8px', color: primaryColor }}>Precio</th>
                    )}
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
                      {showFerryPrices && (
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500 }}>
                          {formatCurrency(ferry.price) || '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {showFerryPrices && ferriesTotalPrice > 0 && (
                  <tfoot style={{ backgroundColor: cardBgColor, borderTop: `1px solid ${secondaryColor}` }}>
                    <tr>
                      <td colSpan={4} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: primaryColor }}>
                        Total ferrys:
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: primaryColor }}>
                        {formatCurrency(ferriesTotalPrice)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </SectionCard>
        )
      });
    }

    // Rental Cars section
    if ((template.sectionsToggles?.rentalCars !== false) && quote.rentalCars && quote.rentalCars.length > 0) {
      const showRentalCarPrices = showItemPrices && itemPricesConfig.rentalCars;
      const rentalCarsTotalPrice = quote.rentalCars.reduce((sum, c) => sum + (c.price || 0), 0);
      
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
                  {car.extras && car.extras.trim() !== '' && (
                    <p style={{ marginTop: '4px', fontSize: '10px', color: `${primaryColor}80` }}>Extras: {car.extras}</p>
                  )}
                  {showRentalCarPrices && formatCurrency(car.price) && (
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: `1px dashed ${secondaryColor}`, textAlign: 'right' }}>
                      <span style={{ fontWeight: 600, color: primaryColor }}>{formatCurrency(car.price)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {showRentalCarPrices && rentalCarsTotalPrice > 0 && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${secondaryColor}`, textAlign: 'right' }}>
                <span style={{ fontWeight: 600, color: primaryColor }}>
                  Total autos: {formatCurrency(rentalCarsTotalPrice)}
                </span>
              </div>
            )}
          </SectionCard>
        )
      });
    }

    // Activities section
    if ((template.sectionsToggles?.activities !== false) && quote.activities && quote.activities.length > 0) {
      const showActivityPrices = showItemPrices && itemPricesConfig.activities;
      const activitiesTotalPrice = quote.activities.reduce((sum, a) => sum + (a.price || 0), 0);
      
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
                    {showActivityPrices && activity.price !== undefined && activity.price > 0 && (
                      <p style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600, color: primaryColor }}>
                        {formatCurrency(activity.price)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {showActivityPrices && activitiesTotalPrice > 0 && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${secondaryColor}`, textAlign: 'right' }}>
                <span style={{ fontWeight: 600, color: primaryColor }}>
                  Total actividades: {formatCurrency(activitiesTotalPrice)}
                </span>
              </div>
            )}
          </SectionCard>
        )
      });
    }

    // Insurance section - only show if company is defined
    if (template.sectionsToggles.insurance && quote.insurance?.company && quote.insurance.company.trim() !== '') {
      const showInsurancePrices = showItemPrices && itemPricesConfig.insurance;
      
      sections.push({
        id: 'insurance',
        height: HEIGHTS.INSURANCE,
        component: (
          <SectionCard icon={Shield} title="Asistencia al Viajero">
            <div className="grid grid-cols-2" style={{ gap: '12px', fontSize: '11px' }}>
              <div>
                <p><span style={{ color: `${primaryColor}99` }}>Compañía:</span> {quote.insurance.company}</p>
                {quote.insurance.plan && quote.insurance.plan.trim() !== '' && (
                  <p><span style={{ color: `${primaryColor}99` }}>Plan:</span> {quote.insurance.plan}</p>
                )}
                {showInsurancePrices && formatCurrency(quote.insurance.price) && (
                  <p style={{ marginTop: '4px', fontWeight: 600, color: primaryColor }}>
                    Precio: {formatCurrency(quote.insurance.price)}
                  </p>
                )}
              </div>
              {quote.insurance.coverage && quote.insurance.coverage.trim() !== '' && (
                <div>
                  <p><span style={{ color: `${primaryColor}99` }}>Cobertura:</span> {quote.insurance.coverage}</p>
                </div>
              )}
            </div>
            {quote.insurance.notes && quote.insurance.notes.trim() !== '' && (
              <p style={{ marginTop: '6px', fontSize: '10px', color: `${primaryColor}99` }}>{quote.insurance.notes}</p>
            )}
          </SectionCard>
        )
      });
    }

    // Pricing section - only show if there's actual pricing data
    const hasOccupancyTypesWithOptions = quote.pricing?.occupancyTypesWithOptions && quote.pricing.occupancyTypesWithOptions.length > 0;
    const hasMainOccupancyPricing = quote.pricing?.useOccupancyPricing && quote.pricing?.occupancyPricing && quote.pricing.occupancyPricing.length > 0;
    const hasOptionOccupancyPricing = quote.pricing?.lodgingOptionsOccupancy && quote.pricing.lodgingOptionsOccupancy.length > 0;
    const hasLodgingOptions = quote.pricing?.lodgingOptions && quote.pricing.lodgingOptions.length > 0;
    const hasLodgingOptionsWithPrice = hasLodgingOptions && quote.pricing.lodgingOptions!.some(opt => opt.totalPrice > 0);
    const hasTotalPrice = (quote.pricing?.totalPrice || 0) > 0;
    const hasPricePerPerson = (quote.pricing?.pricePerPerson || 0) > 0;
    const hasTaxes = (quote.pricing?.taxes || 0) > 0;
    const hasPaymentMethod = quote.pricing?.paymentMethod && quote.pricing.paymentMethod.trim() !== '';
    const hasConditions = quote.pricing?.conditions && quote.pricing.conditions.trim() !== '';
    const hasObservations = quote.pricing?.observations && quote.pricing.observations.trim() !== '';
    
    // Only show pricing section if there's meaningful data
    const hasPricingData = hasOccupancyTypesWithOptions || hasMainOccupancyPricing || hasOptionOccupancyPricing || hasLodgingOptionsWithPrice || hasTotalPrice || hasPricePerPerson || hasTaxes || hasPaymentMethod || hasConditions || hasObservations;
    
    if (hasPricingData) {
      const occTypesCount = quote.pricing?.occupancyTypesWithOptions?.length || 0;
      const mainOccCount = quote.pricing?.occupancyPricing?.length || 0;
      const optionOccCount = quote.pricing?.lodgingOptionsOccupancy?.reduce((sum, opt) => sum + opt.occupancyPricing.length, 0) || 0;
      const pricingHeight = hasOccupancyTypesWithOptions
        ? HEIGHTS.PRICING + (occTypesCount * 200)
        : hasMainOccupancyPricing || hasOptionOccupancyPricing
          ? HEIGHTS.PRICING + (mainOccCount * 100) + (optionOccCount * 80) + ((quote.pricing?.lodgingOptionsOccupancy?.length || 0) * 60)
          : hasLodgingOptions 
            ? HEIGHTS.PRICING + (quote.pricing.lodgingOptions!.length * 80) 
            : HEIGHTS.PRICING;

      sections.push({
        id: 'pricing',
        height: pricingHeight,
        component: (
          <SectionCard icon={DollarSign} title="Valor del Viaje">
            {/* NEW: Occupancy Types with Options - Main display */}
            {hasOccupancyTypesWithOptions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '10px', color: `${primaryColor}80`, marginBottom: '4px' }}>
                  Precio por persona según tipo de habitación:
                </p>
                {quote.pricing.occupancyTypesWithOptions!.map((occType, idx) => (
                  <div 
                    key={occType.id}
                    className="rounded-lg"
                    style={{ 
                      padding: '12px',
                      border: `1px solid ${secondaryColor}`,
                      backgroundColor: bgColor,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    {/* Occupancy type header */}
                    <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        className="rounded"
                        style={{ 
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: idx === 0 ? primaryColor : idx === 1 ? secondaryColor : accentColor,
                          color: 'white'
                        }}
                      >
                        🛏️ HABITACIÓN {occType.occupancyLabel.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '10px', color: `${primaryColor}80` }}>
                        ({occType.guestsPerRoom} pasajero{occType.guestsPerRoom !== 1 ? 's' : ''} por habitación)
                      </span>
                    </div>

                    {/* Base breakdown - hidden for cleaner client view */}

                    {/* Options or single price */}
                    {occType.hasOptions ? (
                      <div>
                        <p style={{ fontSize: '10px', fontWeight: 600, color: accentColor, marginBottom: '8px' }}>
                          📋 Opciones de alojamiento (elija una):
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {occType.lodgingOptions.map((option, optIdx) => (
                            <div 
                              key={option.lodgingId}
                              className="rounded text-white"
                              style={{ 
                                padding: '10px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: optIdx === 0 
                                  ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                                  : `linear-gradient(135deg, ${secondaryColor} 0%, ${accentColor} 100%)`,
                                WebkitPrintColorAdjust: 'exact',
                                printColorAdjust: 'exact'
                              }}
                            >
                              <div>
                                <p style={{ fontSize: '11px', fontWeight: 600 }}>
                                  {option.optionLabel}: {option.lodgingName}
                                </p>
                                {option.destination && (
                                  <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>
                                    📍 {option.destination}
                                  </p>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p className="font-serif font-bold" style={{ fontSize: '16px' }}>
                                  {quote.trip.currency} {option.totalPricePerPerson.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </p>
                                <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>
                                  por persona
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="rounded text-white"
                        style={{ 
                          padding: '12px',
                          textAlign: 'center',
                          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                      >
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>TOTAL POR PERSONA</p>
                        <p className="font-serif font-bold" style={{ fontSize: '20px' }}>
                          {quote.trip.currency} {(occType.singleTotalPerPerson || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* LEGACY: Main Occupancy-based pricing (old system) */}
            {!hasOccupancyTypesWithOptions && hasMainOccupancyPricing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: hasOptionOccupancyPricing ? '16px' : '0' }}>
                <p style={{ fontSize: '10px', color: `${primaryColor}80`, marginBottom: '4px' }}>
                  Precio por persona según tipo de habitación:
                </p>
                {quote.pricing.occupancyPricing!.map((occ, idx) => (
                  <div 
                    key={occ.occupancyId}
                    className="rounded-lg text-white"
                    style={{ 
                      padding: '12px',
                      background: idx === 0 
                        ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                        : idx === 1
                          ? `linear-gradient(135deg, ${secondaryColor} 0%, ${accentColor} 100%)`
                          : `linear-gradient(135deg, ${accentColor} 0%, ${primaryColor} 100%)`,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <div className="flex items-center" style={{ gap: '8px', marginBottom: '8px' }}>
                      <span 
                        className="rounded"
                        style={{ 
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 600,
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          color: 'white'
                        }}
                      >
                        🛏️ {occ.occupancyType.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>
                        ({occ.guestCount} pasajero{occ.guestCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Precio por persona</p>
                        <p className="font-serif font-bold" style={{ fontSize: '20px' }}>
                          {quote.trip.currency} {occ.totalPerPerson.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      {/* Internal breakdown hidden for cleaner client view */}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* LEGACY: Alternative Lodging Options with occupancy pricing */}
            {!hasOccupancyTypesWithOptions && hasOptionOccupancyPricing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '10px', color: `${accentColor}`, fontWeight: 600, fontStyle: 'italic' }}>
                  📋 Opciones alternativas de alojamiento (elija una):
                </p>
                {quote.pricing.lodgingOptionsOccupancy!.map((option, optIdx) => (
                  <div 
                    key={option.lodgingId}
                    className="rounded-lg"
                    style={{ 
                      padding: '12px',
                      border: `2px dashed ${accentColor}`,
                      backgroundColor: `${accentColor}10`,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span 
                          className="rounded"
                          style={{ 
                            padding: '3px 10px',
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: accentColor,
                            color: 'white'
                          }}
                        >
                          🏷️ {option.lodgingLabel.toUpperCase()}
                        </span>
                        <p style={{ fontSize: '11px', fontWeight: 500, marginTop: '4px', color: primaryColor }}>
                          {option.lodgingName}
                        </p>
                      </div>
                    </div>
                    
                    {/* Occupancy types for this option */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {option.occupancyPricing.map((occ, occIdx) => (
                        <div 
                          key={occ.occupancyId}
                          className="rounded text-white"
                          style={{ 
                            padding: '10px',
                            background: occIdx === 0 
                              ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                              : `linear-gradient(135deg, ${secondaryColor} 0%, ${accentColor} 100%)`,
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center" style={{ gap: '6px' }}>
                              <span style={{ fontSize: '9px', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                                🛏️ {occ.occupancyType.toUpperCase()}
                              </span>
                              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)' }}>
                                ({occ.guestCount} pax)
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-serif font-bold" style={{ fontSize: '16px' }}>
                                {quote.trip.currency} {occ.totalPerPerson.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                <span style={{ fontSize: '9px', fontWeight: 400, marginLeft: '4px' }}>/ persona</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Legacy: Lodging Options without occupancy (fallback) */}
            {!hasMainOccupancyPricing && !hasOptionOccupancyPricing && hasLodgingOptionsWithPrice ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {quote.pricing.lodgingOptions!.filter(opt => opt.totalPrice > 0).map((option, idx) => (
                  <div 
                    key={option.lodgingId}
                    className="rounded-lg text-white"
                    style={{ 
                      padding: '12px',
                      background: idx === 0 
                        ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                        : `linear-gradient(135deg, ${secondaryColor} 0%, ${accentColor} 100%)`,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <p style={{ fontSize: '10px', marginBottom: '6px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                      🏷️ {option.lodgingLabel.toUpperCase()}
                    </p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Precio total</p>
                        <p className="font-serif font-bold" style={{ fontSize: '20px' }}>
                          {quote.trip.currency} {option.totalPrice.toLocaleString()}
                        </p>
                      </div>
                      {option.pricePerPerson > 0 && (
                        <div className="text-right">
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Por persona</p>
                          <p className="font-serif" style={{ fontSize: '14px' }}>
                            {quote.trip.currency} {option.pricePerPerson.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (!hasOccupancyTypesWithOptions && !hasMainOccupancyPricing && (hasTotalPrice || hasPricePerPerson)) ? (
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
                  {hasTotalPrice && (
                    <div>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Precio total</p>
                      <p className="font-serif font-bold" style={{ fontSize: '22px' }}>
                        {quote.trip.currency} {(quote.pricing?.totalPrice || 0).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {hasPricePerPerson && (
                    <div className="text-right">
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Por persona</p>
                      <p className="font-serif" style={{ fontSize: '16px' }}>
                        {quote.trip.currency} {(quote.pricing?.pricePerPerson || 0).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            {(hasTaxes || hasPaymentMethod || hasConditions || hasObservations) && (
              <div style={{ marginTop: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {hasTaxes && (
                  <p><span style={{ color: `${primaryColor}99` }}>Impuestos:</span> {quote.trip.currency} {quote.pricing!.taxes!.toLocaleString()}</p>
                )}
                {hasPaymentMethod && (
                  <p><span style={{ color: `${primaryColor}99` }}>Forma de pago:</span> {quote.pricing!.paymentMethod}</p>
                )}
                {hasConditions && (
                  <p><span style={{ color: `${primaryColor}99` }}>Condiciones:</span> {quote.pricing!.conditions}</p>
                )}
                {hasObservations && (
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
                    ⚠️ {quote.pricing!.observations}
                  </p>
                )}
              </div>
            )}
          </SectionCard>
        )
      });
    }

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
