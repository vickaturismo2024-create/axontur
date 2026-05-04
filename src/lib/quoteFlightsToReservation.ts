import { supabase } from '@/integrations/supabase/client';
import { Quote } from '@/types/quote';

/**
 * Extract IATA code from a location string like "Buenos Aires (AEP)" → "AEP".
 * Falls back to the first 3 alphabetic chars uppercased.
 */
export function parseIataFromLocation(loc: string | undefined | null): string {
  if (!loc) return '';
  const m = loc.match(/\(([A-Za-z]{3})\)/);
  if (m) return m[1].toUpperCase();
  const letters = loc.replace(/[^A-Za-z]/g, '');
  return letters.slice(0, 3).toUpperCase();
}

/**
 * Combine YYYY-MM-DD + HH:mm (with optional "+1" / "+2" day-shift suffix)
 * into an ISO string treated as local time. Returns null if invalid.
 */
export function combineLocalDateTime(date?: string, time?: string): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  let hh = '00', mm = '00';
  let dayShift = 0;
  if (time) {
    const shiftMatch = time.match(/\+(\d+)\s*$/);
    if (shiftMatch) dayShift = parseInt(shiftMatch[1], 10) || 0;
    const cleanTime = time.replace(/\+\d+\s*$/, '').trim();
    const tm = cleanTime.match(/^(\d{1,2}):(\d{2})/);
    if (tm) {
      hh = tm[1].padStart(2, '0');
      mm = tm[2];
    }
  }
  const [y, mo, d] = date.split('-').map(Number);
  const dt = new Date(y, mo - 1, d + dayShift, parseInt(hh, 10), parseInt(mm, 10), 0);
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

interface SyncResult {
  created: boolean;
  reservationId?: string;
  segmentsCreated: number;
  reason?: string;
}

/**
 * Idempotently create a reservation + flight_segments + reservation_passengers
 * from a quote's flights, linked to the given file. Skips if a reservation
 * already exists for this file with source_type='quote'.
 */
export async function syncQuoteFlightsToReservation(
  quote: Quote,
  fileId: string,
  userId: string
): Promise<SyncResult> {
  // Idempotency: skip if there's already a quote-derived reservation for this file
  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .eq('file_id', fileId)
    .eq('source_type', 'quote')
    .maybeSingle();
  if (existing) {
    return { created: false, segmentsCreated: 0, reservationId: (existing as any).id, reason: 'already_exists' };
  }

  const allFlights = (quote.flights || []) as any[];
  const validFlights = allFlights
    .filter(f => !f.isOption)
    .filter(f => f.date && f.departureTime)
    .filter(f => f.airline || f.flightNumber)
    .sort((a, b) => {
      const da = combineLocalDateTime(a.date, a.departureTime) || '';
      const db = combineLocalDateTime(b.date, b.departureTime) || '';
      return da.localeCompare(db);
    });

  if (validFlights.length === 0) {
    return { created: false, segmentsCreated: 0, reason: 'no_valid_flights' };
  }

  // Create the reservation
  const { data: reservation, error: resError } = await supabase
    .from('reservations')
    .insert({
      user_id: userId,
      file_id: fileId,
      source_type: 'quote',
      gds: null,
      locator: null,
      raw_text_latest: null,
      notes: `Generado automáticamente desde el presupuesto del cliente ${quote.client?.name || ''}`.trim(),
    } as any)
    .select('id')
    .single();

  if (resError || !reservation) {
    console.error('[syncQuoteFlightsToReservation] reservation insert failed', resError);
    return { created: false, segmentsCreated: 0, reason: 'reservation_insert_failed' };
  }

  const reservationId = (reservation as any).id;

  // Insert segments
  const segmentsPayload = validFlights.map((f, idx) => {
    const airlineRaw = (f.airline || '').toString().trim();
    const airlineCode = airlineRaw.length <= 3
      ? airlineRaw.toUpperCase()
      : airlineRaw.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase() || 'XX';
    return {
      reservation_id: reservationId,
      seq: idx + 1,
      airline_code: airlineCode,
      flight_number: (f.flightNumber || '').toString(),
      origin_iata: parseIataFromLocation(f.origin),
      destination_iata: parseIataFromLocation(f.destination),
      dep_datetime_local: combineLocalDateTime(f.date, f.departureTime),
      arr_datetime_local: combineLocalDateTime(f.date, f.arrivalTime),
      booking_class: null,
      segment_status: 'HK',
      airline_locator: null,
      raw_text: null,
      is_incomplete: false,
      has_changes: false,
    };
  });

  const { error: segError } = await supabase.from('flight_segments').insert(segmentsPayload as any);
  if (segError) {
    console.error('[syncQuoteFlightsToReservation] segments insert failed', segError);
  }

  // Insert at least one passenger from the client name
  const clientName = (quote.client?.name || '').trim();
  if (clientName) {
    const parts = clientName.split(/\s+/);
    const lastName = parts.length > 1 ? parts[parts.length - 1] : clientName;
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
    await supabase.from('reservation_passengers').insert({
      reservation_id: reservationId,
      last_name: lastName,
      first_name: firstName || null,
      title: null,
    } as any);
  }

  return {
    created: true,
    reservationId,
    segmentsCreated: segmentsPayload.length,
  };
}
