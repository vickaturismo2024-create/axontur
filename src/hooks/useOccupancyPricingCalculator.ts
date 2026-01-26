import { useMemo } from 'react';
import { Quote, Lodging, RoomOccupancy, OccupancyPricing, PricingBreakdown } from '@/types/quote';

export interface OccupancyPricingCalculation {
  // Total de servicios compartidos (vuelos, traslados, etc.)
  sharedServices: {
    cost: number;
    price: number;
  };
  // Cálculo por tipo de ocupación
  occupancyPricing: OccupancyPricing[];
  // Total general del viaje
  grandTotal: {
    cost: number;
    price: number;
    margin: number;
    marginPercentage: number;
  };
  // Validación
  validation: {
    totalGuests: number;
    expectedGuests: number;
    isValid: boolean;
    message: string;
  };
  // Desglose por categoría (para compatibilidad)
  breakdown: PricingBreakdown;
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

    // Obtener todos los alojamientos con ocupaciones
    const allLodgings = (quote.lodgings && quote.lodgings.length > 0)
      ? quote.lodgings
      : (quote.lodging?.name ? [quote.lodging] : []);

    // Recopilar todas las ocupaciones de todos los alojamientos
    const occupancyPricing: OccupancyPricing[] = [];
    let totalGuestsAssigned = 0;

    for (const lodging of allLodgings) {
      // Solo procesar si tiene ocupaciones y useOccupancies está activo
      if (!lodging.useOccupancies || !lodging.occupancies || lodging.occupancies.length === 0) {
        continue;
      }

      const nights = lodging.nights || 0;

      for (const occupancy of lodging.occupancies) {
        const guestCount = occupancy.roomCount * occupancy.guestsPerRoom;
        totalGuestsAssigned += guestCount;

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

        occupancyPricing.push({
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
    }

    // Calcular totales generales
    const grandTotalPrice = occupancyPricing.reduce((sum, o) => sum + o.totalForType, 0);
    const grandTotalCost = occupancyPricing.reduce((sum, o) => sum + o.totalCostPerPerson * o.guestCount, 0);
    const grandMargin = grandTotalPrice - grandTotalCost;
    const grandMarginPercentage = grandTotalCost > 0 ? (grandMargin / grandTotalCost) * 100 : 0;

    // Validación
    const hasOccupancies = occupancyPricing.length > 0;
    const isValid = !hasOccupancies || totalGuestsAssigned === totalTravelers;
    const message = !hasOccupancies
      ? 'Configura las ocupaciones para cada alojamiento'
      : isValid 
        ? `✅ ${totalGuestsAssigned} pasajeros asignados correctamente`
        : `⚠️ ${totalGuestsAssigned} pasajeros asignados, pero el total es ${totalTravelers}`;

    return {
      sharedServices,
      occupancyPricing,
      grandTotal: {
        cost: grandTotalCost,
        price: grandTotalPrice,
        margin: grandMargin,
        marginPercentage: grandMarginPercentage,
      },
      validation: {
        totalGuests: totalGuestsAssigned,
        expectedGuests: totalTravelers,
        isValid,
        message,
      },
      breakdown,
    };
  }, [quote]);

  return calculation;
}

// Helper para aplicar el cálculo de ocupación al pricing del quote
export function applyOccupancyPricing(
  calculation: OccupancyPricingCalculation
): Partial<import('@/types/quote').Pricing> {
  if (calculation.occupancyPricing.length === 0) {
    return {};
  }

  return {
    useOccupancyPricing: true,
    occupancyPricing: calculation.occupancyPricing,
    calculationMode: 'automatic',
    fixedServicesTotal: calculation.sharedServices.price,
    fixedServicesCost: calculation.sharedServices.cost,
    breakdown: calculation.breakdown,
    totalPrice: calculation.grandTotal.price,
    totalCost: calculation.grandTotal.cost,
    margin: calculation.grandTotal.margin,
    marginPercentage: calculation.grandTotal.marginPercentage,
    // Precio por persona del primer tipo (para compatibilidad)
    pricePerPerson: calculation.occupancyPricing[0]?.totalPerPerson || 0,
  };
}
