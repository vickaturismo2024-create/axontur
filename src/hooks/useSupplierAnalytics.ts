import { useMemo } from 'react';
import { Quote } from '@/types/quote';
import { getQuoteCurrency } from '@/lib/quoteFilters';

export interface SupplierStat {
  name: string;
  services: number;
  pricedServices: number;
  totalCost: number;
  totalPrice: number;
  margin: number;
  marginPct: number;
}

function extractServices(quote: Quote): { supplier: string; cost: number; price: number }[] {
  const results: { supplier: string; cost: number; price: number }[] = [];

  const processItems = (items: any[] | null | undefined) => {
    if (!Array.isArray(items)) return;
    items.forEach((item: any) => {
      if (item?.supplier) {
        results.push({
          supplier: item.supplier,
          cost: Number(item.cost) || Number(item.totalCost) || 0,
          price: Number(item.price) || Number(item.totalPrice) || 0,
        });
      }
    });
  };

  processItems(quote.flights as any);
  processItems(quote.transfers as any);
  processItems((quote as any).trains);
  processItems((quote as any).ferries);
  processItems((quote as any).rentalCars);
  processItems((quote as any).activities);
  processItems((quote as any).lodgings);

  const lodging = quote.lodging as any;
  if (lodging?.supplier) {
    results.push({
      supplier: lodging.supplier,
      cost: Number(lodging.cost) || Number(lodging.totalCost) || 0,
      price: Number(lodging.price) || Number(lodging.totalPrice) || 0,
    });
  }

  const cruise = (quote as any).cruise;
  if (cruise?.supplier) {
    results.push({
      supplier: cruise.supplier,
      cost: Number(cruise.cost) || Number(cruise.totalCost) || 0,
      price: Number(cruise.price) || Number(cruise.totalPrice) || 0,
    });
  }

  const insurance = quote.insurance as any;
  if (insurance?.supplier) {
    results.push({
      supplier: insurance.supplier,
      cost: Number(insurance.cost) || Number(insurance.totalCost) || 0,
      price: Number(insurance.price) || Number(insurance.totalPrice) || 0,
    });
  }

  return results;
}

export function useSupplierAnalytics(quotes: Quote[], currency?: string) {
  return useMemo(() => {
    // Filter by currency if provided
    const filtered = currency ? quotes.filter(q => getQuoteCurrency(q) === currency) : quotes;

    const map = new Map<string, { services: number; pricedServices: number; totalCost: number; totalPrice: number }>();

    filtered.forEach(quote => {
      const services = extractServices(quote);
      services.forEach(({ supplier, cost, price }) => {
        const key = supplier.trim().toLowerCase();
        if (!key) return;
        const existing = map.get(key) || { services: 0, pricedServices: 0, totalCost: 0, totalPrice: 0 };
        existing.services += 1;
        // Only count towards financials if both cost and price are > 0
        if (cost > 0 && price > 0) {
          existing.pricedServices += 1;
          existing.totalCost += cost;
          existing.totalPrice += price;
        }
        map.set(key, existing);
      });
    });

    const nameMap = new Map<string, string>();
    filtered.forEach(quote => {
      extractServices(quote).forEach(({ supplier }) => {
        const key = supplier.trim().toLowerCase();
        if (key && !nameMap.has(key)) nameMap.set(key, supplier.trim());
      });
    });

    const stats: SupplierStat[] = [];
    map.forEach((val, key) => {
      const margin = val.totalPrice - val.totalCost;
      const marginPct = val.totalPrice > 0 ? (margin / val.totalPrice) * 100 : 0;
      stats.push({
        name: nameMap.get(key) || key,
        services: val.services,
        pricedServices: val.pricedServices,
        totalCost: val.totalCost,
        totalPrice: val.totalPrice,
        margin,
        marginPct,
      });
    });

    stats.sort((a, b) => b.services - a.services);
    return stats;
  }, [quotes, currency]);
}
