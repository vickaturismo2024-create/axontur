import { supabase } from '@/integrations/supabase/client';
import { Quote } from '@/types/quote';

export async function createFileFromQuote(quote: Quote, userId: string): Promise<{ fileId: string; fileNumber: number } | null> {
  // Check if file already exists for this quote
  const { data: existing } = await supabase.from('files').select('id,file_number').eq('quote_id', quote.id).maybeSingle();
  if (existing) {
    return { fileId: (existing as any).id, fileNumber: (existing as any).file_number };
  }

  // Build services from quote data
  const services: any[] = [];
  const addService = (type: string, desc: string, cost: number, price: number, date?: string, supplier?: string) => {
    services.push({ service_type: type, description: desc, cost, price, currency: (quote.trip as any).currency || 'USD', service_date: date || null, supplier_name: supplier || '', status: 'pending', user_id: userId });
  };

  (quote.flights || []).forEach(f => addService('flight', `${f.airline || ''} ${f.flightNumber || ''} ${f.origin}-${f.destination}`.trim(), f.cost || 0, f.price || 0, f.date, f.supplier));
  (quote.lodgings || []).forEach(l => addService('lodging', `${l.name} (${l.nights || 0} noches)`, (l.costPerNight || 0) * (l.nights || 1), (l.pricePerNight || 0) * (l.nights || 1), l.checkIn, l.supplier));
  (quote.transfers || []).forEach(t => addService('transfer', t.description || t.type || 'Traslado', t.cost || 0, t.price || 0, t.dateTime, t.supplier));
  (quote.activities || []).forEach(a => addService('activity', a.name || 'Actividad', a.cost || 0, a.price || 0, a.date, a.supplier));
  if (quote.insurance?.company) addService('insurance', `${quote.insurance.company} - ${quote.insurance.plan || ''}`, quote.insurance.cost || 0, quote.insurance.price || 0);
  if (quote.cruise?.shipName) addService('cruise', `${quote.cruise.shipName} ${quote.cruise.cabinType || ''}`, quote.cruise.cost || 0, quote.cruise.price || 0, quote.cruise.embarkationDate);

  const { data: fileData, error } = await supabase.from('files').insert({
    user_id: userId,
    quote_id: quote.id,
    client_name: quote.client?.name || '',
    destination: quote.trip?.destination || '',
    start_date: quote.trip?.startDate || null,
    end_date: quote.trip?.endDate || null,
    travelers: quote.trip?.travelers || 1,
    currency: (quote.trip as any)?.currency || 'USD',
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
