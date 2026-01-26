import { useMemo } from 'react';
import { Quote, Lodging, RoomOccupancy, OccupancyPricing, PricingBreakdown, LodgingOptionOccupancyPricing } from '@/types/quote';

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
  // Cálculo por tipo de ocupación para alojamientos PRINCIPALES (no opciones)
  mainOccupancyPricing: OccupancyPricing[];
  // Cálculo por tipo de ocupación para cada OPCIÓN de alojamiento (alternativas)
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
  // Flags
  hasMainOccupancies: boolean;
  hasOptionOccupancies: boolean;
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

// Calcular ocupaciones para un alojamiento específico
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

    // Sumar vuelos
    quote.flights.forEach(f => {
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

    // Total servicios compartidos
    const sharedServices = {
      cost: breakdown.flights.cost + breakdown.transfers.cost + breakdown.trains.cost + 
            breakdown.ferries.cost + breakdown.rentalCars.cost + breakdown.activities.cost +
            breakdown.cruise.cost + breakdown.insurance.cost,
      price: breakdown.flights.price + breakdown.transfers.price + breakdown.trains.price + 
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
    // CALCULAR OCUPACIONES PARA ALOJAMIENTOS PRINCIPALES
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
    // CALCULAR OCUPACIONES PARA CADA OPCIÓN ALTERNATIVA (independientes)
    // ============================================
    const lodgingOptionsOccupancy: LodgingOptionOccupancyPricing[] = [];

    for (const lodging of optionLodgings) {
      const lodgingOccupancies = calculateLodgingOccupancies(
        lodging,
        sharedPerPersonPrice,
        sharedPerPersonCost
      );

      if (lodgingOccupancies.length > 0) {
        // Calcular totales para esta opción
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

    // Validación para alojamientos principales
    const hasMainOccupancies = mainOccupancyPricing.length > 0;
    const hasOptionOccupancies = lodgingOptionsOccupancy.length > 0;
    
    const mainIsValid = !hasMainOccupancies || mainGuestsAssigned === totalTravelers;
    const mainMessage = !hasMainOccupancies
      ? 'Configura las ocupaciones para los alojamientos'
      : mainIsValid 
        ? `✅ ${mainGuestsAssigned} pasajeros asignados correctamente`
        : `⚠️ ${mainGuestsAssigned} pasajeros asignados, pero el total es ${totalTravelers}`;

    return {
      sharedServices,
      sharedPerPerson: {
        cost: sharedPerPersonCost,
        price: sharedPerPersonPrice,
      },
      mainOccupancyPricing,
      lodgingOptionsOccupancy,
      grandTotal: {
        cost: grandTotalCost,
        price: grandTotalPrice,
        margin: grandMargin,
        marginPercentage: grandMarginPercentage,
      },
      mainValidation: {
        totalGuests: mainGuestsAssigned,
        expectedGuests: totalTravelers,
        isValid: mainIsValid,
        message: mainMessage,
      },
      breakdown,
      hasMainOccupancies,
      hasOptionOccupancies,
    };
  }, [quote]);

  return calculation;
}

// Helper para aplicar el cálculo de ocupación al pricing del quote
export function applyOccupancyPricing(
  calculation: OccupancyPricingCalculation
): Partial<import('@/types/quote').Pricing> {
  // Si no hay ocupaciones principales ni opciones con ocupaciones, no aplicar
  if (!calculation.hasMainOccupancies && !calculation.hasOptionOccupancies) {
    return {};
  }

  return {
    useOccupancyPricing: true,
    occupancyPricing: calculation.mainOccupancyPricing,
    lodgingOptionsOccupancy: calculation.lodgingOptionsOccupancy,
    calculationMode: 'automatic',
    fixedServicesTotal: calculation.sharedServices.price,
    fixedServicesCost: calculation.sharedServices.cost,
    breakdown: calculation.breakdown,
    totalPrice: calculation.grandTotal.price,
    totalCost: calculation.grandTotal.cost,
    margin: calculation.grandTotal.margin,
    marginPercentage: calculation.grandTotal.marginPercentage,
    // Precio por persona del primer tipo (para compatibilidad)
    pricePerPerson: calculation.mainOccupancyPricing[0]?.totalPerPerson || 0,
  };
}
