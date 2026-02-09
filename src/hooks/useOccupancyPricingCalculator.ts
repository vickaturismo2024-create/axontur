import { useMemo } from 'react';
import { 
  Quote, 
  Flight,
  Lodging, 
  RoomOccupancy, 
  OccupancyPricing, 
  PricingBreakdown, 
  LodgingOptionOccupancyPricing,
  OccupancyTypeWithOptions,
  LodgingOptionForOccupancy,
  FlightOptionPricing,
  FlightSegment
} from '@/types/quote';

export interface OccupancyPricingCalculation {
  // Total de servicios compartidos (vuelos, traslados, etc.)
  sharedServices: {
    cost: number;
    price: number;
  };
  // Por persona (servicios compartidos)
  sharedPerPerson: {
    cost: number;
    price: number;
  };
  // NUEVO: Precios agrupados por tipo de ocupación con opciones dentro
  occupancyTypesWithOptions: OccupancyTypeWithOptions[];
  // Legacy: Cálculo por tipo de ocupación para alojamientos PRINCIPALES (no opciones)
  mainOccupancyPricing: OccupancyPricing[];
  // Legacy: Cálculo por tipo de ocupación para cada OPCIÓN de alojamiento (alternativas)
  lodgingOptionsOccupancy: LodgingOptionOccupancyPricing[];
  // Total general del viaje (solo alojamientos principales)
  grandTotal: {
    cost: number;
    price: number;
    margin: number;
    marginPercentage: number;
  };
  // Validación para alojamientos principales
  mainValidation: {
    totalGuests: number;
    expectedGuests: number;
    isValid: boolean;
    message: string;
  };
  // Desglose por categoría (para compatibilidad)
  breakdown: PricingBreakdown;
  // NUEVO: Precios por opción de vuelo
  flightOptionsPricing: FlightOptionPricing[];
  hasFlightOptions: boolean;
  // Flags
  hasMainOccupancies: boolean;
  hasOptionOccupancies: boolean;
  hasOccupancyTypesWithOptions: boolean;
}

// Helper para obtener etiqueta del tipo de ocupación
export function getOccupancyLabel(occupancy: RoomOccupancy): string {
  if (occupancy.roomType === 'custom' && occupancy.customTypeName) {
    return occupancy.customTypeName;
  }
  
  const labels: Record<string, string> = {
    single: 'Habitación Single',
    double: 'Habitación Doble',
    triple: 'Habitación Triple',
    quadruple: 'Habitación Cuádruple',
  };
  
  return labels[occupancy.roomType] || 'Habitación';
}

// Helper para obtener etiqueta corta del tipo de ocupación
export function getOccupancyLabelShort(roomType: RoomOccupancy['roomType'], customName?: string): string {
  if (roomType === 'custom' && customName) {
    return customName;
  }
  
  const labels: Record<string, string> = {
    single: 'Single',
    double: 'Doble',
    triple: 'Triple',
    quadruple: 'Cuádruple',
  };
  
  return labels[roomType] || 'Habitación';
}

// Helper para obtener pasajeros por habitación según tipo
export function getGuestsPerRoomType(roomType: RoomOccupancy['roomType']): number {
  const guests: Record<string, number> = {
    single: 1,
    double: 2,
    triple: 3,
    quadruple: 4,
    custom: 1,
  };
  return guests[roomType] || 1;
}

// Crear ocupación vacía
export function createEmptyOccupancy(roomType: RoomOccupancy['roomType'] = 'double'): RoomOccupancy {
  return {
    id: crypto.randomUUID(),
    roomType,
    roomCount: 1,
    guestsPerRoom: getGuestsPerRoomType(roomType),
    costPerNight: undefined,
    pricePerNight: undefined,
    pricingMode: 'perNight',
  };
}

// Calcular ocupaciones para un alojamiento específico (legacy)
function calculateLodgingOccupancies(
  lodging: Lodging,
  sharedPerPersonPrice: number,
  sharedPerPersonCost: number
): OccupancyPricing[] {
  const result: OccupancyPricing[] = [];
  
  if (!lodging.useOccupancies || !lodging.occupancies || lodging.occupancies.length === 0) {
    return result;
  }

  const nights = lodging.nights || 0;

  for (const occupancy of lodging.occupancies) {
    const guestCount = occupancy.roomCount * occupancy.guestsPerRoom;

    // Calcular precio/costo del alojamiento según modo
    let lodgingTotalPrice = 0;
    let lodgingTotalCost = 0;

    if (occupancy.pricingMode === 'total') {
      lodgingTotalPrice = occupancy.totalPrice || 0;
      lodgingTotalCost = occupancy.totalCost || 0;
    } else {
      // Por noche: precio × noches × cantidad de habitaciones
      lodgingTotalPrice = (occupancy.pricePerNight || 0) * nights * occupancy.roomCount;
      lodgingTotalCost = (occupancy.costPerNight || 0) * nights * occupancy.roomCount;
    }

    // Por persona
    const lodgingPerPerson = guestCount > 0 ? lodgingTotalPrice / guestCount : 0;
    const lodgingCostPerPerson = guestCount > 0 ? lodgingTotalCost / guestCount : 0;

    // Total por persona
    const totalPerPerson = sharedPerPersonPrice + lodgingPerPerson;
    const totalCostPerPerson = sharedPerPersonCost + lodgingCostPerPerson;

    // Total para este tipo de ocupación
    const totalForType = totalPerPerson * guestCount;

    // Margen
    const marginPerPerson = totalPerPerson - totalCostPerPerson;
    const marginPercentage = totalCostPerPerson > 0 
      ? (marginPerPerson / totalCostPerPerson) * 100 
      : 0;

    result.push({
      occupancyId: occupancy.id,
      occupancyType: getOccupancyLabel(occupancy),
      roomType: occupancy.roomType,
      guestCount,
      roomCount: occupancy.roomCount,
      sharedServicesPerPerson: sharedPerPersonPrice,
      lodgingTotalPrice,
      lodgingPerPerson,
      totalPerPerson,
      totalForType,
      sharedServicesCostPerPerson: sharedPerPersonCost,
      lodgingTotalCost,
      lodgingCostPerPerson,
      totalCostPerPerson,
      marginPerPerson,
      marginPercentage,
    });
  }

  return result;
}

// =====================================================
// NUEVO: Calcular precios agrupados por tipo de ocupación
// =====================================================
interface OccupancyTypeData {
  roomType: RoomOccupancy['roomType'];
  customTypeName?: string;
  guestsPerRoom: number;
  mainLodgings: { lodging: Lodging; occupancy: RoomOccupancy }[];
  optionLodgings: { lodging: Lodging; occupancy: RoomOccupancy }[];
}

function calculateOccupancyTypesWithOptions(
  allLodgings: Lodging[],
  sharedPerPersonPrice: number,
  sharedPerPersonCost: number
): OccupancyTypeWithOptions[] {
  // Separar alojamientos principales de opciones
  const mainLodgings = allLodgings.filter(l => !l.isOption && l.useOccupancies && l.occupancies?.length);
  const optionLodgings = allLodgings.filter(l => l.isOption && l.useOccupancies && l.occupancies?.length);

  // Mapear tipos de ocupación únicos
  const occupancyTypesMap = new Map<string, OccupancyTypeData>();

  // Poblar con alojamientos principales
  for (const lodging of mainLodgings) {
    for (const occupancy of lodging.occupancies || []) {
      const key = occupancy.roomType === 'custom' 
        ? `custom_${occupancy.customTypeName || 'custom'}` 
        : occupancy.roomType;
      
      if (!occupancyTypesMap.has(key)) {
        occupancyTypesMap.set(key, {
          roomType: occupancy.roomType,
          customTypeName: occupancy.customTypeName,
          guestsPerRoom: occupancy.guestsPerRoom,
          mainLodgings: [],
          optionLodgings: [],
        });
      }
      occupancyTypesMap.get(key)!.mainLodgings.push({ lodging, occupancy });
    }
  }

  // Poblar con opciones alternativas
  for (const lodging of optionLodgings) {
    for (const occupancy of lodging.occupancies || []) {
      const key = occupancy.roomType === 'custom' 
        ? `custom_${occupancy.customTypeName || 'custom'}` 
        : occupancy.roomType;
      
      if (!occupancyTypesMap.has(key)) {
        occupancyTypesMap.set(key, {
          roomType: occupancy.roomType,
          customTypeName: occupancy.customTypeName,
          guestsPerRoom: occupancy.guestsPerRoom,
          mainLodgings: [],
          optionLodgings: [],
        });
      }
      occupancyTypesMap.get(key)!.optionLodgings.push({ lodging, occupancy });
    }
  }

  // Calcular precios para cada tipo de ocupación
  const result: OccupancyTypeWithOptions[] = [];

  for (const [key, data] of occupancyTypesMap) {
    // Sumar alojamientos principales para este tipo
    let mainLodgingPrice = 0;
    let mainLodgingCost = 0;
    let totalRooms = 0;
    let totalGuests = 0;
    const mainLodgingDetails: OccupancyTypeWithOptions['mainLodgingDetails'] = [];

    for (const { lodging, occupancy } of data.mainLodgings) {
      const nights = lodging.nights || 0;
      const guests = occupancy.roomCount * occupancy.guestsPerRoom;
      
      // Solo contar habitaciones/pasajeros del primer alojamiento principal para el total
      // (asumimos configuración consistente)
      if (mainLodgingDetails.length === 0) {
        totalRooms = occupancy.roomCount;
        totalGuests = guests;
      }

      // Calcular precio del alojamiento
      let lodgingTotalPrice = 0;
      let lodgingTotalCost = 0;

      if (occupancy.pricingMode === 'total') {
        lodgingTotalPrice = occupancy.totalPrice || 0;
        lodgingTotalCost = occupancy.totalCost || 0;
      } else {
        lodgingTotalPrice = (occupancy.pricePerNight || 0) * nights * occupancy.roomCount;
        lodgingTotalCost = (occupancy.costPerNight || 0) * nights * occupancy.roomCount;
      }

      const pricePerPerson = guests > 0 ? lodgingTotalPrice / guests : 0;
      const costPerPerson = guests > 0 ? lodgingTotalCost / guests : 0;

      mainLodgingPrice += pricePerPerson;
      mainLodgingCost += costPerPerson;

      mainLodgingDetails.push({
        lodgingId: lodging.id || crypto.randomUUID(),
        lodgingName: lodging.name,
        destination: lodging.destination,
        pricePerPerson,
        costPerPerson,
      });
    }

    // Base: servicios compartidos + alojamientos principales
    const basePricePerPerson = sharedPerPersonPrice + mainLodgingPrice;
    const baseCostPerPerson = sharedPerPersonCost + mainLodgingCost;

    // Calcular cada opción alternativa
    const lodgingOptions: LodgingOptionForOccupancy[] = [];

    for (const { lodging, occupancy } of data.optionLodgings) {
      const nights = lodging.nights || 0;
      const guests = occupancy.roomCount * occupancy.guestsPerRoom;

      // Si no hay alojamientos principales, usar info de la opción
      if (totalRooms === 0) {
        totalRooms = occupancy.roomCount;
        totalGuests = guests;
      }

      let lodgingTotalPrice = 0;
      let lodgingTotalCost = 0;

      if (occupancy.pricingMode === 'total') {
        lodgingTotalPrice = occupancy.totalPrice || 0;
        lodgingTotalCost = occupancy.totalCost || 0;
      } else {
        lodgingTotalPrice = (occupancy.pricePerNight || 0) * nights * occupancy.roomCount;
        lodgingTotalCost = (occupancy.costPerNight || 0) * nights * occupancy.roomCount;
      }

      const lodgingPricePerPerson = guests > 0 ? lodgingTotalPrice / guests : 0;
      const lodgingCostPerPerson = guests > 0 ? lodgingTotalCost / guests : 0;

      const totalPricePerPerson = basePricePerPerson + lodgingPricePerPerson;
      const totalCostPerPerson = baseCostPerPerson + lodgingCostPerPerson;
      const marginPerPerson = totalPricePerPerson - totalCostPerPerson;
      const marginPercentage = totalCostPerPerson > 0 
        ? (marginPerPerson / totalCostPerPerson) * 100 
        : 0;

      lodgingOptions.push({
        lodgingId: lodging.id || crypto.randomUUID(),
        lodgingName: lodging.name,
        optionLabel: lodging.optionLabel || 'Opción',
        destination: lodging.destination,
        lodgingPricePerPerson,
        totalPricePerPerson,
        lodgingCostPerPerson,
        totalCostPerPerson,
        marginPerPerson,
        marginPercentage,
      });
    }

    // Calcular precio único si no hay opciones
    const hasOptions = lodgingOptions.length > 0;
    let singleTotalPerPerson: number | undefined;
    let singleTotalCostPerPerson: number | undefined;
    let marginPerPerson: number | undefined;
    let marginPercentage: number | undefined;

    if (!hasOptions) {
      singleTotalPerPerson = basePricePerPerson;
      singleTotalCostPerPerson = baseCostPerPerson;
      marginPerPerson = singleTotalPerPerson - singleTotalCostPerPerson;
      marginPercentage = singleTotalCostPerPerson > 0 
        ? (marginPerPerson / singleTotalCostPerPerson) * 100 
        : 0;
    }

    // Generar etiqueta
    const occupancyLabel = data.roomType === 'custom' && data.customTypeName
      ? data.customTypeName
      : getOccupancyLabelShort(data.roomType);

    result.push({
      id: crypto.randomUUID(),
      roomType: data.roomType,
      customTypeName: data.customTypeName,
      occupancyLabel,
      guestsPerRoom: data.guestsPerRoom,
      totalRooms,
      totalGuests,
      sharedServicesPerPerson: sharedPerPersonPrice,
      sharedServicesCostPerPerson: sharedPerPersonCost,
      mainLodgingPricePerPerson: mainLodgingPrice,
      mainLodgingCostPerPerson: mainLodgingCost,
      basePricePerPerson,
      baseCostPerPerson,
      mainLodgingDetails,
      hasOptions,
      lodgingOptions,
      singleTotalPerPerson,
      singleTotalCostPerPerson,
      marginPerPerson,
      marginPercentage,
    });
  }

  // Ordenar: single, double, triple, quadruple, custom
  const order = ['single', 'double', 'triple', 'quadruple', 'custom'];
  result.sort((a, b) => order.indexOf(a.roomType) - order.indexOf(b.roomType));

  return result;
}

export function useOccupancyPricingCalculator(quote: Quote): OccupancyPricingCalculation {
  const calculation = useMemo(() => {
    const totalTravelers = quote.trip.travelers || 1;
    
    // Calcular breakdown por categoría (servicios compartidos)
    const breakdown: PricingBreakdown = {
      flights: { cost: 0, price: 0 },
      transfers: { cost: 0, price: 0 },
      trains: { cost: 0, price: 0 },
      ferries: { cost: 0, price: 0 },
      rentalCars: { cost: 0, price: 0 },
      activities: { cost: 0, price: 0 },
      cruise: { cost: 0, price: 0 },
      insurance: { cost: 0, price: 0 },
    };

    // Detectar unidades de vuelo para saber si excluir vuelos de shared
    const connGroups = new Map<string, Flight[]>();
    const standFlights: Flight[] = [];
    for (const flight of quote.flights) {
      if (flight.connectionGroupId) {
        const g = connGroups.get(flight.connectionGroupId) || [];
        g.push(flight);
        connGroups.set(flight.connectionGroupId, g);
      } else {
        standFlights.push(flight);
      }
    }
    const autoDetectedMultipleFlights = (connGroups.size + standFlights.length) > 1;

    // Si hay auto-deteccion de multiples vuelos, NO incluir NINGUN vuelo en shared
    // porque cada vuelo sera una opcion independiente
    const mainFlights = autoDetectedMultipleFlights 
      ? [] 
      : quote.flights.filter(f => !f.isOption);
    mainFlights.forEach(f => {
      breakdown.flights.cost += f.cost || 0;
      breakdown.flights.price += f.price || 0;
    });

    // Sumar transfers
    quote.transfers.forEach(t => {
      breakdown.transfers.cost += t.cost || 0;
      breakdown.transfers.price += t.price || 0;
    });

    // Sumar trenes
    (quote.trains || []).forEach(t => {
      breakdown.trains.cost += t.cost || 0;
      breakdown.trains.price += t.price || 0;
    });

    // Sumar ferries
    (quote.ferries || []).forEach(f => {
      breakdown.ferries.cost += f.cost || 0;
      breakdown.ferries.price += f.price || 0;
    });

    // Sumar autos
    (quote.rentalCars || []).forEach(r => {
      breakdown.rentalCars.cost += r.cost || 0;
      breakdown.rentalCars.price += r.price || 0;
    });

    // Sumar actividades
    (quote.activities || []).forEach(a => {
      breakdown.activities.cost += a.cost || 0;
      breakdown.activities.price += a.price || 0;
    });

    // Crucero
    if (quote.cruise) {
      breakdown.cruise.cost = quote.cruise.cost || 0;
      breakdown.cruise.price = quote.cruise.price || 0;
    }

    // Seguro
    if (quote.insurance) {
      breakdown.insurance.cost = quote.insurance.cost || 0;
      breakdown.insurance.price = quote.insurance.price || 0;
    }

    // Total servicios compartidos (SIN vuelos opcionales, ya que cada opción tendrá su propio precio)
    const sharedServices = {
      cost: breakdown.flights.cost + breakdown.transfers.cost + breakdown.trains.cost + 
            breakdown.ferries.cost + breakdown.rentalCars.cost + breakdown.activities.cost +
            breakdown.cruise.cost + breakdown.insurance.cost,
      price: breakdown.flights.price + breakdown.transfers.price + breakdown.trains.price + 
             breakdown.ferries.price + breakdown.rentalCars.price + breakdown.activities.price +
             breakdown.cruise.price + breakdown.insurance.price,
    };

    // Base sin vuelos (para calcular opciones de vuelo)
    const baseWithoutFlights = {
      cost: breakdown.transfers.cost + breakdown.trains.cost + 
            breakdown.ferries.cost + breakdown.rentalCars.cost + breakdown.activities.cost +
            breakdown.cruise.cost + breakdown.insurance.cost,
      price: breakdown.transfers.price + breakdown.trains.price + 
             breakdown.ferries.price + breakdown.rentalCars.price + breakdown.activities.price +
             breakdown.cruise.price + breakdown.insurance.price,
    };

    // Por persona (servicios compartidos)
    const sharedPerPersonCost = totalTravelers > 0 ? sharedServices.cost / totalTravelers : 0;
    const sharedPerPersonPrice = totalTravelers > 0 ? sharedServices.price / totalTravelers : 0;

    // Obtener todos los alojamientos
    const allLodgings = (quote.lodgings && quote.lodgings.length > 0)
      ? quote.lodgings
      : (quote.lodging?.name ? [quote.lodging] : []);

    // Separar alojamientos principales de opciones alternativas
    const mainLodgings = allLodgings.filter(l => !l.isOption);
    const optionLodgings = allLodgings.filter(l => l.isOption);

    // ============================================
    // NUEVO: Calcular precios agrupados por tipo de ocupación
    // ============================================
    const occupancyTypesWithOptions = calculateOccupancyTypesWithOptions(
      allLodgings,
      sharedPerPersonPrice,
      sharedPerPersonCost
    );

    // ============================================
    // LEGACY: Calcular ocupaciones para alojamientos principales
    // ============================================
    const mainOccupancyPricing: OccupancyPricing[] = [];
    let mainGuestsAssigned = 0;

    for (const lodging of mainLodgings) {
      const lodgingOccupancies = calculateLodgingOccupancies(
        lodging,
        sharedPerPersonPrice,
        sharedPerPersonCost
      );
      
      for (const occ of lodgingOccupancies) {
        mainGuestsAssigned += occ.guestCount;
        mainOccupancyPricing.push(occ);
      }
    }

    // Calcular totales para alojamientos principales
    const grandTotalPrice = mainOccupancyPricing.reduce((sum, o) => sum + o.totalForType, 0);
    const grandTotalCost = mainOccupancyPricing.reduce((sum, o) => sum + o.totalCostPerPerson * o.guestCount, 0);
    const grandMargin = grandTotalPrice - grandTotalCost;
    const grandMarginPercentage = grandTotalCost > 0 ? (grandMargin / grandTotalCost) * 100 : 0;

    // ============================================
    // LEGACY: Calcular ocupaciones para cada opción alternativa
    // ============================================
    const lodgingOptionsOccupancy: LodgingOptionOccupancyPricing[] = [];

    for (const lodging of optionLodgings) {
      const lodgingOccupancies = calculateLodgingOccupancies(
        lodging,
        sharedPerPersonPrice,
        sharedPerPersonCost
      );

      if (lodgingOccupancies.length > 0) {
        const optionTotalPrice = lodgingOccupancies.reduce((sum, o) => sum + o.totalForType, 0);
        const optionTotalCost = lodgingOccupancies.reduce((sum, o) => sum + o.totalCostPerPerson * o.guestCount, 0);
        const optionMargin = optionTotalPrice - optionTotalCost;
        const optionMarginPercentage = optionTotalCost > 0 ? (optionMargin / optionTotalCost) * 100 : 0;

        lodgingOptionsOccupancy.push({
          lodgingId: lodging.id || crypto.randomUUID(),
          lodgingLabel: lodging.optionLabel || 'Opción alternativa',
          lodgingName: lodging.name,
          occupancyPricing: lodgingOccupancies,
          totalPrice: optionTotalPrice,
          totalCost: optionTotalCost,
          margin: optionMargin,
          marginPercentage: optionMarginPercentage,
        });
      }
    }

    // ============================================
    // NUEVO: Calcular precios por opción de vuelo
    // Agrupa tramos conectados (escalas) como una sola opción
    // DETECCIÓN AUTOMÁTICA: Si hay múltiples "unidades de vuelo", 
    // todas se tratan como opciones aunque no estén marcadas con isOption
    // ============================================
    const flightOptionsPricing: FlightOptionPricing[] = [];
    
    // Base sin vuelos para calcular totales
    const basePerPersonWithoutFlights = totalTravelers > 0 ? baseWithoutFlights.price / totalTravelers : 0;
    const baseCostPerPersonWithoutFlights = totalTravelers > 0 ? baseWithoutFlights.cost / totalTravelers : 0;

    // Agregar alojamientos principales a la base
    let lodgingPricePerPerson = 0;
    let lodgingCostPerPerson = 0;
    
    for (const lodging of mainLodgings) {
      if (lodging.useOccupancies && lodging.occupancies?.length) {
        // Usar promedio de ocupaciones
        const avgPrice = lodging.occupancies.reduce((sum, occ) => {
          const nights = lodging.nights || 0;
          const guests = occ.roomCount * occ.guestsPerRoom;
          if (occ.pricingMode === 'total') {
            return sum + ((occ.totalPrice || 0) / (guests || 1));
          }
          return sum + (((occ.pricePerNight || 0) * nights * occ.roomCount) / (guests || 1));
        }, 0) / (lodging.occupancies.length || 1);
        
        const avgCost = lodging.occupancies.reduce((sum, occ) => {
          const nights = lodging.nights || 0;
          const guests = occ.roomCount * occ.guestsPerRoom;
          if (occ.pricingMode === 'total') {
            return sum + ((occ.totalCost || 0) / (guests || 1));
          }
          return sum + (((occ.costPerNight || 0) * nights * occ.roomCount) / (guests || 1));
        }, 0) / (lodging.occupancies.length || 1);
        
        lodgingPricePerPerson += avgPrice;
        lodgingCostPerPerson += avgCost;
      } else {
        // Sistema legacy
        let totalPrice = 0;
        let totalCost = 0;
        if (lodging.pricingMode === 'total') {
          totalPrice = lodging.totalPrice || 0;
          totalCost = lodging.totalCost || 0;
        } else {
          totalPrice = (lodging.pricePerNight || 0) * (lodging.nights || 0);
          totalCost = (lodging.costPerNight || 0) * (lodging.nights || 0);
        }
        lodgingPricePerPerson += totalTravelers > 0 ? totalPrice / totalTravelers : 0;
        lodgingCostPerPerson += totalTravelers > 0 ? totalCost / totalTravelers : 0;
      }
    }

    const fullBasePerPerson = basePerPersonWithoutFlights + lodgingPricePerPerson;
    const fullBaseCostPerPerson = baseCostPerPersonWithoutFlights + lodgingCostPerPerson;

    // ============================================
    // PASO 1: Agrupar TODOS los vuelos por connectionGroupId
    // para identificar "unidades de vuelo" (un vuelo directo = 1 unidad, 
    // una conexión de 2+ tramos = 1 unidad)
    // ============================================
    const allFlights = quote.flights;
    const connectionGroups = new Map<string, typeof allFlights>();
    const standaloneFlights: typeof allFlights = [];

    for (const flight of allFlights) {
      if (flight.connectionGroupId) {
        const group = connectionGroups.get(flight.connectionGroupId) || [];
        group.push(flight);
        connectionGroups.set(flight.connectionGroupId, group);
      } else {
        standaloneFlights.push(flight);
      }
    }

    // Construir array de "unidades de vuelo"
    // Cada grupo de conexión = 1 unidad, cada vuelo standalone = 1 unidad
    interface FlightUnit {
      id: string;
      flights: typeof allFlights;
      isConnection: boolean;
      optionLabel: string;
      flightType: 'direct' | 'stopover' | 'charter';
    }

    const flightUnits: FlightUnit[] = [];
    let optionCounter = 1;

    // Agregar grupos de conexión
    for (const [groupId, groupFlights] of connectionGroups) {
      // Ordenar por fecha y hora de salida
      groupFlights.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.departureTime.localeCompare(b.departureTime);
      });

      const firstFlight = groupFlights[0];
      
      // Detectar si es ida/vuelta (origen del primero = destino del último y viceversa)
      const isRoundTrip = groupFlights.length >= 2 && 
        groupFlights[0].origin.toLowerCase().trim() === groupFlights[groupFlights.length - 1].destination.toLowerCase().trim() &&
        groupFlights[0].destination.toLowerCase().trim() === groupFlights[groupFlights.length - 1].origin.toLowerCase().trim();
      
      flightUnits.push({
        id: groupId,
        flights: groupFlights,
        isConnection: true,
        optionLabel: `Opción ${optionCounter}`,
        flightType: isRoundTrip ? 'direct' : 'stopover',
      });
      optionCounter++;
    }

    // Agregar vuelos standalone
    for (const flight of standaloneFlights) {
      flightUnits.push({
        id: flight.id,
        flights: [flight],
        isConnection: false,
        optionLabel: `Opción ${optionCounter}`,
        flightType: flight.flightType || 'direct',
      });
      optionCounter++;
    }

    // ============================================
    // PASO 2: Si hay más de 1 unidad de vuelo, calcular precios 
    // para CADA unidad (detección automática de opciones)
    // ============================================
    const hasMultipleFlightOptions = flightUnits.length > 1;

    if (hasMultipleFlightOptions) {
      for (const unit of flightUnits) {
        // Sumar precios de todos los tramos de esta unidad
        const unitFlightPrice = unit.flights.reduce((sum, f) => sum + (f.price || 0), 0);
        const unitFlightCost = unit.flights.reduce((sum, f) => sum + (f.cost || 0), 0);
        const flightPricePerPerson = totalTravelers > 0 ? unitFlightPrice / totalTravelers : 0;
        const flightCostPerPerson = totalTravelers > 0 ? unitFlightCost / totalTravelers : 0;

        const totalPricePerPerson = fullBasePerPerson + flightPricePerPerson;
        const totalCostPerPerson = fullBaseCostPerPerson + flightCostPerPerson;
        const marginPerPerson = totalPricePerPerson - totalCostPerPerson;
        const marginPercentage = totalCostPerPerson > 0 ? (marginPerPerson / totalCostPerPerson) * 100 : 0;

        // Construir etiqueta de conexión si aplica
        let connectionLabel: string | undefined;
        let segments: FlightSegment[] | undefined;

        if (unit.isConnection) {
          const origins = unit.flights.map(f => f.origin);
          const lastDest = unit.flights[unit.flights.length - 1].destination;
          connectionLabel = [...origins, lastDest].join(' → ');
          
          segments = unit.flights.map(f => ({
            origin: f.origin,
            destination: f.destination,
            date: f.date,
            departureTime: f.departureTime,
            arrivalTime: f.arrivalTime,
            airline: f.airline,
            flightNumber: f.flightNumber,
          }));
        }

        const firstFlight = unit.flights[0];
        const luggageLabel = firstFlight.luggageType 
          ? firstFlight.luggage 
          : unit.flights.find(f => f.luggage)?.luggage || '';

        flightOptionsPricing.push({
          flightId: firstFlight.id,
          optionLabel: unit.optionLabel,
          flightType: unit.flightType,
          luggage: luggageLabel,
          luggageType: firstFlight.luggageType,
          flightPrice: unitFlightPrice,
          flightCost: unitFlightCost,
          basePriceWithoutFlights: fullBasePerPerson * totalTravelers,
          baseCostWithoutFlights: fullBaseCostPerPerson * totalTravelers,
          totalPrice: totalPricePerPerson * totalTravelers,
          totalCost: totalCostPerPerson * totalTravelers,
          pricePerPerson: totalPricePerPerson,
          costPerPerson: totalCostPerPerson,
          marginPerPerson,
          marginPercentage,
          flightIds: unit.flights.map(f => f.id),
          isConnectionGroup: unit.isConnection,
          connectionLabel,
          segments,
        });
      }
    }

    const hasFlightOptions = flightOptionsPricing.length > 0;

    // Validación
    const hasMainOccupancies = mainOccupancyPricing.length > 0;
    const hasOptionOccupancies = lodgingOptionsOccupancy.length > 0;
    const hasOccupancyTypesWithOptions = occupancyTypesWithOptions.length > 0;
    
    // Calcular pasajeros asignados desde el nuevo sistema
    const newSystemGuests = occupancyTypesWithOptions.reduce((sum, t) => sum + t.totalGuests, 0);
    const guestsToValidate = hasOccupancyTypesWithOptions ? newSystemGuests : mainGuestsAssigned;
    
    const mainIsValid = !hasOccupancyTypesWithOptions || guestsToValidate === totalTravelers;
    const mainMessage = !hasOccupancyTypesWithOptions
      ? 'Configura las ocupaciones para los alojamientos'
      : mainIsValid 
        ? `✅ ${guestsToValidate} pasajeros asignados correctamente`
        : `⚠️ ${guestsToValidate} pasajeros asignados, pero el total es ${totalTravelers}`;

    return {
      sharedServices,
      sharedPerPerson: {
        cost: sharedPerPersonCost,
        price: sharedPerPersonPrice,
      },
      occupancyTypesWithOptions,
      mainOccupancyPricing,
      lodgingOptionsOccupancy,
      grandTotal: {
        cost: grandTotalCost,
        price: grandTotalPrice,
        margin: grandMargin,
        marginPercentage: grandMarginPercentage,
      },
      mainValidation: {
        totalGuests: guestsToValidate,
        expectedGuests: totalTravelers,
        isValid: mainIsValid,
        message: mainMessage,
      },
      breakdown,
      flightOptionsPricing,
      hasFlightOptions,
      hasMainOccupancies,
      hasOptionOccupancies,
      hasOccupancyTypesWithOptions,
    };
  }, [quote]);

  return calculation;
}

// Helper para aplicar el cálculo de ocupación al pricing del quote
export function applyOccupancyPricing(
  calculation: OccupancyPricingCalculation
): Partial<import('@/types/quote').Pricing> {
  // Si no hay ocupaciones NI opciones de vuelo, no aplicar
  if (!calculation.hasFlightOptions && !calculation.hasOccupancyTypesWithOptions && !calculation.hasMainOccupancies && !calculation.hasOptionOccupancies) {
    return {};
  }

  // Calcular total del viaje (sin opciones alternativas)
  let totalPrice = 0;
  let totalCost = 0;

  if (calculation.hasOccupancyTypesWithOptions) {
    // Usar el nuevo sistema
    for (const occType of calculation.occupancyTypesWithOptions) {
      if (!occType.hasOptions && occType.singleTotalPerPerson !== undefined) {
        // Sin opciones: precio único
        totalPrice += occType.singleTotalPerPerson * occType.totalGuests;
        totalCost += (occType.singleTotalCostPerPerson || 0) * occType.totalGuests;
      } else if (occType.hasOptions) {
        // Con opciones: usar base (sin opciones alternativas)
        totalPrice += occType.basePricePerPerson * occType.totalGuests;
        totalCost += occType.baseCostPerPerson * occType.totalGuests;
      }
    }
  } else if (calculation.hasFlightOptions && calculation.flightOptionsPricing.length > 0) {
    // Usar primera opcion de vuelo como precio total de referencia
    totalPrice = calculation.flightOptionsPricing[0].totalPrice;
    totalCost = calculation.flightOptionsPricing[0].totalCost;
  } else {
    totalPrice = calculation.grandTotal.price;
    totalCost = calculation.grandTotal.cost;
  }

  const margin = totalPrice - totalCost;
  const marginPercentage = totalCost > 0 ? (margin / totalCost) * 100 : 0;

  return {
    useOccupancyPricing: true,
    occupancyTypesWithOptions: calculation.occupancyTypesWithOptions,
    occupancyPricing: calculation.mainOccupancyPricing,
    lodgingOptionsOccupancy: calculation.lodgingOptionsOccupancy,
    flightOptionsPricing: calculation.flightOptionsPricing,
    calculationMode: 'automatic',
    fixedServicesTotal: calculation.sharedServices.price,
    fixedServicesCost: calculation.sharedServices.cost,
    breakdown: calculation.breakdown,
    totalPrice,
    totalCost,
    margin,
    marginPercentage,
    // Precio por persona del primer tipo (para compatibilidad)
    pricePerPerson: calculation.occupancyTypesWithOptions[0]?.singleTotalPerPerson 
      || calculation.occupancyTypesWithOptions[0]?.basePricePerPerson
      || calculation.mainOccupancyPricing[0]?.totalPerPerson 
      || calculation.flightOptionsPricing[0]?.pricePerPerson
      || 0,
  };
}
