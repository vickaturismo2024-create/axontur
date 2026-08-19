import { useMemo } from 'react';
import { Quote } from '@/types/quote';
import { useOccupancyPricingCalculator, applyOccupancyPricing } from '@/hooks/useOccupancyPricingCalculator';
import { usePricingCalculator, applyCalculatedPricing } from '@/hooks/usePricingCalculator';

const EMPTY_QUOTE_FALLBACK: Quote = {
  id: '',
  createdAt: '',
  updatedAt: '',
  templateId: 'default',
  client: { name: '', phone: '', email: '' },
  trip: { destination: '', startDate: '', endDate: '', travelers: 1, currency: 'USD', type: 'standard' },
  cover: { title: '', subtitle: '', imageUrl: '' },
  flights: [],
  lodging: { name: '', category: '', address: '', checkIn: '', checkOut: '', regime: '', roomType: '', nights: 0, notes: '' },
  lodgings: [],
  transfers: [],
  trains: [],
  ferries: [],
  rentalCars: [],
  activities: [],
  insurance: { company: '', plan: '', coverage: '', notes: '' },
  pricing: { totalPrice: 0, pricePerPerson: 0, taxes: 0, paymentMethod: '', conditions: '', observations: '', calculationMode: 'automatic' },
  itineraryDays: [],
  status: 'draft',
};

/**
 * Custom Hook that processes a quote and applies the standard/occupancy-based
 * mathematical calculations reactively.
 * 
 * Ensures a single source of truth across the Wizard, Preview modal, Export page,
 * and Public client view.
 */
export function useCalculatedQuote(quote: Quote | null | undefined): Quote | null {
  const targetQuote = quote || EMPTY_QUOTE_FALLBACK;

  const occupancyCalculation = useOccupancyPricingCalculator(targetQuote);
  const standardCalculation = usePricingCalculator(targetQuote);

  return useMemo(() => {
    if (!quote) return null;

    // Respect explicit manual calculation mode
    if (quote.pricing?.calculationMode === 'manual') {
      return quote;
    }

    const allLodgings = (quote.lodgings && quote.lodgings.length > 0)
      ? quote.lodgings
      : (quote.lodging?.name ? [quote.lodging] : []);
    const hasOccupancies = allLodgings.some(l => l.useOccupancies && l.occupancies && l.occupancies.length > 0);

    if (quote.flights.length > 0 || hasOccupancies) {
      const pricingUpdates = applyOccupancyPricing(occupancyCalculation);
      return {
        ...quote,
        pricing: {
          ...quote.pricing,
          ...pricingUpdates,
        },
      };
    } else {
      const pricingUpdates = applyCalculatedPricing(
        quote.pricing,
        standardCalculation,
        quote.trip.travelers
      );
      return {
        ...quote,
        pricing: {
          ...quote.pricing,
          ...pricingUpdates,
        },
      };
    }
  }, [quote, occupancyCalculation, standardCalculation]);
}
