import { supabase } from '@/integrations/supabase/client';
import { Quote } from '@/types/quote';
import { syncQuoteFlightsToReservation } from './quoteFlightsToReservation';

export async function createFileFromQuote(quote: Quote, userId: string): Promise<{ fileId: string; fileNumber: number } | null> {
  // Check if file already exists for this quote
  const { data: existing } = await supabase.from('files').select('id,file_number').eq('quote_id', quote.id).maybeSingle();
  if (existing) {
    // Idempotent backfill: ensure flights from the quote are synced to reservations/calendar
    try {
      await syncQuoteFlightsToReservation(quote, (existing as any).id, userId);
    } catch (e) {
      console.error('[createFileFromQuote] sync flights (existing file) failed', e);
    }
    return { fileId: (existing as any).id, fileNumber: (existing as any).file_number };
  }

  // Fetch agency_id directly from the quotes table in DB to be accurate
  const { data: dbQuote } = await supabase
    .from('quotes')
    .select('agency_id')
    .eq('id', quote.id)
    .maybeSingle();
  const agencyId = dbQuote?.agency_id || null;

  // Resolve or create main client in the CRM (clients table) to link as client_id
  let resolvedClientId: string | null = null;
  const mainClientName = quote.client?.name?.trim() || '';
  
  if (mainClientName && mainClientName.toLowerCase() !== 'sin cliente') {
    // 1. Check if client already exists with this exact name in CRM
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('name', mainClientName)
      .maybeSingle();

    if (existingClient) {
      resolvedClientId = existingClient.id;
    } else {
      // 2. If client does not exist, insert them automatically
      const clientPayload = {
        name: mainClientName,
        email: quote.client?.email || null,
        phone: quote.client?.phone || null,
        user_id: userId,
        agency_id: agencyId,
      };
      
      const { data: newC, error: newCErr } = await supabase
        .from('clients')
        .insert(clientPayload as any)
        .select('id')
        .single();
        
      if (!newCErr && newC) {
        resolvedClientId = newC.id;
      }
    }
  }

  const defaultCurrency = (quote.trip as any)?.currency || 'USD';

  // Build services from quote data
  const services: any[] = [];
  const addService = (
    type: string,
    desc: string,
    cost: number,
    price: number,
    date?: string,
    supplier?: string,
    currency?: string,
    extraFields?: any
  ) => {
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
      agency_id: agencyId,
      ...extraFields
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
      f.supplier || f.airline,
      f.currency,
      {
        airline: f.airline || null,
        flight_number: f.flightNumber || null,
        origin: f.origin || null,
        destination: f.destination || null,
        departure_time: f.departureTime || null,
        arrival_time: f.arrivalTime || null,
        luggage: f.luggage || null,
        luggage_type: f.luggageType || null,
        notes: f.notes || null,
      }
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
      l.supplier || l.name,
      l.currency,
      {
        end_date: l.checkOut || null,
        room_type: l.roomType || null,
        regime: l.regime || null,
        hotel_category: l.category || null,
        notes: l.notes || null,
      }
    );
  });

  // Legacy single lodging fallback
  if ((!quote.lodgings || quote.lodgings.length === 0) && (quote as any).lodging?.name) {
    const l = (quote as any).lodging;
    const cost = l.pricingMode === 'total' ? (l.totalCost || 0) : (l.costPerNight || 0) * (l.nights || 1);
    const price = l.pricingMode === 'total' ? (l.totalPrice || 0) : (l.pricePerNight || 0) * (l.nights || 1);
    addService(
      'lodging',
      `${l.name} (${l.nights || 0} noches)`,
      cost,
      price,
      l.checkIn,
      l.supplier || l.name,
      l.currency,
      {
        end_date: l.checkOut || null,
        room_type: l.roomType || null,
        regime: l.regime || null,
        hotel_category: l.category || null,
        notes: l.notes || null,
      }
    );
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
      t.currency,
      {
        notes: (t as any).notes || null,
      }
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
      a.currency,
      {
        destination: a.location || null,
        departure_time: a.time || null,
        notes: a.notes || null,
      }
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
      (quote.insurance as any).currency,
      {
        company: quote.insurance.company || null,
        insurance_plan: quote.insurance.plan || null,
        coverage: quote.insurance.coverage || null,
        notes: quote.insurance.notes || null,
      }
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
      (quote.cruise as any).supplier || quote.cruise.company,
      (quote.cruise as any).currency,
      {
        ship_name: quote.cruise.shipName || null,
        company: quote.cruise.company || null,
        room_type: quote.cruise.cabinType || null,
        cabin_number: quote.cruise.cabinNumber || null,
        deck: quote.cruise.deck || null,
        embarkation_port: quote.cruise.embarkationPort || null,
        disembarkation_port: quote.cruise.disembarkationPort || null,
        end_date: (quote.cruise as any).disembarkationDate || null,
        regime: quote.cruise.regime || null,
        notes: quote.cruise.notes || null,
      }
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
      t.currency,
      {
        company: t.company || null,
        origin: t.origin || null,
        destination: t.destination || null,
        departure_time: t.departureTime || null,
        arrival_time: t.arrivalTime || null,
        cabin_class: t.class || null,
        notes: t.notes || null,
      }
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
      f.currency,
      {
        company: f.company || null,
        ship_name: f.vessel || null,
        origin: f.origin || null,
        destination: f.destination || null,
        departure_time: f.departureTime || null,
        arrival_time: f.arrivalTime || null,
        room_type: f.cabinType || null,
        notes: f.notes || null,
      }
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
      r.currency,
      {
        company: r.company || null,
        pickup_location: r.pickupLocation || null,
        dropoff_location: r.dropoffLocation || null,
        end_date: r.dropoffDate || null,
        departure_time: r.pickupTime || null,
        arrival_time: r.dropoffTime || null,
        notes: r.notes || null,
      }
    );
  });

  const { data: fileData, error } = await supabase.from('files').insert({
    user_id: userId,
    quote_id: quote.id,
    client_name: quote.client?.name || '',
    client_id: resolvedClientId,
    agency_id: agencyId,
    destination: quote.trip?.destination || '',
    start_date: quote.trip?.startDate || null,
    end_date: quote.trip?.endDate || null,
    travelers: quote.trip?.travelers || 1,
    currency: defaultCurrency,
    total_price: quote.pricing?.totalPrice || 0,
    total_cost: quote.pricing?.totalCost || 0,
    internal_notes: quote.internalNotes || null,
    status: 'confirmed',
  } as any).select('id,file_number').single();

  if (error || !fileData) return null;

  // Sync passenger group members (CRM) to file_passengers
  if (resolvedClientId) {
    try {
      // Find the groups this client belongs to
      const { data: memberOfGroups } = await supabase
        .from('client_group_members')
        .select('group_id')
        .eq('client_id', resolvedClientId);

      if (memberOfGroups && memberOfGroups.length > 0) {
        const groupIds = memberOfGroups.map((g) => g.group_id);

        // Find all other member client IDs of those groups
        const { data: groupMembers } = await supabase
          .from('client_group_members')
          .select('client_id')
          .in('group_id', groupIds)
          .neq('client_id', resolvedClientId);

        if (groupMembers && groupMembers.length > 0) {
          const otherClientIds = groupMembers
            .map((m) => m.client_id)
            .filter((id): id is string => !!id);

          if (otherClientIds.length > 0) {
            // Fetch client details for those other members
            const { data: otherClients } = await supabase
              .from('clients')
              .select('id, name, dni, passport, passport_expiry, birth_date, nationality, notes')
              .in('id', otherClientIds);

            if (otherClients && otherClients.length > 0) {
              const passengersToInsert = otherClients.map((c) => ({
                file_id: (fileData as any).id,
                user_id: userId,
                agency_id: agencyId,
                client_id: c.id,
                name: c.name,
                dni: c.dni || null,
                passport: c.passport || null,
                passport_expiry: c.passport_expiry || null,
                birth_date: c.birth_date || null,
                nationality: c.nationality || null,
                notes: c.notes || null,
              }));

              if (passengersToInsert.length > 0) {
                await supabase.from('file_passengers').insert(passengersToInsert as any);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[createFileFromQuote] failed to sync group passengers', err);
    }
  }

  if (services.length > 0) {
    const withFileId = services.map(s => ({ ...s, file_id: (fileData as any).id }));
    await supabase.from('file_services').insert(withFileId);
  }

  // Sync quote flights into reservations + flight_segments so they show up
  // in the calendar and upcoming flights widget / alerts.
  try {
    await syncQuoteFlightsToReservation(quote, (fileData as any).id, userId);
  } catch (e) {
    console.error('[createFileFromQuote] sync flights (new file) failed', e);
  }

  return { fileId: (fileData as any).id, fileNumber: (fileData as any).file_number };
}

