import { supabase } from '@/integrations/supabase/client';
import { Quote } from '@/types/quote';

export async function createFileFromQuote(quote: Quote, userId: string): Promise<{ fileId: string; fileNumber: number } | null> {
  // Check if file already exists for this quote
  const { data: existing } = await supabase.from('files').select('id,file_number').eq('quote_id', quote.id).maybeSingle();
  if (existing) {
    return { fileId: (existing as any).id, fileNumber: (existing as any).file_number };
  }

  const defaultCurrency = (quote.trip as any)?.currency || 'USD';

  // Build services from quote data
  const services: any[] = [];
  const addService = (type: string, desc: string, cost: number, price: number, date?: string, supplier?: string, currency?: string) => {
    services.push({
      service_type: type,
      description: desc,
      cost: cost || 0,
      price: price || 0,
      currency: currency || defaultCurrency,
      service_date: date || null,
      supplier_name: supplier || '',
      status: 'pending',
      user_id: userId,
    });
  };

  // Flights
  (quote.flights || []).forEach((f: any) => {
    addService(
      'flight',
      `${f.airline || ''} ${f.flightNumber || ''} ${f.origin || ''}-${f.destination || ''}`.trim(),
      f.cost || 0,
      f.price || 0,
      f.date,
      f.supplier,
      f.currency
    );
  });

  // Lodgings (multiple)
  (quote.lodgings || []).forEach((l: any) => {
    let cost = 0;
    let price = 0;

    if (l.pricingMode === 'total') {
      cost = l.totalCost || 0;
      price = l.totalPrice || 0;
    } else {
      cost = (l.costPerNight || 0) * (l.nights || 1);
      price = (l.pricePerNight || 0) * (l.nights || 1);
    }

    addService(
      'lodging',
      `${l.name || 'Alojamiento'} (${l.nights || 0} noches)${l.roomType ? ` - ${l.roomType}` : ''}`,
      cost,
      price,
      l.checkIn,
      l.supplier,
      l.currency
    );
  });

  // Legacy single lodging fallback
  if ((!quote.lodgings || quote.lodgings.length === 0) && (quote as any).lodging?.name) {
    const l = (quote as any).lodging;
    const cost = l.pricingMode === 'total' ? (l.totalCost || 0) : (l.costPerNight || 0) * (l.nights || 1);
    const price = l.pricingMode === 'total' ? (l.totalPrice || 0) : (l.pricePerNight || 0) * (l.nights || 1);
    addService('lodging', `${l.name} (${l.nights || 0} noches)`, cost, price, l.checkIn, l.supplier, l.currency);
  }

  // Transfers
  (quote.transfers || []).forEach((t: any) => {
    addService(
      'transfer',
      t.description || t.type || 'Traslado',
      t.cost || 0,
      t.price || 0,
      t.dateTime || t.date,
      t.supplier,
      t.currency
    );
  });

  // Activities
  (quote.activities || []).forEach((a: any) => {
    addService(
      'activity',
      a.name || a.description || 'Actividad',
      a.cost || 0,
      a.price || 0,
      a.date,
      a.supplier,
      a.currency
    );
  });

  // Insurance
  if (quote.insurance?.company) {
    addService(
      'insurance',
      `${quote.insurance.company} - ${quote.insurance.plan || ''}`.trim(),
      (quote.insurance as any).cost || 0,
      (quote.insurance as any).price || 0,
      undefined,
      (quote.insurance as any).supplier || quote.insurance.company,
      (quote.insurance as any).currency
    );
  }

  // Cruise
  if (quote.cruise?.shipName) {
    addService(
      'cruise',
      `${quote.cruise.shipName} ${(quote.cruise as any).cabinType || ''}`.trim(),
      (quote.cruise as any).cost || 0,
      (quote.cruise as any).price || 0,
      (quote.cruise as any).embarkationDate,
      (quote.cruise as any).supplier,
      (quote.cruise as any).currency
    );
  }

  // Trains
  ((quote as any).trains || []).forEach((t: any) => {
    addService(
      'train',
      `${t.company || ''} ${t.trainNumber || ''} ${t.origin || ''}-${t.destination || ''}`.trim(),
      t.cost || 0,
      t.price || 0,
      t.date || t.departureDate,
      t.supplier || t.company,
      t.currency
    );
  });

  // Ferries
  ((quote as any).ferries || []).forEach((f: any) => {
    addService(
      'ferry',
      `${f.company || ''} ${f.vessel || ''} ${f.origin || ''}-${f.destination || ''}`.trim(),
      f.cost || 0,
      f.price || 0,
      f.date || f.departureDate,
      f.supplier || f.company,
      f.currency
    );
  });

  // Rental cars
  ((quote as any).rentalCars || (quote as any).rental_cars || []).forEach((r: any) => {
    addService(
      'rental_car',
      `${r.company || ''} ${r.carType || r.category || ''} ${r.pickupLocation || ''}-${r.dropoffLocation || ''}`.trim(),
      r.cost || 0,
      r.price || 0,
      r.pickupDate || r.date,
      r.supplier || r.company,
      r.currency
    );
  });

  const { data: fileData, error } = await supabase.from('files').insert({
    user_id: userId,
    quote_id: quote.id,
    client_name: quote.client?.name || '',
    destination: quote.trip?.destination || '',
    start_date: quote.trip?.startDate || null,
    end_date: quote.trip?.endDate || null,
    travelers: quote.trip?.travelers || 1,
    currency: defaultCurrency,
    total_price: quote.pricing?.totalPrice || 0,
    total_cost: quote.pricing?.totalCost || 0,
    status: 'confirmed',
  }).select('id,file_number').single();

  if (error || !fileData) return null;

  if (services.length > 0) {
    const withFileId = services.map(s => ({ ...s, file_id: (fileData as any).id }));
    await supabase.from('file_services').insert(withFileId);
  }

  return { fileId: (fileData as any).id, fileNumber: (fileData as any).file_number };
}
