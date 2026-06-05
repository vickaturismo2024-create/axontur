// Parser para PNR/Itinerarios de vuelo
// Soporta formatos: Amadeus, Sabre, Travelport y genéricos
import { Flight } from '@/types/quote';

// Códigos de estado GDS
export const SEGMENT_STATUS = {
  CONFIRMED: 'HK',
  CANCELLED: 'UN',
  SCHEDULE_CHANGE: 'TK',
  WAITLIST: 'HL',
  PENDING: 'NN',
  UNABLE_TO_CONFIRM: 'UC',
  NOT_CONFIRMED: 'NO',
  CANCELLED_XX: 'XX',
  SOLD: 'SS',
  GHOST: 'GK',
} as const;

export const GDS_STATUS_LABELS: Record<string, string> = {
  'HK': 'Confirmado',
  'UN': 'Cancelado por aerolínea',
  'TK': 'Cambio de horario',
  'HL': 'Lista de espera',
  'NN': 'Pendiente de confirmación',
  'UC': 'Incapaz de confirmar',
  'NO': 'No confirmado',
  'XX': 'Cancelado',
  'SS': 'Vendido',
  'GK': 'Confirmado fantasma',
};

export interface StatusMeaning {
  isCancelled: boolean;
  hasChanges: boolean;
  isConfirmed: boolean;
  code: string;
  label: string;
}

export function getStatusMeaning(status: string | undefined | null): StatusMeaning {
  if (!status) {
    return { isCancelled: false, hasChanges: false, isConfirmed: false, code: '', label: 'Desconocido' };
  }
  
  // Remover números del código (HK2 -> HK, UN1 -> UN)
  const code = status.replace(/\d+$/, '').toUpperCase();
  
  return {
    isCancelled: code === 'UN' || code === 'XX',
    hasChanges: code === 'TK',
    isConfirmed: code === 'HK' || code === 'SS',
    code,
    label: GDS_STATUS_LABELS[code] || 'Desconocido',
  };
}

export interface ParsedPassenger {
  lastName: string;
  firstName: string;
  title?: string;
  document?: string;
}

export interface ParsedSegment {
  airlineCode: string;
  flightNumber: string;
  originIata: string;
  destinationIata: string;
  depDatetime?: Date;
  arrDatetime?: Date;
  bookingClass?: string;
  segmentStatus?: string;
  airlineLocator?: string;
  rawText: string;
  isIncomplete: boolean;
}

// Helper to convert Date to local ISO string without UTC conversion
export function toLocalISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export interface ParsedReservation {
  locator?: string;
  passengers: ParsedPassenger[];
  segments: ParsedSegment[];
  rawText: string;
}

// Meses en formato GDS
const MONTHS: Record<string, number> = {
  'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
  'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11,
  'ENE': 0, 'ABR': 3, 'AGO': 7, 'DIC': 11 // Spanish variants
};

// Aerolíneas comunes
const COMMON_AIRLINES = [
  'AA', 'AR', 'LA', 'UA', 'DL', 'AV', 'AM', 'IB', 'BA', 'AF', 
  'LH', 'KL', 'AZ', 'TP', 'JJ', 'G3', 'H2', 'WS', 'AC', 'CM',
  'JA', 'FO', 'UX', 'VY', 'QR', 'EK', 'TK', 'LX', '4M', '2Z',
  'SK', 'OS', 'SN', 'LO', 'OK', 'RO', 'SU', 'S7', 'U6', 'W6',
  'FR', 'U2', 'NK', 'F9', 'B6', 'AS', 'WN', 'HA', 'SY', 'G4',
  'JL', 'NH', 'OZ', 'KE', 'CI', 'BR', 'SQ', 'CX', 'MH', 'GA',
  'ET', 'SA', 'KQ', 'MS', 'ME', 'RJ', 'SV', 'WY', 'GF', 'KU',
  'AI', 'UL', 'PK', 'BI', 'FJ', 'NZ', 'QF', 'VA', 'JQ', 'LA',
  'XL', 'IG', 'DY', 'AY', 'BT', 'OA', 'A3', 'FB', 'JU', 'YM'
];

const KNOWN_IATA_AIRPORTS = new Set([
  'EZE', 'AEP', 'COR', 'MDQ', 'ROS', 'SLA', 'TUC', 'MEN', 'MDZ', 'BRC', 'USH', 'IGR', 'JUJ', 'NQN', 'CRD', 'REL', 'FTE', 'PSS', 'SFN', 'CNQ', 'RSA', 'EPA', 'VDM', 'CPC', 'BHI', 'RGA', 'RGL',
  'GRU', 'GIG', 'BSB', 'SSA', 'REC', 'NAT', 'FLN', 'CWB', 'POA', 'BEL', 'FOR', 'MAN', 'VCP', 'CGH', 'SDU', 'CNF',
  'SCL', 'LIM', 'BOG', 'UIO', 'CCS', 'MVD', 'ASU', 'LPB', 'VVI', 'GYE', 'CTG', 'MDE', 'CLO', 'CUZ', 'PMI',
  'MIA', 'JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'SFO', 'IAH', 'DEN', 'SEA', 'MCO', 'CUN', 'EWR', 'BOS', 'MSP', 'DTW', 'PHL', 'LAS', 'CLT', 'PHX', 'IAD', 'DCA', 'SAN', 'TPA', 'FLL', 'SJU', 'STI', 'PUJ', 'SDQ', 'HAV', 'NAS', 'MBJ', 'PTY', 'SJO', 'GUA', 'SAL', 'TGU', 'BZE',
  'MAD', 'BCN', 'FCO', 'CDG', 'LHR', 'FRA', 'AMS', 'MXP', 'LIS', 'ZRH', 'MUC', 'VIE', 'BRU', 'CPH', 'OSL', 'ARN', 'HEL', 'WAW', 'PRG', 'BUD', 'ATH', 'DUB', 'EDI', 'MAN', 'LGW', 'STN', 'ORY', 'FCO', 'NAP', 'VCE', 'FLR', 'LIN', 'BGY', 'OPO',
  'DOH', 'DXB', 'IST', 'TLV', 'AMM', 'CAI', 'JED', 'RUH', 'BAH', 'MCT', 'KWI', 'AUH', 'SHJ',
  'MEX', 'GDL', 'MTY', 'TIJ', 'SJD', 'PVR', 'MID',
  'NRT', 'HND', 'ICN', 'PEK', 'PVG', 'HKG', 'TPE', 'SIN', 'BKK', 'KUL', 'CGK', 'MNL', 'DEL', 'BOM', 'CMB', 'DAC',
  'JNB', 'CPT', 'ADD', 'NBO', 'LOS', 'ACC', 'DAR', 'CMN', 'ALG', 'TUN',
  'SYD', 'MEL', 'BNE', 'PER', 'AKL', 'WLG', 'CHC', 'PPT', 'NAN'
]);

export function parseLocator(text: string): string | undefined {
  // Patrón Amadeus header: RP/XXXX/XXXX ... B9E9KL
  const amadeusHeader = /^RP\/[A-Z0-9]+\/[A-Z0-9]+\s+.*?\s+([A-Z0-9]{6})\s*$/m;
  const amadeusMatch = text.match(amadeusHeader);
  if (amadeusMatch) {
    return amadeusMatch[1].toUpperCase();
  }

  // Patrones comunes de localizador
  const patterns = [
    /(?:LOCALIZADOR|PNR|BOOKING REF|RECORD LOCATOR|CONF(?:IRMATION)?)[:\s]*([A-Z0-9]{5,8})/i,
    /(?:COD\.?\s*RESERV(?:ACION|ACIÓN))[:\s]*([A-Z0-9]{5,8})/i,
    /(?:AIRLINE\s*BOOKING\s*REF)[:\s]*([A-Z0-9]{5,8})/i,
    /(?:CÓDIGO?\s*DE?\s*RESERVA)[:\s]*([A-Z0-9]{5,8})/i,
    /\b([A-Z0-9]{6})\b(?=.*(?:flight|vuelo|segment|itinerary))/i,
    /^([A-Z0-9]{6})$/m,
    /RP\/[A-Z0-9]+\/[A-Z0-9]+\s+([A-Z0-9]{6})/,
    /\*\*\s*([A-Z0-9]{6})\s*\*\*/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const locator = match[1].toUpperCase();
      // Validar que parece un localizador válido
      if (/^[A-Z0-9]{5,8}$/.test(locator) && /[A-Z]/.test(locator) && /[0-9]/.test(locator)) {
        return locator;
      }
    }
  }

  // Buscar patrón genérico de 6 caracteres al final de línea con header
  const genericMatch = text.match(/\s([A-Z0-9]{6})\s*$/m);
  if (genericMatch) {
    const candidate = genericMatch[1].toUpperCase();
    if (/[A-Z]/.test(candidate) && /[0-9]/.test(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

// Extract airline locator from text (e.g., "Localizador: JFRZXA" or "AR/ABC123")
export function parseAirlineLocator(text: string): string | undefined {
  const patterns = [
    // Spanish patterns
    /(?:LOCALIZADOR|CÓDIGO\s*(?:DE)?\s*RESERVA|CODIGO\s*(?:DE)?\s*RESERVA)\s*[:\-]?\s*([A-Z0-9]{5,8})/gi,
    // English patterns
    /(?:CONFIRMATION|BOOKING\s*(?:REF(?:ERENCE)?)?|AIRLINE\s*(?:CODE|REF))\s*[:\-]?\s*([A-Z0-9]{5,8})/gi,
    // Airline prefixed: AR/JFRZXA, LA/ABC123
    /(?:AR|LA|AA|AV|AM|UA|DL|IB|BA|AF|LH)\/([A-Z0-9]{5,8})/gi,
    // E-ticket style: Your confirmation code is JFRZXA
    /(?:YOUR\s+)?(?:CONFIRMATION|BOOKING)\s+(?:CODE|NUMBER)\s+(?:IS\s+)?([A-Z0-9]{5,8})/gi,
    // Ref: ABCDEF or REF ABCDEF
    /\bREF[:\.\s]+([A-Z0-9]{6})\b/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Extract the actual code from the match
      const fullMatch = match[0];
      const codeMatch = fullMatch.match(/[A-Z0-9]{5,8}$/i);
      if (codeMatch) {
        return codeMatch[0].toUpperCase();
      }
    }
  }

  return undefined;
}

export function parsePassengers(text: string): ParsedPassenger[] {
  const passengers: ParsedPassenger[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Formato Amadeus en una sola línea: 1.APELLIDO/NOMBRE   2.APELLIDO/NOMBRE
    // Puede tener múltiples pasajeros en la misma línea
    const amadeusMultiPattern = /(\d+)\.([A-Z\s]+)\/([A-Z\s]+?)(?=\s+\d+\.|$)/gi;
    let match;
    let foundInLine = false;
    
    while ((match = amadeusMultiPattern.exec(line)) !== null) {
      foundInLine = true;
      const lastName = match[2].trim();
      const firstName = match[3].trim();
      
      // Extraer título si está al final del nombre
      const titleMatch = firstName.match(/^(.+?)\s+(MR|MRS|MS|MISS|DR|MSTR|CHD|INF)$/i);
      if (titleMatch) {
        passengers.push({
          lastName,
          firstName: titleMatch[1].trim(),
          title: titleMatch[2].toUpperCase()
        });
      } else {
        passengers.push({
          lastName,
          firstName
        });
      }
    }
    
    if (foundInLine) continue;

    // Formato: 1.1SURNAME/FIRSTNAME MR o SURNAME/FIRSTNAME
    const pattern1 = /\d+\.\d*\s*([A-Z]+)\/([A-Z\s]+?)(?:\s+(MR|MRS|MS|MISS|DR|MSTR|CHD|INF))?\s*$/i;
    const match1 = line.match(pattern1);
    if (match1) {
      passengers.push({
        lastName: match1[1].trim(),
        firstName: match1[2].trim(),
        title: match1[3]?.toUpperCase()
      });
      continue;
    }

    // Formato alternativo: SURNAME/FIRSTNAME TITLE
    const pattern2 = /^([A-Z][A-Z\s]+)\/([A-Z][A-Z\s]+?)(?:\s+(MR|MRS|MS|MISS|DR|MSTR))?\s*$/i;
    const match2 = line.match(pattern2);
    if (match2 && line.includes('/')) {
      passengers.push({
        lastName: match2[1].trim(),
        firstName: match2[2].trim(),
        title: match2[3]?.toUpperCase()
      });
      continue;
    }

    // Formato con número: 1. SURNAME/FIRSTNAME
    const pattern3 = /^\s*\d+\.?\s+([A-Z]+)\/([A-Z\s]+?)(?:\s+([A-Z]{2,4}))?\s*$/i;
    const match3 = line.match(pattern3);
    if (match3) {
      passengers.push({
        lastName: match3[1].trim(),
        firstName: match3[2].trim(),
        title: match3[3]?.toUpperCase()
      });
      continue;
    }

    // Formato e-ticket Aerolíneas Argentinas: "Nombre: APELLIDO/NOMBRE" o "Pasajero: APELLIDO/NOMBRE"
    const eticketPattern1 = /(?:NOMBRE|PASAJERO|PASSENGER|NAME)\s*[:\-]\s*([A-Z][A-Z\s]+)\/([A-Z][A-Z\s]+)/i;
    const eticketMatch1 = line.match(eticketPattern1);
    if (eticketMatch1) {
      passengers.push({
        lastName: eticketMatch1[1].trim(),
        firstName: eticketMatch1[2].trim()
      });
      continue;
    }

    // Formato e-ticket: "Traveler Apellido Nombre Nombre2 (ADT)" o "Traveler Apellido Nombre (CHD)"
    const travelerPattern = /(?:TRAVELER|VIAJERO|TITULAR)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+\((?:ADT|CHD|INF)\)/i;
    const travelerMatch = line.match(travelerPattern);
    if (travelerMatch) {
      const parts = travelerMatch[1].trim().split(/\s+/);
      if (parts.length >= 2) {
        passengers.push({
          lastName: parts[0].toUpperCase(),
          firstName: parts.slice(1).join(' ').toUpperCase()
        });
      }
      continue;
    }

    // Formato e-ticket: "APELLIDO NOMBRE" después de etiquetas comunes
    const eticketPattern2 = /(?:TITULAR|HOLDER|VIAJERO|TRAVELER)\s*[:\-]?\s*([A-Z]+)\s+([A-Z]+)/i;
    const eticketMatch2 = line.match(eticketPattern2);
    if (eticketMatch2) {
      passengers.push({
        lastName: eticketMatch2[1].trim(),
        firstName: eticketMatch2[2].trim()
      });
      continue;
    }

    // Formato LATAM: "Sr. APELLIDO/NOMBRE" o "Sra. APELLIDO/NOMBRE"
    const latamPattern = /(?:SR\.?|SRA\.?|SEÑOR|SEÑORA)\s+([A-Z]+)\/([A-Z\s]+)/i;
    const latamMatch = line.match(latamPattern);
    if (latamMatch) {
      const title = line.match(/SR\.?|SRA\.?|SEÑOR|SEÑORA/i)?.[0]?.toUpperCase();
      passengers.push({
        lastName: latamMatch[1].trim(),
        firstName: latamMatch[2].trim(),
        title: title === 'SRA' || title === 'SEÑORA' ? 'MRS' : 'MR'
      });
    }
  }

  // Si no encontramos pasajeros con los patrones anteriores, buscar en formato tabla/visual
  if (passengers.length === 0) {
    console.log('Trying visual e-ticket passenger patterns...');
    
    // Buscar nombres completos en mayúsculas - más flexible, no requiere línea completa
    const fullNamePattern = /(?:^|[\n,;|·•\t])[\s]*([A-Z]{2,}(?:\s+(?:DE\s+)?[A-Z]{2,})+)[\s]*(?:$|[\n,;|·•\t])/gm;
    let fullNameMatch;
    const potentialNames: string[] = [];
    
    // Try to find names near passenger-related keywords first
    const keywordContext = /(?:pasajero|passenger|nombre|name|pax|titular|traveler|viajero|ticket)[s]?\s*[:\-#\d.]*\s*([A-Z]{2,}(?:\s+(?:DE\s+)?[A-Z]{2,})+)/gi;
    let keywordMatch;
    while ((keywordMatch = keywordContext.exec(text)) !== null) {
      const name = keywordMatch[1].trim();
      const words = name.split(/\s+/);
      if (words.length >= 2 && words.length <= 6 && words.every(w => w.length >= 2)) {
        potentialNames.push(name);
      }
    }
    
    // If no keyword-based names, try standalone uppercase names
    if (potentialNames.length === 0) {
      while ((fullNameMatch = fullNamePattern.exec(text)) !== null) {
        const name = fullNameMatch[1].trim();
        const excludePatterns = [
          /^(VUELO|FLIGHT|DESDE|HACIA|FROM|TO|CLASE|CLASS|ECONOMY|BUSINESS|FIRST|PREMIUM)$/i,
          /^(PASAJERO|PASSENGER|DOCUMENTO|TICKET|TRAMO|SEGMENT|ITINERARIO|ITINERARY)$/i,
          /^(BUENOS AIRES|ROMA|MADRID|MIAMI|NEW YORK|SAO PAULO|RIO DE JANEIRO)$/i,
          /^(AIRBUS|BOEING|EMBRAER)/i,
          /^(INTERNACIONAL|DOMESTIC|NATIONAL|EQUIPAJE|BAGGAGE|CHECKED|CARRY)/i,
          /^(FECHA|DATE|HORA|TIME|SALIDA|LLEGADA|DEPARTURE|ARRIVAL|TERMINAL)/i,
          /^(TARIFA|FARE|TOTAL|IMPUESTO|TAX|CARGO|SERVICIO|SERVICE)/i,
          /^(NUMERO DE|NUMBER OF|CODIGO DE|BOOKING REF|RECORD LOCATOR)/i,
          /^(ITA AIRWAYS|AEROLINEAS ARGENTINAS|AMERICAN AIRLINES|LATAM AIRLINES)/i,
          /^\d/,
          /^[A-Z]{2}\d/,
        ];
        
        const isExcluded = excludePatterns.some(p => p.test(name));
        const words = name.split(/\s+/);
        
        if (!isExcluded && words.length >= 2 && words.length <= 6 && name.length <= 50) {
          const validWords = words.every(w => w.length >= 2 || w === 'DE');
          if (validWords) {
            const commonWords = new Set(['CON', 'SIN', 'POR', 'PARA', 'COMO', 'MAS', 'MENOS', 'SOBRE', 'BAJO', 'ENTRE']);
            const isAllCommon = words.every(w => commonWords.has(w));
            if (!isAllCommon) {
              potentialNames.push(name);
            }
          }
        }
      }
    }
    
    console.log('Potential passenger names found:', potentialNames);
    
    const uniqueNames = [...new Set(potentialNames)];
    
    for (const fullName of uniqueNames) {
      const parts = fullName.split(/\s+/);
      if (parts.length >= 2) {
        if (parts.length === 2) {
          passengers.push({ firstName: parts[0], lastName: parts[1] });
        } else if (parts.length === 3) {
          passengers.push({ firstName: parts[0], lastName: `${parts[1]} ${parts[2]}` });
        } else {
          const midPoint = Math.ceil(parts.length / 2);
          passengers.push({
            firstName: parts.slice(0, midPoint).join(' '),
            lastName: parts.slice(midPoint).join(' ')
          });
        }
      }
    }
  }

  return passengers;
}

function parseDate(dateStr: string, year?: number): Date | undefined {
  const currentYear = year || new Date().getFullYear();

  // Formato: 14JAN o 14JAN26 o 14JAN2026
  const pattern1 = /(\d{1,2})([A-Z]{3})(\d{2,4})?/i;
  const match1 = dateStr.match(pattern1);
  if (match1) {
    const day = parseInt(match1[1]);
    const monthName = match1[2].toUpperCase();
    const month = MONTHS[monthName];
    if (month !== undefined) {
      let yearVal = currentYear;
      if (match1[3]) {
        yearVal = match1[3].length === 2 ? 2000 + parseInt(match1[3]) : parseInt(match1[3]);
      }
      return new Date(yearVal, month, day);
    }
  }

  // Formato: 2026-01-14 o 14/01/2026
  const pattern2 = /(\d{4})-(\d{2})-(\d{2})/;
  const match2 = dateStr.match(pattern2);
  if (match2) {
    return new Date(parseInt(match2[1]), parseInt(match2[2]) - 1, parseInt(match2[3]));
  }

  const pattern3 = /(\d{2})\/(\d{2})\/(\d{4})/;
  const match3 = dateStr.match(pattern3);
  if (match3) {
    return new Date(parseInt(match3[3]), parseInt(match3[2]) - 1, parseInt(match3[1]));
  }

  return undefined;
}

function parseTime(timeStr: string): { hours: number; minutes: number } | undefined {
  // Formato: 1115 o 11:15 o 11:15AM
  const pattern1 = /(\d{2}):?(\d{2})(?:\s*(AM|PM))?/i;
  const match = timeStr.match(pattern1);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    if (match[3]) {
      const meridiem = match[3].toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
    }
    return { hours, minutes };
  }
  return undefined;
}

export function parseSegments(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Patrón Amadeus específico: 3  AR1328 I 17APR 5 EZEPUJ HK2  0830 1530  17APR  E  AR/JFRZXA
    // Formato: [num] [airline][flight] [class] [date] [dayofweek] [ORIG+DEST(6chars)] [status] [deptime] [arrtime] [arrdate?] [E] [airline/locator]
    const amadeusPattern = /^\s*(\d+)\s+([A-Z0-9]{2})\s?(\d{1,4})\s+([A-Z])\s+(\d{1,2}[A-Z]{3})\s+\d\s+([A-Z]{6})\s+([A-Z]{2}\d?)\s+(\d{4})\s+(\d{4})(?:\s+(\d{1,2}[A-Z]{3}))?(?:\s+[A-Z])?(?:\s+[A-Z]{2}\/([A-Z0-9]{5,8}))?/i;
    const amadeusMatch = line.match(amadeusPattern);
    if (amadeusMatch) {
      const originDest = amadeusMatch[6].toUpperCase();
      const originIata = originDest.substring(0, 3);
      const destinationIata = originDest.substring(3, 6);
      
      const depDate = parseDate(amadeusMatch[5]);
      const depTime = parseTime(amadeusMatch[8]);
      const arrTime = parseTime(amadeusMatch[9]);
      const arrDateStr = amadeusMatch[10];
      const arrDate = arrDateStr ? parseDate(arrDateStr) : depDate;
      const airlineLocator = amadeusMatch[11]?.toUpperCase();

      let depDatetime: Date | undefined;
      let arrDatetime: Date | undefined;

      if (depDate && depTime) {
        depDatetime = new Date(depDate);
        depDatetime.setHours(depTime.hours, depTime.minutes);
      }

      if (arrDate && arrTime) {
        arrDatetime = new Date(arrDate);
        arrDatetime.setHours(arrTime.hours, arrTime.minutes);
      } else if (depDate && arrTime) {
        arrDatetime = new Date(depDate);
        arrDatetime.setHours(arrTime.hours, arrTime.minutes);
        // Si llegada es antes que salida y no hay fecha explícita, es al día siguiente
        if (depDatetime && arrDatetime < depDatetime) {
          arrDatetime.setDate(arrDatetime.getDate() + 1);
        }
      }

      segments.push({
        airlineCode: amadeusMatch[2].toUpperCase(),
        flightNumber: amadeusMatch[3],
        originIata,
        destinationIata,
        depDatetime,
        arrDatetime,
        bookingClass: amadeusMatch[4].toUpperCase(),
        segmentStatus: amadeusMatch[7].toUpperCase(),
        airlineLocator,
        rawText: line.trim(),
        isIncomplete: !depDatetime
      });
      continue;
    }

    // Patrón Amadeus alternativo sin el día de la semana separado
    // Formato: 3 AR1328 I 17APR EZEPUJ HK2 0830 1530
    const amadeusAltPattern = /^\s*(\d+)\s+([A-Z0-9]{2})\s?(\d{1,4})\s+([A-Z])\s+(\d{1,2}[A-Z]{3})\s+([A-Z]{6})\s+([A-Z]{2}\d?)\s+(\d{4})\s+(\d{4})?/i;
    const amadeusAltMatch = line.match(amadeusAltPattern);
    if (amadeusAltMatch) {
      const originDest = amadeusAltMatch[6].toUpperCase();
      const originIata = originDest.substring(0, 3);
      const destinationIata = originDest.substring(3, 6);
      
      const depDate = parseDate(amadeusAltMatch[5]);
      const depTime = parseTime(amadeusAltMatch[8]);
      const arrTime = amadeusAltMatch[9] ? parseTime(amadeusAltMatch[9]) : undefined;

      let depDatetime: Date | undefined;
      let arrDatetime: Date | undefined;

      if (depDate && depTime) {
        depDatetime = new Date(depDate);
        depDatetime.setHours(depTime.hours, depTime.minutes);
      }

      if (depDate && arrTime) {
        arrDatetime = new Date(depDate);
        arrDatetime.setHours(arrTime.hours, arrTime.minutes);
        if (depDatetime && arrDatetime < depDatetime) {
          arrDatetime.setDate(arrDatetime.getDate() + 1);
        }
      }

      segments.push({
        airlineCode: amadeusAltMatch[2].toUpperCase(),
        flightNumber: amadeusAltMatch[3],
        originIata,
        destinationIata,
        depDatetime,
        arrDatetime,
        bookingClass: amadeusAltMatch[4].toUpperCase(),
        segmentStatus: amadeusAltMatch[7].toUpperCase(),
        rawText: line.trim(),
        isIncomplete: !depDatetime
      });
      continue;
    }

    // Patrón GDS típico con IATA separados: 1 AA1234 Y 14JAN EZEORD HK2 1115 1830
    const gdsPattern = /(\d+)\s+([A-Z0-9]{2})\s?(\d{1,4})\s+([A-Z])\s+(\d{1,2}[A-Z]{3}\d{0,4})\s+([A-Z]{3})([A-Z]{3})\s+([A-Z]{2}\d?)\s+(\d{4})\s*(\d{4})?/i;
    const gdsMatch = line.match(gdsPattern);
    if (gdsMatch) {
      const depDate = parseDate(gdsMatch[5]);
      const depTime = parseTime(gdsMatch[9]);
      const arrTime = gdsMatch[10] ? parseTime(gdsMatch[10]) : undefined;

      let depDatetime: Date | undefined;
      let arrDatetime: Date | undefined;

      if (depDate && depTime) {
        depDatetime = new Date(depDate);
        depDatetime.setHours(depTime.hours, depTime.minutes);
      }

      if (depDate && arrTime) {
        arrDatetime = new Date(depDate);
        arrDatetime.setHours(arrTime.hours, arrTime.minutes);
        // Si llegada es antes que salida, es al día siguiente
        if (depDatetime && arrDatetime < depDatetime) {
          arrDatetime.setDate(arrDatetime.getDate() + 1);
        }
      }

      segments.push({
        airlineCode: gdsMatch[2].toUpperCase(),
        flightNumber: gdsMatch[3],
        originIata: gdsMatch[6].toUpperCase(),
        destinationIata: gdsMatch[7].toUpperCase(),
        depDatetime,
        arrDatetime,
        bookingClass: gdsMatch[4].toUpperCase(),
        segmentStatus: gdsMatch[8].toUpperCase(),
        rawText: line.trim(),
        isIncomplete: !depDatetime
      });
      continue;
    }

    // Patrón flexible: AA 1234 EZE-ORD 14JAN 11:15
    const flexPattern = /([A-Z]{2})\s?(\d{1,4})\s+([A-Z]{3})\s*[-→>]\s*([A-Z]{3})\s+(\d{1,2}[A-Z]{3}\d{0,4})\s+(\d{2}:?\d{2})?/i;
    const flexMatch = line.match(flexPattern);
    if (flexMatch) {
      const depDate = parseDate(flexMatch[5]);
      const depTime = flexMatch[6] ? parseTime(flexMatch[6]) : undefined;
      
      let depDatetime: Date | undefined;
      if (depDate && depTime) {
        depDatetime = new Date(depDate);
        depDatetime.setHours(depTime.hours, depTime.minutes);
      } else if (depDate) {
        depDatetime = depDate;
      }

      segments.push({
        airlineCode: flexMatch[1].toUpperCase(),
        flightNumber: flexMatch[2],
        originIata: flexMatch[3].toUpperCase(),
        destinationIata: flexMatch[4].toUpperCase(),
        depDatetime,
        bookingClass: undefined,
        segmentStatus: undefined,
        rawText: line.trim(),
        isIncomplete: !depDatetime
      });
      continue;
    }

    // Patrón de itinerario: Flight AA1234 from Buenos Aires (EZE) to Chicago (ORD)
    const itinPattern = /(?:FLIGHT|VUELO)\s+([A-Z]{2})\s?(\d{1,4}).*?([A-Z]{3}).*?(?:TO|A)\s+.*?([A-Z]{3})/i;
    const itinMatch = line.match(itinPattern);
    if (itinMatch) {
      segments.push({
        airlineCode: itinMatch[1].toUpperCase(),
        flightNumber: itinMatch[2],
        originIata: itinMatch[3].toUpperCase(),
        destinationIata: itinMatch[4].toUpperCase(),
        rawText: line.trim(),
        isIncomplete: true
      });
      continue;
    }

    // Patrón e-ticket AR: "AR1414 T 14Jan 11:15 13:15 Ok" con IATA antes/después
    // Also handles: "AZ 681 T 23Jul 12:55 06:40"
    const eticketLinePattern = /([A-Z]{2})\s?(\d{1,4})\s+([A-Z])\s+(\d{1,2}[A-Z]{3}\d{0,4})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(?:Ok|HK|RR)/i;
    const eticketLineMatch = line.match(eticketLinePattern);
    if (eticketLineMatch) {
      const airline = eticketLineMatch[1].toUpperCase();
      const flightNum = eticketLineMatch[2];
      const bookingClass = eticketLineMatch[3].toUpperCase();
      const depDate = parseDate(eticketLineMatch[4]);
      const depTime = parseTime(eticketLineMatch[5]);
      const arrTime = parseTime(eticketLineMatch[6]);
      
      // Look for IATA codes in surrounding lines
      let originIata = '';
      let destIata = '';
      const lineIndex = lines.indexOf(line);
      const contextLines = lines.slice(Math.max(0, lineIndex - 5), lineIndex + 5).join(' ').toUpperCase();
      
      // Look for IATA pairs in context
      const iataInContext = contextLines.match(/\b([A-Z]{3})\b/g) || [];
      const validIatas = iataInContext.filter(code => {
        const excluded = ['THE', 'AND', 'FOR', 'CON', 'DEL', 'NOT', 'TAX', 'VIA', 'NET', 'FEE', 'USD', 'ARS', 'EUR', 
          'MRS', 'REF', 'ADT', 'CHD', 'INF', 'PDF', 'WWW', 'COM', 'ITA', 'AIR', 'NON', 'END', 'NVB', 'NVA',
          'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
          'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'DOM', 'LUN', 'MIE', 'JUE', 'VIE', 'SAB',
          'FARE', 'CASH', 'SNACK', 'STOP', 'MEAL', 'BAG', 'OK'];
        return !excluded.includes(code) && code !== airline;
      });
      
      // Find common IATA airport codes
      const knownIatas = ['EZE', 'AEP', 'COR', 'MDQ', 'ROS', 'SLA', 'TUC', 'MEN', 'MDZ', 'BRC', 'USH', 'IGR', 'JUJ', 'NQN', 'CRD', 'REL', 'FTE', 'PSS',
        'GRU', 'GIG', 'BSB', 'SSA', 'REC', 'NAT', 'FLN', 'CWB', 'POA', 'BEL', 'FOR', 'MAN', 'VCP',
        'SCL', 'LIM', 'BOG', 'UIO', 'CCS', 'MVD', 'ASU', 'LPB', 'VVI',
        'MIA', 'JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'SFO', 'IAH', 'DEN', 'SEA', 'MCO', 'CUN',
        'MAD', 'BCN', 'FCO', 'CDG', 'LHR', 'FRA', 'AMS', 'MXP', 'LIS', 'ZRH', 'MUC',
        'DOH', 'DXB', 'IST', 'TLV', 'PUJ', 'PTY', 'MEX', 'GDL', 'HAV'];
      
      const matchedIatas = validIatas.filter(code => knownIatas.includes(code));
      
      if (matchedIatas.length >= 2) {
        originIata = matchedIatas[0];
        destIata = matchedIatas[1];
      } else if (validIatas.length >= 2) {
        originIata = validIatas[0];
        destIata = validIatas[1];
      }
      
      let depDatetime: Date | undefined;
      let arrDatetime: Date | undefined;
      
      if (depDate && depTime) {
        depDatetime = new Date(depDate);
        depDatetime.setHours(depTime.hours, depTime.minutes);
      }
      if (depDate && arrTime) {
        arrDatetime = new Date(depDate);
        arrDatetime.setHours(arrTime.hours, arrTime.minutes);
        if (depDatetime && arrDatetime < depDatetime) {
          arrDatetime.setDate(arrDatetime.getDate() + 1);
        }
      }
      
      if (originIata && destIata) {
        segments.push({
          airlineCode: airline,
          flightNumber: flightNum,
          originIata,
          destinationIata: destIata,
          depDatetime,
          arrDatetime,
          bookingClass,
          segmentStatus: 'HK',
          rawText: line.trim(),
          isIncomplete: !depDatetime
        });
        console.log('Added e-ticket segment:', airline, flightNum, originIata, '->', destIata);
        continue;
      }
    }
  }

  // Si no encontramos segmentos estructurados, intentar extraer de e-tickets visuales
  if (segments.length === 0) {
    console.log('No structured segments found, trying visual e-ticket patterns...');
    
    const normalizedText = text.toUpperCase();
    
    // STEP 1: Find all flight codes in the text (multiple patterns)
    const flightPatterns = [
      /(?:VUELO|FLIGHT|VLO)\s+([A-Z]{2})\s*(\d{1,4})/gi,
      /\b([A-Z]{2})\s*(\d{3,4})\b/gi,
    ];
    
    const flights: Array<{airline: string, flight: string, index: number}> = [];
    const seenFlights = new Set<string>();
    
    for (const pattern of flightPatterns) {
      let m;
      while ((m = pattern.exec(normalizedText)) !== null) {
        const airline = m[1].toUpperCase();
        const flightNum = m[2];
        const key = `${airline}${flightNum}`;
        
        if (!seenFlights.has(key) && COMMON_AIRLINES.includes(airline)) {
          seenFlights.add(key);
          flights.push({ airline, flight: flightNum, index: m.index });
        }
      }
    }
    
    flights.sort((a, b) => a.index - b.index);
    console.log('Found flights:', flights.map(f => `${f.airline}${f.flight}`));
    
    // STEP 2: Find all IATA airport codes
    const iataSearchPattern = /\b([A-Z]{3})\b/gi;
    const excludedWords = new Set([
      'THE', 'AND', 'FOR', 'CON', 'DEL', 'LOS', 'LAS', 'POR', 'SIN', 'MAS', 'QUE', 'UNA', 'UNO',
      'TAX', 'VIA', 'NET', 'FEE', 'USD', 'ARS', 'EUR', 'MRS', 'REF', 'ADT', 'CHD', 'NOT', 'ALL',
      'INF', 'YQI', 'YQR', 'PDF', 'WWW', 'COM', 'ITA', 'AIR', 'NON', 'END', 'NVB', 'NVA', 'GOL',
      'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'DOM', 'LUN', 'MIE', 'JUE', 'VIE', 'SAB',
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
      'ENE', 'ABR', 'AGO', 'DIC',
      'FARE', 'CASH', 'STOP', 'MEAL', 'BAG', 'ROW', 'DAY', 'NRO', 'NUM', 'COD', 'RES',
      'CKI', 'SSR', 'OSI', 'TST', 'TKT', 'EMD', 'PTA', 'MPD', 'FOP',
    ]);
    
    const foundIatas: Array<{code: string, index: number}> = [];
    let iataM;
    while ((iataM = iataSearchPattern.exec(normalizedText)) !== null) {
      const code = iataM[1].toUpperCase();
      if (!excludedWords.has(code) && KNOWN_IATA_AIRPORTS.has(code)) {
        foundIatas.push({ code, index: iataM.index });
      }
    }
    
    console.log('Found IATA codes:', foundIatas.map(i => i.code));
    
    // STEP 3: Find route patterns
    const routePatterns = [
      /(?:DESDE|FROM|ORIGIN|SALE|DEP(?:ARTURE)?)\s*[:\s]*([A-Z]{3})[\s\S]{0,100}?(?:HACIA|TO|DEST(?:INATION)?|LLEGA|ARR(?:IVAL)?)\s*[:\s]*([A-Z]{3})/gi,
      /([A-Z]{3})\s*[-→>➔➜►▸»]\s*([A-Z]{3})/gi,
    ];
    
    const routes: Array<{origin: string, dest: string, index: number}> = [];
    for (const rp of routePatterns) {
      let rm;
      while ((rm = rp.exec(normalizedText)) !== null) {
        const o = rm[1].toUpperCase();
        const d = rm[2].toUpperCase();
        if (KNOWN_IATA_AIRPORTS.has(o) && KNOWN_IATA_AIRPORTS.has(d) && o !== d) {
          routes.push({ origin: o, dest: d, index: rm.index });
        }
      }
    }
    
    console.log('Found routes:', routes.map(r => `${r.origin}->${r.dest}`));
    
    // STEP 4: Find dates
    const datePatternSlash = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
    const datePatternText = /(\d{1,2})\s*(?:DE\s+)?([A-Z]{3,})\s*(?:DE\s+)?(\d{4})/gi;
    const dates: Array<{date: Date, index: number}> = [];
    
    let dm;
    while ((dm = datePatternSlash.exec(normalizedText)) !== null) {
      const day = parseInt(dm[1]);
      const month = parseInt(dm[2]) - 1;
      const year = parseInt(dm[3]);
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2024 && year <= 2030) {
        dates.push({ date: new Date(year, month, day), index: dm.index });
      }
    }
    while ((dm = datePatternText.exec(normalizedText)) !== null) {
      const day = parseInt(dm[1]);
      const monthName = dm[2].substring(0, 3).toUpperCase();
      const year = parseInt(dm[3]);
      const month = MONTHS[monthName];
      if (month !== undefined && day >= 1 && day <= 31 && year >= 2024 && year <= 2030) {
        dates.push({ date: new Date(year, month, day), index: dm.index });
      }
    }
    // GDS-style: 23JUL or 23JUL26
    const gdsDPat = /\b(\d{1,2})([A-Z]{3})(\d{2,4})?\b/gi;
    while ((dm = gdsDPat.exec(normalizedText)) !== null) {
      const day = parseInt(dm[1]);
      const monthName = dm[2].toUpperCase();
      const month = MONTHS[monthName];
      if (month !== undefined && day >= 1 && day <= 31) {
        let year = new Date().getFullYear();
        if (dm[3]) year = dm[3].length === 2 ? 2000 + parseInt(dm[3]) : parseInt(dm[3]);
        const exists = dates.some(d => d.date.getTime() === new Date(year, month, day).getTime());
        if (!exists) dates.push({ date: new Date(year, month, day), index: dm.index });
      }
    }
    dates.sort((a, b) => a.index - b.index);
    console.log('Found dates:', dates.map(d => d.date.toLocaleDateString()));
    
    // STEP 5: Find times, filtering flight durations
    const durPat = /\d{1,2}h\s*\d{1,2}m/gi;
    const durRanges: Array<{start: number, end: number}> = [];
    let durM;
    while ((durM = durPat.exec(normalizedText)) !== null) {
      durRanges.push({ start: durM.index, end: durM.index + durM[0].length });
    }
    
    const timePat = /(\d{1,2}):(\d{2})/g;
    const times: Array<{hours: number, minutes: number, index: number}> = [];
    let tm;
    while ((tm = timePat.exec(normalizedText)) !== null) {
      const h = parseInt(tm[1]);
      const mins = parseInt(tm[2]);
      if (h >= 0 && h <= 23 && mins >= 0 && mins <= 59) {
        const inDur = durRanges.some(r => tm!.index >= r.start && tm!.index <= r.end);
        const afterChar = normalizedText[tm.index + tm[0].length];
        if (!inDur && afterChar !== 'H') {
          times.push({ hours: h, minutes: mins, index: tm.index });
        }
      }
    }
    times.sort((a, b) => a.index - b.index);
    console.log('Found times:', times.map(t => `${t.hours}:${String(t.minutes).padStart(2, '0')}`));
    
    // STEP 6: Build segments
    if (flights.length > 0) {
      for (let i = 0; i < flights.length; i++) {
        const flight = flights[i];
        const nextIdx = i < flights.length - 1 ? flights[i + 1].index : normalizedText.length;
        
        // Find route for this flight
        let route = routes.find(r => r.index > flight.index - 50 && r.index < nextIdx);
        
        if (!route) {
          const nearIatas = foundIatas.filter(ia => 
            ia.index > flight.index - 100 && ia.index < nextIdx && ia.code !== flight.airline
          );
          const uniq: typeof nearIatas = [];
          for (const ia of nearIatas) {
            if (uniq.length === 0 || uniq[uniq.length - 1].code !== ia.code) uniq.push(ia);
          }
          if (uniq.length >= 2) {
            route = { origin: uniq[0].code, dest: uniq[1].code, index: uniq[0].index };
          }
        }
        
        const segDates = dates.filter(d => d.index > flight.index - 50 && d.index < nextIdx);
        const segTimes = times.filter(t => t.index > flight.index - 50 && t.index < nextIdx);
        
        const depDate = segDates[0]?.date;
        const arrDate = segDates.length > 1 ? segDates[1]?.date : depDate;
        
        let depDatetime: Date | undefined;
        let arrDatetime: Date | undefined;
        
        if (depDate && segTimes[0]) {
          depDatetime = new Date(depDate);
          depDatetime.setHours(segTimes[0].hours, segTimes[0].minutes);
        } else if (depDate) {
          depDatetime = depDate;
        }
        
        if (arrDate && segTimes.length > 1) {
          arrDatetime = new Date(arrDate);
          arrDatetime.setHours(segTimes[1].hours, segTimes[1].minutes);
        }
        
        segments.push({
          airlineCode: flight.airline,
          flightNumber: flight.flight,
          originIata: route?.origin || '',
          destinationIata: route?.dest || '',
          depDatetime,
          arrDatetime,
          rawText: `${flight.airline} ${flight.flight}${route ? ` ${route.origin}-${route.dest}` : ''}`,
          isIncomplete: !depDatetime || !route
        });
        console.log('Added visual segment:', flight.airline, flight.flight, route?.origin || '?', '->', route?.dest || '?');
      }
    }
    
    // STEP 7: No flights but routes exist
    if (segments.length === 0 && routes.length > 0) {
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const depDate = dates[i]?.date || dates[0]?.date;
        const depTime = times[i * 2];
        let depDatetime: Date | undefined;
        if (depDate && depTime) {
          depDatetime = new Date(depDate);
          depDatetime.setHours(depTime.hours, depTime.minutes);
        } else if (depDate) {
          depDatetime = depDate;
        }
        segments.push({
          airlineCode: '', flightNumber: '',
          originIata: route.origin, destinationIata: route.dest,
          depDatetime, rawText: `${route.origin} -> ${route.dest}`, isIncomplete: true
        });
      }
    }
    
    // STEP 8: Last resort - IATA pairs
    if (segments.length === 0 && foundIatas.length >= 2) {
      const uniqCodes: string[] = [];
      for (const ia of foundIatas) {
        if (uniqCodes.length === 0 || uniqCodes[uniqCodes.length - 1] !== ia.code) uniqCodes.push(ia.code);
      }
      for (let i = 0; i < uniqCodes.length - 1; i += 2) {
        segments.push({
          airlineCode: '', flightNumber: '',
          originIata: uniqCodes[i], destinationIata: uniqCodes[i + 1],
          depDatetime: dates[0]?.date,
          rawText: `${uniqCodes[i]} -> ${uniqCodes[i + 1]}`, isIncomplete: true
        });
      }
    }
  }

  console.log('Final segments count:', segments.length);
  return segments;
}

export function parsePNR(text: string): ParsedReservation {
  const locator = parseLocator(text);
  const passengers = parsePassengers(text);
  let segments = parseSegments(text);

  // If segments don't have airline locator, try to extract from text
  const airlineLocator = parseAirlineLocator(text);
  if (airlineLocator) {
    segments = segments.map(seg => ({
      ...seg,
      airlineLocator: seg.airlineLocator || airlineLocator
    }));
  }

  return {
    locator,
    passengers,
    segments,
    rawText: text
  };
}

// Comparar dos segmentos para detectar cambios
export interface SegmentChange {
  field: string;
  beforeValue: string;
  afterValue: string;
  changeType: 'time_change' | 'date_change' | 'status_change' | 'cancellation';
}

export function compareSegments(
  oldSegment: ParsedSegment,
  newSegment: ParsedSegment
): SegmentChange[] {
  const changes: SegmentChange[] = [];

  // Comparar fecha de salida
  if (oldSegment.depDatetime && newSegment.depDatetime) {
    const oldDate = oldSegment.depDatetime.toDateString();
    const newDate = newSegment.depDatetime.toDateString();
    if (oldDate !== newDate) {
      changes.push({
        field: 'dep_date',
        beforeValue: oldDate,
        afterValue: newDate,
        changeType: 'date_change'
      });
    }

    const oldTime = oldSegment.depDatetime.toTimeString().slice(0, 5);
    const newTime = newSegment.depDatetime.toTimeString().slice(0, 5);
    if (oldTime !== newTime) {
      changes.push({
        field: 'dep_time',
        beforeValue: oldTime,
        afterValue: newTime,
        changeType: 'time_change'
      });
    }
  }

  // Comparar hora de llegada
  if (oldSegment.arrDatetime && newSegment.arrDatetime) {
    const oldTime = oldSegment.arrDatetime.toTimeString().slice(0, 5);
    const newTime = newSegment.arrDatetime.toTimeString().slice(0, 5);
    if (oldTime !== newTime) {
      changes.push({
        field: 'arr_time',
        beforeValue: oldTime,
        afterValue: newTime,
        changeType: 'time_change'
      });
    }
  }

  // Comparar estado
  if (oldSegment.segmentStatus && newSegment.segmentStatus) {
    if (oldSegment.segmentStatus !== newSegment.segmentStatus) {
      const changeType = ['UN', 'XX', 'NO'].includes(newSegment.segmentStatus)
        ? 'cancellation'
        : 'status_change';
      changes.push({
        field: 'status',
        beforeValue: oldSegment.segmentStatus,
        afterValue: newSegment.segmentStatus,
        changeType
      });
    }
  }

  return changes;
}

export function matchSegments(
  oldSegments: ParsedSegment[],
  newSegments: ParsedSegment[]
): Map<number, number> {
  const matches = new Map<number, number>();

  for (let i = 0; i < oldSegments.length; i++) {
    const old = oldSegments[i];
    for (let j = 0; j < newSegments.length; j++) {
      if (matches.has(j)) continue;
      
      const newSeg = newSegments[j];
      // Clave de matching: aerolínea + vuelo + origen + destino
      if (
        old.airlineCode === newSeg.airlineCode &&
        old.flightNumber === newSeg.flightNumber &&
        old.originIata === newSeg.originIata &&
        old.destinationIata === newSeg.destinationIata
      ) {
        matches.set(i, j);
        break;
      }
    }
  }

  return matches;
}

/**
 * Maps a parsed segment from PNR text to a Flight structure (excluding id)
 * used in Quote Wizard. Uses toLocalISOString to ensure timezone-safe date extraction.
 */
export function mapSegmentToFlight(seg: ParsedSegment): Omit<Flight, 'id'> {
  return {
    origin: seg.originIata,
    destination: seg.destinationIata,
    date: seg.depDatetime ? toLocalISOString(seg.depDatetime).split('T')[0] : '',
    departureTime: seg.depDatetime ? seg.depDatetime.toTimeString().slice(0, 5) : '',
    arrivalTime: seg.arrDatetime ? seg.arrDatetime.toTimeString().slice(0, 5) : '',
    airline: seg.airlineCode || '',
    flightNumber: `${seg.airlineCode}${seg.flightNumber}`.trim(),
    luggage: '',
    notes: seg.rawText || '',
    flightType: 'direct' as const,
  };
}

