import { CruisePort } from '@/types/quote';

export interface ParsedCruiseItinerary {
  cruiseName?: string;
  ports: CruisePort[];
}

const DAY_REGEX = /(Lun|Mar|Mi[eé]|Jue|Vie|S[aá]b|Dom)(\d{2}\/\d{2}\/\d{4})/gi;
const TIME_OR_DASH = /(\d{2}:\d{2}|-)/g;

/**
 * Parses cruise itinerary text in the format:
 * Sab23/01/2027Buenos Aires, Argentina-18:00Dom24/01/2027Navegación--
 */
export function parseCruiseItinerary(input: string): ParsedCruiseItinerary {
  const text = input.trim();
  let cruiseName: string | undefined;

  // Detect "Crucero N : NOMBRE"
  const nameMatch = text.match(/Crucero\s*\d*\s*:\s*([^\n\r]+)/i);
  if (nameMatch) cruiseName = nameMatch[1].trim();

  // Find all day anchors with their positions
  const anchors: { index: number; date: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DAY_REGEX.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    anchors.push({ index: m.index, date: m[2] });
  }

  if (anchors.length === 0) return { cruiseName, ports: [] };

  const ports: CruisePort[] = [];

  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].index;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : text.length;
    const block = text.substring(start, end);

    // Remove the day+date prefix
    const rest = block.replace(DAY_REGEX, '').trim();

    // Find times (HH:MM or -) — extract last 2 occurrences as arrival/departure
    const timeMatches = [...rest.matchAll(TIME_OR_DASH)];
    let arrivalTime = '';
    let departureTime = '';
    let portText = rest;

    if (timeMatches.length >= 2) {
      const lastTwo = timeMatches.slice(-2);
      const arr = lastTwo[0][0];
      const dep = lastTwo[1][0];
      arrivalTime = arr === '-' ? '' : arr;
      departureTime = dep === '-' ? '' : dep;
      // Port text is everything before the first of the last two times
      portText = rest.substring(0, lastTwo[0].index!).trim();
    } else if (timeMatches.length === 1) {
      const t = timeMatches[0][0];
      arrivalTime = t === '-' ? '' : t;
      portText = rest.substring(0, timeMatches[0].index!).trim();
    }

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

    // Store date in notes for reference (dd/mm/yyyy)
    const dateNote = anchors[i].date;

    ports.push({
      id: crypto.randomUUID(),
      day: i + 1,
      port,
      country,
      arrivalTime,
      departureTime,
      notes: dateNote,
    });
  }

  return { cruiseName, ports };
}
