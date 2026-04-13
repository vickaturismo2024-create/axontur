import { Quote } from '@/types/quote';

/** Get the currency of a quote, defaulting to USD */
export function getQuoteCurrency(quote: Quote): string {
  return quote.trip?.currency || 'USD';
}

/** Count how many services have a cost > 0 vs total services */
function countServiceCosts(quote: Quote): { withCost: number; total: number } {
  let withCost = 0;
  let total = 0;

  const checkItems = (items: any[] | null | undefined) => {
    if (!Array.isArray(items)) return;
    items.forEach((item: any) => {
      total++;
      if ((Number(item?.cost) || 0) > 0 || (Number(item?.totalCost) || 0) > 0) {
        withCost++;
      }
    });
  };

  checkItems(quote.flights);
  checkItems(quote.transfers);
  checkItems((quote as any).trains);
  checkItems((quote as any).ferries);
  checkItems((quote as any).rentalCars);
  checkItems((quote as any).activities);
  checkItems((quote as any).lodgings);

  // Single lodging
  const lodging = quote.lodging as any;
  if (lodging?.hotel || lodging?.name) {
    total++;
    if ((Number(lodging?.cost) || 0) > 0 || (Number(lodging?.totalCost) || 0) > 0) {
      withCost++;
    }
  }

  // Cruise
  const cruise = (quote as any).cruise;
  if (cruise?.shipName || cruise?.supplier) {
    total++;
    if ((Number(cruise?.cost) || 0) > 0 || (Number(cruise?.totalCost) || 0) > 0) {
      withCost++;
    }
  }

  // Insurance
  const insurance = quote.insurance as any;
  if (insurance?.provider || insurance?.supplier) {
    total++;
    if ((Number(insurance?.cost) || 0) > 0 || (Number(insurance?.totalCost) || 0) > 0) {
      withCost++;
    }
  }

  return { withCost, total };
}

/**
 * Check if a quote has complete enough cost data to be included
 * in profitability/margin metrics. Excludes quotes with:
 * - No totalCost or totalPrice
 * - Margin > 95% (likely missing net costs)
 * - Less than 50% of services with assigned costs
 */
export function hasCompleteCosts(quote: Quote): boolean {
  const totalCost = quote.pricing?.totalCost || 0;
  const totalPrice = quote.pricing?.totalPrice || 0;

  if (totalCost <= 0 || totalPrice <= 0) return false;

  // Margin > 95% suggests missing cost data
  const margin = ((totalPrice - totalCost) / totalPrice) * 100;
  if (margin > 95) return false;

  // At least 50% of services must have costs
  const { withCost, total } = countServiceCosts(quote);
  if (total > 0 && withCost / total < 0.5) return false;

  return true;
}

/** Get unique currencies present in quotes array */
export function getAvailableCurrencies(quotes: Quote[]): string[] {
  const currencies = new Set<string>();
  quotes.forEach(q => currencies.add(getQuoteCurrency(q)));
  return Array.from(currencies).sort();
}

/** Get the most common currency */
export function getDefaultCurrency(quotes: Quote[]): string {
  const counts: Record<string, number> = {};
  quotes.forEach(q => {
    const c = getQuoteCurrency(q);
    counts[c] = (counts[c] || 0) + 1;
  });
  let max = 0;
  let result = 'USD';
  Object.entries(counts).forEach(([currency, count]) => {
    if (count > max) { max = count; result = currency; }
  });
  return result;
}
