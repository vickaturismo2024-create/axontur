import { CruisePort } from '@/types/quote';

export interface ParsedCruiseItinerary {
  cruiseName?: string;
  ports: CruisePort[];
  normalizedSample?: string;
}

const DAY_REGEX = /(Lun|Mar|Mi[eé]|Jue|Vie|S[aá]b|Dom)\.?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/gi;
const TIME_OR_DASH = /(\d{1,2}[:h]\d{2}|[-–—])/g;

/**
 * Normalize whitespace: replace NBSP and other special whitespace with regular spaces.
 */
function normalize(input: string): string {
  return input
    .replace(/[\u00A0\u2007\u202F\u200B\uFEFF\t]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

/**
 * Parses cruise itinerary text in formats like:
 * Sab23/01/2027Buenos Aires, Argentina-18:00Dom24/01/2027Navegación--
 * Or with spaces/NBSP/tabs between fields.
 */
export function parseCruiseItinerary(input: string): ParsedCruiseItinerary {
  const text = normalize(input);
  let cruiseName: string | undefined;

  // Detect "Crucero N : NOMBRE"
  const nameMatch = text.match(/Crucero\s*\d*\s*:\s*([^\n\r]+)/i);
  if (nameMatch) cruiseName = nameMatch[1].trim();

  // Find all day anchors with their positions and full match length
  const anchors: { index: number; matchLength: number; date: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DAY_REGEX.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    anchors.push({ index: m.index, matchLength: m[0].length, date: m[2] });
  }

  // Build a sample with visible spaces for diagnostics
  const normalizedSample = text.slice(0, 240).replace(/ /g, '·');

  if (anchors.length === 0) return { cruiseName, ports: [], normalizedSample };

  const ports: CruisePort[] = [];

  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    // Take content AFTER the day+date match, up to the next anchor
    const start = a.index + a.matchLength;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : text.length;
    const rest = text.substring(start, end).trim();

    // Find times (HH:MM, HHhMM or dashes) — extract last 2 occurrences as arrival/departure
    const timeMatches = [...rest.matchAll(TIME_OR_DASH)];
    let arrivalTime = '';
    let departureTime = '';
    let portText = rest;

    const isDash = (s: string) => s === '-' || s === '–' || s === '—';
    const cleanTime = (s: string) => (isDash(s) ? '' : s.replace('h', ':'));

    if (timeMatches.length >= 2) {
      const lastTwo = timeMatches.slice(-2);
      arrivalTime = cleanTime(lastTwo[0][0]);
      departureTime = cleanTime(lastTwo[1][0]);
      portText = rest.substring(0, lastTwo[0].index!).trim();
    } else if (timeMatches.length === 1) {
      arrivalTime = cleanTime(timeMatches[0][0]);
      portText = rest.substring(0, timeMatches[0].index!).trim();
    }

    // Strip trailing dashes/commas/spaces from port text
    portText = portText.replace(/[\s,\-–—]+$/g, '').trim();

    // Split port and country by last comma
    let port = portText;
    let country = '';
    const lastComma = portText.lastIndexOf(',');
    if (lastComma !== -1) {
      port = portText.substring(0, lastComma).trim();
      country = portText.substring(lastComma + 1).trim();
    }

    // Special case: Navegación
    if (/^Navegaci[oó]n/i.test(port)) {
      port = 'Navegación';
      country = '';
    }

    if (!port) port = '(sin nombre)';

    ports.push({
      id: crypto.randomUUID(),
      day: i + 1,
      port,
      country,
      arrivalTime,
      departureTime,
      notes: a.date,
    });
  }

  return { cruiseName, ports, normalizedSample };
}
