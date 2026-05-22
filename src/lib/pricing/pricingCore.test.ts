// src/lib/pricing/pricingCore.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateLodgingTotals,
  sumBreakdown,
  calculateMargin,
  calculatePerPerson,
  getGuestsPerRoomType,
  getOccupancyLabel,
  getOccupancyLabelShort,
  calculateOccupancyLodgingTotals,
  buildBreakdownFromQuote,
} from './pricingCore';
import type { Lodging, RoomOccupancy, PricingBreakdown, Quote } from '@/types/quote';

// ─────────────────────────────────────────────────────────────
// calculateLodgingTotals
// ─────────────────────────────────────────────────────────────
describe('calculateLodgingTotals', () => {
  it('modo total: devuelve totalCost y totalPrice directamente', () => {
    const lodging = { pricingMode: 'total', totalCost: 500, totalPrice: 700 } as Lodging;
    expect(calculateLodgingTotals(lodging)).toEqual({ cost: 500, price: 700 });
  });

  it('modo perNight: multiplica precio por noche × noches', () => {
    const lodging = {
      pricingMode: 'perNight',
      costPerNight: 100,
      pricePerNight: 150,
      nights: 5,
    } as Lodging;
    expect(calculateLodgingTotals(lodging)).toEqual({ cost: 500, price: 750 });
  });

  it('modo perNight con nights = 0: devuelve 0', () => {
    const lodging = {
      pricingMode: 'perNight',
      costPerNight: 100,
      pricePerNight: 150,
      nights: 0,
    } as Lodging;
    expect(calculateLodgingTotals(lodging)).toEqual({ cost: 0, price: 0 });
  });

  it('modo total con valores undefined: devuelve 0', () => {
    const lodging = { pricingMode: 'total' } as Lodging;
    expect(calculateLodgingTotals(lodging)).toEqual({ cost: 0, price: 0 });
  });
});

// ─────────────────────────────────────────────────────────────
// sumBreakdown
// ─────────────────────────────────────────────────────────────
describe('sumBreakdown', () => {
  it('suma todas las categorías correctamente', () => {
    const breakdown: PricingBreakdown = {
      flights:    { cost: 100, price: 150 },
      transfers:  { cost: 50,  price: 70  },
      trains:     { cost: 0,   price: 0   },
      ferries:    { cost: 0,   price: 0   },
      rentalCars: { cost: 0,   price: 0   },
      activities: { cost: 30,  price: 50  },
      cruise:     { cost: 0,   price: 0   },
      insurance:  { cost: 20,  price: 30  },
    };
    expect(sumBreakdown(breakdown)).toEqual({ cost: 200, price: 300 });
  });

  it('breakdown todo en cero devuelve cero', () => {
    const breakdown: PricingBreakdown = {
      flights: { cost: 0, price: 0 }, transfers: { cost: 0, price: 0 },
      trains: { cost: 0, price: 0 }, ferries: { cost: 0, price: 0 },
      rentalCars: { cost: 0, price: 0 }, activities: { cost: 0, price: 0 },
      cruise: { cost: 0, price: 0 }, insurance: { cost: 0, price: 0 },
    };
    expect(sumBreakdown(breakdown)).toEqual({ cost: 0, price: 0 });
  });
});

// ─────────────────────────────────────────────────────────────
// calculateMargin
// ─────────────────────────────────────────────────────────────
describe('calculateMargin', () => {
  it('calcula margen y porcentaje correctamente', () => {
    const result = calculateMargin(1000, 1200);
    expect(result.margin).toBe(200);
    expect(result.marginPercentage).toBeCloseTo(20, 5);
  });

  it('costo cero devuelve marginPercentage = 0 sin dividir por cero', () => {
    const result = calculateMargin(0, 500);
    expect(result.margin).toBe(500);
    expect(result.marginPercentage).toBe(0);
  });

  it('margen negativo (precio menor que costo)', () => {
    const result = calculateMargin(1000, 800);
    expect(result.margin).toBe(-200);
    expect(result.marginPercentage).toBeCloseTo(-20, 5);
  });

  it('precio igual al costo: margen 0%', () => {
    const result = calculateMargin(500, 500);
    expect(result.margin).toBe(0);
    expect(result.marginPercentage).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// calculatePerPerson
// ─────────────────────────────────────────────────────────────
describe('calculatePerPerson', () => {
  it('divide correctamente entre viajeros', () => {
    expect(calculatePerPerson(1200, 4)).toBe(300);
  });

  it('0 viajeros devuelve 0 sin dividir por cero', () => {
    expect(calculatePerPerson(1200, 0)).toBe(0);
  });

  it('1 viajero devuelve el total completo', () => {
    expect(calculatePerPerson(750, 1)).toBe(750);
  });
});

// ─────────────────────────────────────────────────────────────
// getGuestsPerRoomType
// ─────────────────────────────────────────────────────────────
describe('getGuestsPerRoomType', () => {
  it('single = 1', () => expect(getGuestsPerRoomType('single')).toBe(1));
  it('double = 2', () => expect(getGuestsPerRoomType('double')).toBe(2));
  it('triple = 3', () => expect(getGuestsPerRoomType('triple')).toBe(3));
  it('quadruple = 4', () => expect(getGuestsPerRoomType('quadruple')).toBe(4));
  it('custom = 1', () => expect(getGuestsPerRoomType('custom')).toBe(1));
});

// ─────────────────────────────────────────────────────────────
// getOccupancyLabel
// ─────────────────────────────────────────────────────────────
describe('getOccupancyLabel', () => {
  it('devuelve etiqueta larga para double', () => {
    const occ = { roomType: 'double' } as RoomOccupancy;
    expect(getOccupancyLabel(occ)).toBe('Habitación Doble');
  });

  it('custom con nombre devuelve el nombre personalizado', () => {
    const occ = { roomType: 'custom', customTypeName: 'Suite Premium' } as RoomOccupancy;
    expect(getOccupancyLabel(occ)).toBe('Suite Premium');
  });

  it('custom sin nombre devuelve fallback', () => {
    const occ = { roomType: 'custom' } as RoomOccupancy;
    expect(getOccupancyLabel(occ)).toBe('Habitación');
  });
});

// ─────────────────────────────────────────────────────────────
// getOccupancyLabelShort
// ─────────────────────────────────────────────────────────────
describe('getOccupancyLabelShort', () => {
  it('devuelve etiqueta corta para triple', () => {
    expect(getOccupancyLabelShort('triple')).toBe('Triple');
  });

  it('custom con nombre devuelve el nombre', () => {
    expect(getOccupancyLabelShort('custom', 'Camarote')).toBe('Camarote');
  });
});

// ─────────────────────────────────────────────────────────────
// calculateOccupancyLodgingTotals
// ─────────────────────────────────────────────────────────────
describe('calculateOccupancyLodgingTotals', () => {
  it('modo total: devuelve valores directos', () => {
    const occ = {
      pricingMode: 'total',
      totalPrice: 800,
      totalCost: 600,
      roomCount: 1,
    } as RoomOccupancy;
    expect(calculateOccupancyLodgingTotals(occ, 5)).toEqual({ price: 800, cost: 600 });
  });

  it('modo perNight: precio × noches × habitaciones', () => {
    const occ = {
      pricingMode: 'perNight',
      pricePerNight: 200,
      costPerNight: 150,
      roomCount: 2,
    } as RoomOccupancy;
    expect(calculateOccupancyLodgingTotals(occ, 3)).toEqual({ price: 1200, cost: 900 });
  });

  it('modo perNight con 0 noches devuelve 0', () => {
    const occ = {
      pricingMode: 'perNight',
      pricePerNight: 200,
      costPerNight: 150,
      roomCount: 1,
    } as RoomOccupancy;
    expect(calculateOccupancyLodgingTotals(occ, 0)).toEqual({ price: 0, cost: 0 });
  });
});

// ─────────────────────────────────────────────────────────────
// buildBreakdownFromQuote
// ─────────────────────────────────────────────────────────────
describe('buildBreakdownFromQuote', () => {
  const baseQuote = {
    flights: [],
    transfers: [],
    trains: [],
    ferries: [],
    rentalCars: [],
    activities: [],
    cruise: null,
    insurance: null,
    trip: { travelers: 2 },
  } as unknown as Quote;

  it('quote vacío devuelve breakdown todo en cero', () => {
    const result = buildBreakdownFromQuote(baseQuote);
    expect(result.flights).toEqual({ cost: 0, price: 0 });
    expect(result.insurance).toEqual({ cost: 0, price: 0 });
  });

  it('suma vuelos principales, excluye opciones (isOption=true)', () => {
    const quote = {
      ...baseQuote,
      flights: [
        { id: '1', cost: 300, price: 400, isOption: false },
        { id: '2', cost: 200, price: 280, isOption: true }, // debe ignorarse
      ],
    } as unknown as Quote;
    const result = buildBreakdownFromQuote(quote);
    expect(result.flights).toEqual({ cost: 300, price: 400 });
  });

  it('suma solo transfers incluidos', () => {
    const quote = {
      ...baseQuote,
      transfers: [
        { id: '1', cost: 50, price: 80, included: true },
        { id: '2', cost: 40, price: 60, included: false }, // excluido
      ],
    } as unknown as Quote;
    const result = buildBreakdownFromQuote(quote);
    expect(result.transfers).toEqual({ cost: 50, price: 80 });
  });

  it('suma actividades incluidas, excluye las no incluidas', () => {
    const quote = {
      ...baseQuote,
      activities: [
        { id: '1', cost: 100, price: 150, included: true },
        { id: '2', cost: 80,  price: 120, included: false },
      ],
    } as unknown as Quote;
    const result = buildBreakdownFromQuote(quote);
    expect(result.activities).toEqual({ cost: 100, price: 150 });
  });

  it('suma crucero correctamente', () => {
    const quote = {
      ...baseQuote,
      cruise: { cost: 2000, price: 2500 },
    } as unknown as Quote;
    const result = buildBreakdownFromQuote(quote);
    expect(result.cruise).toEqual({ cost: 2000, price: 2500 });
  });

  it('suma seguro correctamente', () => {
    const quote = {
      ...baseQuote,
      insurance: { cost: 150, price: 200 },
    } as unknown as Quote;
    const result = buildBreakdownFromQuote(quote);
    expect(result.insurance).toEqual({ cost: 150, price: 200 });
  });

  it('caso real: presupuesto completo con vuelo + hotel + seguro', () => {
    const quote = {
      ...baseQuote,
      flights:    [{ id: '1', cost: 1000, price: 1300, isOption: false }],
      transfers:  [{ id: '1', cost: 100,  price: 150,  included: true  }],
      insurance:  { cost: 200, price: 280 },
      cruise:     null,
    } as unknown as Quote;
    const result = buildBreakdownFromQuote(quote);
    const total = sumBreakdown(result);
    expect(total).toEqual({ cost: 1300, price: 1730 });
  });
});
