// src/lib/pricing/pricingCore.ts
// Pure functions extraídas de usePricingCalculator y useOccupancyPricingCalculator.
// Sin dependencias de React — testeables con Vitest directamente.

import {
  Lodging,
  RoomOccupancy,
  PricingBreakdown,
  Quote,
} from '@/types/quote';

// ── Lodging ───────────────────────────────────────────────────

export function calculateLodgingTotals(lodging: Lodging): { cost: number; price: number } {
  if (lodging.pricingMode === 'total') {
    return {
      cost:  lodging.totalCost  || 0,
      price: lodging.totalPrice || 0,
    };
  }
  return {
    cost:  (lodging.costPerNight  || 0) * (lodging.nights || 0),
    price: (lodging.pricePerNight || 0) * (lodging.nights || 0),
  };
}

// ── Breakdown ─────────────────────────────────────────────────

export function sumBreakdown(breakdown: PricingBreakdown): { cost: number; price: number } {
  const keys = [
    'flights', 'transfers', 'trains', 'ferries',
    'rentalCars', 'activities', 'cruise', 'insurance',
  ] as const;

  return keys.reduce(
    (acc, key) => ({
      cost:  acc.cost  + (breakdown[key]?.cost  || 0),
      price: acc.price + (breakdown[key]?.price || 0),
    }),
    { cost: 0, price: 0 },
  );
}

// ── Margin ────────────────────────────────────────────────────

export function calculateMargin(
  cost: number,
  price: number,
): { margin: number; marginPercentage: number } {
  const margin = price - cost;
  const marginPercentage = cost > 0 ? (margin / cost) * 100 : 0;
  return { margin, marginPercentage };
}

// ── Per person ────────────────────────────────────────────────

export function calculatePerPerson(
  total: number,
  travelers: number,
): number {
  return travelers > 0 ? total / travelers : 0;
}

// ── Occupancy ─────────────────────────────────────────────────

export function getGuestsPerRoomType(roomType: RoomOccupancy['roomType']): number {
  const guests: Record<string, number> = {
    single:    1,
    double:    2,
    triple:    3,
    quadruple: 4,
    custom:    1,
  };
  return guests[roomType] || 1;
}

export function getOccupancyLabel(occupancy: RoomOccupancy): string {
  if (occupancy.roomType === 'custom' && occupancy.customTypeName) {
    return occupancy.customTypeName;
  }
  const labels: Record<string, string> = {
    single:    'Habitación Single',
    double:    'Habitación Doble',
    triple:    'Habitación Triple',
    quadruple: 'Habitación Cuádruple',
  };
  return labels[occupancy.roomType] || 'Habitación';
}

export function getOccupancyLabelShort(
  roomType: RoomOccupancy['roomType'],
  customName?: string,
): string {
  if (roomType === 'custom' && customName) return customName;
  const labels: Record<string, string> = {
    single:    'Single',
    double:    'Doble',
    triple:    'Triple',
    quadruple: 'Cuádruple',
  };
  return labels[roomType] || 'Habitación';
}

export function calculateOccupancyLodgingTotals(
  occupancy: RoomOccupancy,
  nights: number,
): { price: number; cost: number } {
  if (occupancy.pricingMode === 'total') {
    return {
      price: occupancy.totalPrice || 0,
      cost:  occupancy.totalCost  || 0,
    };
  }
  return {
    price: (occupancy.pricePerNight || 0) * nights * occupancy.roomCount,
    cost:  (occupancy.costPerNight  || 0) * nights * occupancy.roomCount,
  };
}

// ── Quote breakdown builder ───────────────────────────────────
// Extrae la lógica de construcción del breakdown desde un Quote.
// Usada por ambos hooks para calcular servicios compartidos.

export function buildBreakdownFromQuote(quote: Quote): PricingBreakdown {
  const breakdown: PricingBreakdown = {
    flights:    { cost: 0, price: 0 },
    transfers:  { cost: 0, price: 0 },
    trains:     { cost: 0, price: 0 },
    ferries:    { cost: 0, price: 0 },
    rentalCars: { cost: 0, price: 0 },
    activities: { cost: 0, price: 0 },
    cruise:     { cost: 0, price: 0 },
    insurance:  { cost: 0, price: 0 },
  };

  quote.flights.filter(f => !f.isOption).forEach(f => {
    breakdown.flights.cost  += f.cost  || 0;
    breakdown.flights.price += f.price || 0;
  });

  quote.transfers.filter(t => t.included).forEach(t => {
    breakdown.transfers.cost  += t.cost  || 0;
    breakdown.transfers.price += t.price || 0;
  });

  (quote.trains || []).filter(t => t.included !== false).forEach(t => {
    breakdown.trains.cost  += t.cost  || 0;
    breakdown.trains.price += t.price || 0;
  });

  (quote.ferries || []).filter(f => f.included !== false).forEach(f => {
    breakdown.ferries.cost  += f.cost  || 0;
    breakdown.ferries.price += f.price || 0;
  });

  (quote.rentalCars || []).filter(r => r.included !== false).forEach(r => {
    breakdown.rentalCars.cost  += r.cost  || 0;
    breakdown.rentalCars.price += r.price || 0;
  });

  (quote.activities || []).filter(a => a.included).forEach(a => {
    breakdown.activities.cost  += a.cost  || 0;
    breakdown.activities.price += a.price || 0;
  });

  if (quote.cruise) {
    breakdown.cruise.cost  = quote.cruise.cost  || 0;
    breakdown.cruise.price = quote.cruise.price || 0;
  }

  if (quote.insurance) {
    breakdown.insurance.cost  = quote.insurance.cost  || 0;
    breakdown.insurance.price = quote.insurance.price || 0;
  }

  return breakdown;
}
