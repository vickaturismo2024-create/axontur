import { useMemo } from 'react';
import { Quote, Pricing, LodgingOptionPricing, PricingBreakdown, Lodging } from '@/types/quote';

export interface PricingCalculation {
  fixedServices: {
    cost: number;
    price: number;
  };
  breakdown: PricingBreakdown;
  lodgingOptionsPricing: LodgingOptionPricing[];
  // When there's only one lodging (no options)
  singleLodgingPricing: {
    totalCost: number;
    totalPrice: number;
    pricePerPerson: number;
    margin: number;
    marginPercentage: number;
  } | null;
}

export function usePricingCalculator(quote: Quote): PricingCalculation {
  const calculation = useMemo(() => {
    // Calculate breakdown by category
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

    // Sum only main flights (exclude options - they are alternatives)
    const mainFlights = quote.flights.filter(f => !f.isOption);
    mainFlights.forEach(f => {
      breakdown.flights.cost += f.cost || 0;
      breakdown.flights.price += f.price || 0;
    });

    // Sum transfers (only included ones count toward total)
    quote.transfers.filter(t => t.included).forEach(t => {
      breakdown.transfers.cost += t.cost || 0;
      breakdown.transfers.price += t.price || 0;
    });

    // Sum trains (only included ones)
    (quote.trains || []).filter(t => t.included !== false).forEach(t => {
      breakdown.trains.cost += t.cost || 0;
      breakdown.trains.price += t.price || 0;
    });

    // Sum ferries (only included ones)
    (quote.ferries || []).filter(f => f.included !== false).forEach(f => {
      breakdown.ferries.cost += f.cost || 0;
      breakdown.ferries.price += f.price || 0;
    });

    // Sum rental cars (only included ones)
    (quote.rentalCars || []).filter(r => r.included !== false).forEach(r => {
      breakdown.rentalCars.cost += r.cost || 0;
      breakdown.rentalCars.price += r.price || 0;
    });

    // Sum activities
    // Sum activities (only included ones count toward total)
    (quote.activities || []).filter(a => a.included).forEach(a => {
      breakdown.activities.cost += a.cost || 0;
      breakdown.activities.price += a.price || 0;
    });

    // Sum cruise
    if (quote.cruise) {
      breakdown.cruise.cost = quote.cruise.cost || 0;
      breakdown.cruise.price = quote.cruise.price || 0;
    }

    // Sum insurance
    if (quote.insurance) {
      breakdown.insurance.cost = quote.insurance.cost || 0;
      breakdown.insurance.price = quote.insurance.price || 0;
    }

    // Fixed services total (everything except lodging)
    const fixedServices = {
      cost: breakdown.flights.cost + breakdown.transfers.cost + breakdown.trains.cost + 
            breakdown.ferries.cost + breakdown.rentalCars.cost + breakdown.activities.cost +
            breakdown.cruise.cost + breakdown.insurance.cost,
      price: breakdown.flights.price + breakdown.transfers.price + breakdown.trains.price + 
             breakdown.ferries.price + breakdown.rentalCars.price + breakdown.activities.price +
             breakdown.cruise.price + breakdown.insurance.price,
    };

    // Helper to calculate lodging totals based on pricing mode
    const calculateLodgingTotals = (lodging: Lodging) => {
      if (lodging.pricingMode === 'total') {
        return {
          cost: lodging.totalCost || 0,
          price: lodging.totalPrice || 0,
        };
      } else {
        return {
          cost: (lodging.costPerNight || 0) * (lodging.nights || 0),
          price: (lodging.pricePerNight || 0) * (lodging.nights || 0),
        };
      }
    };

    // Get all lodgings
    const allLodgings = (quote.lodgings && quote.lodgings.length > 0)
      ? quote.lodgings
      : (quote.lodging?.name ? [quote.lodging] : []);

    const mainLodgings = allLodgings.filter(l => !l.isOption);
    const optionLodgings = allLodgings.filter(l => l.isOption);

    // Calculate main lodging total cost/price
    const mainLodgingCost = mainLodgings.reduce((sum, l) => 
      sum + calculateLodgingTotals(l).cost, 0);
    const mainLodgingPrice = mainLodgings.reduce((sum, l) => 
      sum + calculateLodgingTotals(l).price, 0);

    const travelers = quote.trip.travelers || 1;

    // If there are lodging options, calculate pricing for each
    let lodgingOptionsPricing: LodgingOptionPricing[] = [];
    
    if (optionLodgings.length > 0) {
      lodgingOptionsPricing = optionLodgings.map((lodging, index) => {
        const { cost: lodgingCost, price: lodgingPrice } = calculateLodgingTotals(lodging);
        
        // Total = fixed services + main lodging + this option
        const totalCost = fixedServices.cost + mainLodgingCost + lodgingCost;
        const totalPrice = fixedServices.price + mainLodgingPrice + lodgingPrice;
        const pricePerPerson = travelers > 0 ? totalPrice / travelers : 0;
        const margin = totalPrice - totalCost;
        const marginPercentage = totalCost > 0 ? (margin / totalCost) * 100 : 0;

        return {
          lodgingId: lodging.id || `option-${index}`,
          lodgingLabel: lodging.optionLabel || `Opción ${index + 1}`,
          lodgingCost,
          lodgingPrice,
          totalPrice,
          totalCost,
          pricePerPerson,
          margin,
          marginPercentage,
        };
      });
    }

    // Single lodging pricing (when no options)
    let singleLodgingPricing = null;
    if (optionLodgings.length === 0) {
      const totalCost = fixedServices.cost + mainLodgingCost;
      const totalPrice = fixedServices.price + mainLodgingPrice;
      const pricePerPerson = travelers > 0 ? totalPrice / travelers : 0;
      const margin = totalPrice - totalCost;
      const marginPercentage = totalCost > 0 ? (margin / totalCost) * 100 : 0;

      singleLodgingPricing = {
        totalCost,
        totalPrice,
        pricePerPerson,
        margin,
        marginPercentage,
      };
    }

    return {
      fixedServices,
      breakdown,
      lodgingOptionsPricing,
      singleLodgingPricing,
    };
  }, [quote]);

  return calculation;
}

// Helper to apply calculated pricing to quote
export function applyCalculatedPricing(
  currentPricing: Pricing,
  calculation: PricingCalculation,
  travelers: number
): Partial<Pricing> {
  const hasOptions = calculation.lodgingOptionsPricing.length > 0;

  if (hasOptions) {
    // Use the first option as the default display price
    const firstOption = calculation.lodgingOptionsPricing[0];
    return {
      calculationMode: 'automatic',
      fixedServicesTotal: calculation.fixedServices.price,
      fixedServicesCost: calculation.fixedServices.cost,
      breakdown: calculation.breakdown,
      lodgingOptions: calculation.lodgingOptionsPricing,
      totalPrice: firstOption?.totalPrice || 0,
      pricePerPerson: firstOption?.pricePerPerson || 0,
      totalCost: firstOption?.totalCost || 0,
      margin: firstOption?.margin || 0,
      marginPercentage: firstOption?.marginPercentage || 0,
    };
  } else if (calculation.singleLodgingPricing) {
    return {
      calculationMode: 'automatic',
      fixedServicesTotal: calculation.fixedServices.price,
      fixedServicesCost: calculation.fixedServices.cost,
      breakdown: calculation.breakdown,
      lodgingOptions: [],
      totalPrice: calculation.singleLodgingPricing.totalPrice,
      pricePerPerson: calculation.singleLodgingPricing.pricePerPerson,
      totalCost: calculation.singleLodgingPricing.totalCost,
      margin: calculation.singleLodgingPricing.margin,
      marginPercentage: calculation.singleLodgingPricing.marginPercentage,
    };
  }

  return {};
}
