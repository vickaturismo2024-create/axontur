// Diff de reservas para detectar cambios al re-importar un PNR
import { ParsedSegment, getStatusMeaning, toLocalISOString } from './pnrParser';
import type { FlightSegment } from '@/types/reservation';

export type DiffChangeType =
  | 'schedule_change'
  | 'cancellation'
  | 'new_segment'
  | 'removed_segment'
  | 'route_change'
  | 'flight_change'
  | 'status_change';

export interface DiffChange {
  changeType: DiffChangeType;
  fieldName: string;
  beforeValue: string | null;
  afterValue: string | null;
  flightSegmentId?: string; // existing segment id
  matchKey?: string; // for new segments
}

/**
 * Genera una clave de match flexible: airline+flightNumber+origin+destination
 */
function segKey(airline: string, flightNumber: string, origin: string, destination: string): string {
  return `${(airline || '').toUpperCase()}${flightNumber || ''}-${(origin || '').toUpperCase()}-${(destination || '').toUpperCase()}`;
}

function existingKey(s: FlightSegment): string {
  return segKey(s.airline_code, s.flight_number, s.origin_iata, s.destination_iata);
}

function parsedKey(s: ParsedSegment): string {
  return segKey(s.airlineCode, s.flightNumber, s.originIata, s.destinationIata);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function parsedDateISO(d: Date | undefined): string | null {
  if (!d) return null;
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  return toLocalISOString(d);
}

/**
 * Compara segmentos existentes contra los recién parseados.
 * Retorna lista de cambios detectados.
 */
export function diffReservation(
  existingSegments: FlightSegment[],
  newSegments: ParsedSegment[]
): DiffChange[] {
  const changes: DiffChange[] = [];

  const existingByKey = new Map<string, FlightSegment>();
  existingSegments.forEach(s => existingByKey.set(existingKey(s), s));

  const matchedExistingIds = new Set<string>();

  // 1) Para cada segmento nuevo, intentar match
  newSegments.forEach((newSeg, idx) => {
    const key = parsedKey(newSeg);
    const existing = existingByKey.get(key);

    if (!existing) {
      // También intentar match por seq (mismo orden) si misma ruta cambió
      const bySeq = existingSegments[idx];
      if (bySeq && !matchedExistingIds.has(bySeq.id)) {
        const oldRoute = `${bySeq.origin_iata}→${bySeq.destination_iata}`;
        const newRoute = `${newSeg.originIata}→${newSeg.destinationIata}`;
        const oldFlight = `${bySeq.airline_code}${bySeq.flight_number}`;
        const newFlight = `${newSeg.airlineCode}${newSeg.flightNumber}`;

        if (oldRoute !== newRoute) {
          changes.push({
            changeType: 'route_change',
            fieldName: 'route',
            beforeValue: oldRoute,
            afterValue: newRoute,
            flightSegmentId: bySeq.id,
          });
        }
        if (oldFlight !== newFlight) {
          changes.push({
            changeType: 'flight_change',
            fieldName: 'flight',
            beforeValue: oldFlight,
            afterValue: newFlight,
            flightSegmentId: bySeq.id,
          });
        }
        matchedExistingIds.add(bySeq.id);
        return;
      }

      // Segmento totalmente nuevo
      changes.push({
        changeType: 'new_segment',
        fieldName: 'segment',
        beforeValue: null,
        afterValue: `${newSeg.airlineCode}${newSeg.flightNumber} ${newSeg.originIata}→${newSeg.destinationIata}`,
        matchKey: key,
      });
      return;
    }

    matchedExistingIds.add(existing.id);

    // 2) Comparar horarios
    const newDepISO = parsedDateISO(newSeg.depDatetime);
    const newArrISO = parsedDateISO(newSeg.arrDatetime);

    if (newDepISO && existing.dep_datetime_local && newDepISO !== existing.dep_datetime_local) {
      changes.push({
        changeType: 'schedule_change',
        fieldName: 'departure',
        beforeValue: fmtDate(existing.dep_datetime_local),
        afterValue: fmtDate(newDepISO),
        flightSegmentId: existing.id,
      });
    }

    if (newArrISO && existing.arr_datetime_local && newArrISO !== existing.arr_datetime_local) {
      changes.push({
        changeType: 'schedule_change',
        fieldName: 'arrival',
        beforeValue: fmtDate(existing.arr_datetime_local),
        afterValue: fmtDate(newArrISO),
        flightSegmentId: existing.id,
      });
    }

    // 3) Comparar status
    const newStatus = newSeg.segmentStatus || null;
    const oldStatus = existing.segment_status || null;
    if (newStatus && newStatus !== oldStatus) {
      const newInfo = getStatusMeaning(newStatus);
      const changeType: DiffChangeType = newInfo.isCancelled ? 'cancellation' : 'status_change';
      changes.push({
        changeType,
        fieldName: 'status',
        beforeValue: oldStatus || '—',
        afterValue: newStatus,
        flightSegmentId: existing.id,
      });
    }
  });

  // 4) Segmentos eliminados (existían pero no aparecen en el nuevo)
  existingSegments.forEach(s => {
    if (!matchedExistingIds.has(s.id)) {
      changes.push({
        changeType: 'removed_segment',
        fieldName: 'segment',
        beforeValue: `${s.airline_code}${s.flight_number} ${s.origin_iata}→${s.destination_iata}`,
        afterValue: null,
        flightSegmentId: s.id,
      });
    }
  });

  return changes;
}
