/**
 * Utilidades para manejo de Zonas Horarias (Timezones) en vuelos y aeropuertos (IATA).
 * Permite calcular instantes exactos en UTC para alertas y recordatorios, 
 * y formatear horas locales según el aeropuerto de despegue/aterrizaje.
 */

// Mapeo exhaustivo de códigos IATA a zonas horarias estándar IANA
export const AIRPORT_TIMEZONES: Record<string, string> = {
  // Argentina (UTC-3)
  EZE: 'America/Argentina/Buenos_Aires',
  AEP: 'America/Argentina/Buenos_Aires',
  EPA: 'America/Argentina/Buenos_Aires',
  COR: 'America/Argentina/Cordoba',
  MDQ: 'America/Argentina/Buenos_Aires',
  ROS: 'America/Argentina/Cordoba',
  SLA: 'America/Argentina/Salta',
  TUC: 'America/Argentina/Tucuman',
  MDZ: 'America/Argentina/Mendoza',
  BRC: 'America/Argentina/Buenos_Aires',
  USH: 'America/Argentina/Ushuaia',
  IGR: 'America/Argentina/Buenos_Aires',
  JUJ: 'America/Argentina/Jujuy',
  NQN: 'America/Argentina/Buenos_Aires',
  CRD: 'America/Argentina/Catamarca',
  REL: 'America/Argentina/Buenos_Aires',
  FTE: 'America/Argentina/Rio_Gallegos',
  PSS: 'America/Argentina/Buenos_Aires',
  SFN: 'America/Argentina/Cordoba',
  CNQ: 'America/Argentina/Cordoba',
  RSA: 'America/Argentina/La_Rioja',
  VDM: 'America/Argentina/Buenos_Aires',
  CPC: 'America/Argentina/Buenos_Aires',
  BHI: 'America/Argentina/Buenos_Aires',
  RGA: 'America/Argentina/Rio_Gallegos',
  RGL: 'America/Argentina/Rio_Gallegos',
  LUQ: 'America/Argentina/San_Luis',
  UAQ: 'America/Argentina/San_Juan',
  IRJ: 'America/Argentina/La_Rioja',
  CTC: 'America/Argentina/Catamarca',
  SDE: 'America/Argentina/Cordoba',
  RES: 'America/Argentina/Cordoba',
  FMA: 'America/Argentina/Cordoba',
  EQS: 'America/Argentina/Buenos_Aires',
  PMY: 'America/Argentina/Buenos_Aires',

  // Sudamérica
  GRU: 'America/Sao_Paulo',
  GIG: 'America/Sao_Paulo',
  BSB: 'America/Sao_Paulo',
  SSA: 'America/Bahia',
  REC: 'America/Recife',
  NAT: 'America/Fortaleza',
  FLN: 'America/Sao_Paulo',
  CWB: 'America/Sao_Paulo',
  POA: 'America/Sao_Paulo',
  BEL: 'America/Belem',
  FOR: 'America/Fortaleza',
  VCP: 'America/Sao_Paulo',
  CGH: 'America/Sao_Paulo',
  SDU: 'America/Sao_Paulo',
  CNF: 'America/Sao_Paulo',
  IGU: 'America/Sao_Paulo',
  SCL: 'America/Santiago',
  LIM: 'America/Lima',
  CUZ: 'America/Lima',
  BOG: 'America/Bogota',
  MDE: 'America/Bogota',
  CTG: 'America/Bogota',
  CLO: 'America/Bogota',
  UIO: 'America/Guayaquil',
  GYE: 'America/Guayaquil',
  CCS: 'America/Caracas',
  MVD: 'America/Montevideo',
  PDP: 'America/Montevideo',
  ASU: 'America/Asuncion',
  AGT: 'America/Asuncion',
  LPB: 'America/La_Paz',
  VVI: 'America/La_Paz',
  CBB: 'America/La_Paz',

  // Centroamérica y Caribe
  PTY: 'America/Panama',
  SJO: 'America/Costa_Rica',
  LIR: 'America/Costa_Rica',
  GUA: 'America/Guatemala',
  SAL: 'America/El_Salvador',
  TGU: 'America/Tegucigalpa',
  SAP: 'America/Tegucigalpa',
  MGA: 'America/Managua',
  BZE: 'America/Belize',
  CUN: 'America/Cancun',
  MEX: 'America/Mexico_City',
  GDL: 'America/Mexico_City',
  MTY: 'America/Monterrey',
  TIJ: 'America/Tijuana',
  SJD: 'America/Mazatlan',
  PVR: 'America/Mexico_City',
  MID: 'America/Merida',
  PUJ: 'America/Santo_Domingo',
  SDQ: 'America/Santo_Domingo',
  STI: 'America/Santo_Domingo',
  HAV: 'America/Havana',
  VRA: 'America/Havana',
  NAS: 'America/Nassau',
  MBJ: 'America/Jamaica',
  KIN: 'America/Jamaica',
  SJU: 'America/Puerto_Rico',
  AUA: 'America/Aruba',
  CUR: 'America/Curacao',
  SXM: 'America/Lower_Princes',

  // Norteamérica
  MIA: 'America/New_York',
  FLL: 'America/New_York',
  MCO: 'America/New_York',
  TPA: 'America/New_York',
  JFK: 'America/New_York',
  EWR: 'America/New_York',
  LGA: 'America/New_York',
  BOS: 'America/New_York',
  PHL: 'America/New_York',
  IAD: 'America/New_York',
  DCA: 'America/New_York',
  ATL: 'America/New_York',
  CLT: 'America/New_York',
  ORD: 'America/Chicago',
  MDW: 'America/Chicago',
  IAH: 'America/Chicago',
  HOU: 'America/Chicago',
  DFW: 'America/Chicago',
  MSP: 'America/Chicago',
  DEN: 'America/Denver',
  SLC: 'America/Denver',
  PHX: 'America/Phoenix',
  LAS: 'America/Los_Angeles',
  LAX: 'America/Los_Angeles',
  SFO: 'America/Los_Angeles',
  SAN: 'America/Los_Angeles',
  SEA: 'America/Los_Angeles',
  PDX: 'America/Los_Angeles',
  HNL: 'Pacific/Honolulu',
  YYZ: 'America/Toronto',
  YVR: 'America/Vancouver',
  YUL: 'America/Toronto',
  YYC: 'America/Edmonton',

  // Europa
  MAD: 'Europe/Madrid',
  BCN: 'Europe/Madrid',
  PMI: 'Europe/Madrid',
  AGP: 'Europe/Madrid',
  VLC: 'Europe/Madrid',
  SVQ: 'Europe/Madrid',
  IBZ: 'Europe/Madrid',
  LIS: 'Europe/Lisbon',
  OPO: 'Europe/Lisbon',
  FAO: 'Europe/Lisbon',
  FCO: 'Europe/Rome',
  CIA: 'Europe/Rome',
  MXP: 'Europe/Rome',
  LIN: 'Europe/Rome',
  BGY: 'Europe/Rome',
  VCE: 'Europe/Rome',
  FLR: 'Europe/Rome',
  NAP: 'Europe/Rome',
  CDG: 'Europe/Paris',
  ORY: 'Europe/Paris',
  NCE: 'Europe/Paris',
  LYS: 'Europe/Paris',
  LHR: 'Europe/London',
  LGW: 'Europe/London',
  STN: 'Europe/London',
  LTN: 'Europe/London',
  MAN: 'Europe/London',
  EDI: 'Europe/London',
  DUB: 'Europe/Dublin',
  AMS: 'Europe/Amsterdam',
  FRA: 'Europe/Berlin',
  MUC: 'Europe/Berlin',
  BER: 'Europe/Berlin',
  DUS: 'Europe/Berlin',
  HAM: 'Europe/Berlin',
  ZRH: 'Europe/Zurich',
  GVA: 'Europe/Zurich',
  VIE: 'Europe/Vienna',
  BRU: 'Europe/Brussels',
  CPH: 'Europe/Copenhagen',
  OSL: 'Europe/Oslo',
  ARN: 'Europe/Stockholm',
  HEL: 'Europe/Helsinki',
  WAW: 'Europe/Warsaw',
  PRG: 'Europe/Prague',
  BUD: 'Europe/Budapest',
  ATH: 'Europe/Athens',
  IST: 'Europe/Istanbul',
  SAW: 'Europe/Istanbul',

  // Medio Oriente y Asia
  DXB: 'Asia/Dubai',
  DOH: 'Asia/Qatar',
  AUH: 'Asia/Dubai',
  TLV: 'Asia/Jerusalem',
  CAI: 'Africa/Cairo',
  AMM: 'Asia/Amman',
  JED: 'Asia/Riyadh',
  RUH: 'Asia/Riyadh',
  NRT: 'Asia/Tokyo',
  HND: 'Asia/Tokyo',
  KIX: 'Asia/Tokyo',
  ICN: 'Asia/Seoul',
  GMP: 'Asia/Seoul',
  PEK: 'Asia/Shanghai',
  PKX: 'Asia/Shanghai',
  PVG: 'Asia/Shanghai',
  SHA: 'Asia/Shanghai',
  HKG: 'Asia/Hong_Kong',
  TPE: 'Asia/Taipei',
  SIN: 'Asia/Singapore',
  BKK: 'Asia/Bangkok',
  DMK: 'Asia/Bangkok',
  HKT: 'Asia/Bangkok',
  KUL: 'Asia/Kuala_Lumpur',
  DPS: 'Asia/Makassar',
  CGK: 'Asia/Jakarta',
  MNL: 'Asia/Manila',
  DEL: 'Asia/Kolkata',
  BOM: 'Asia/Kolkata',

  // Oceanía y África
  SYD: 'Australia/Sydney',
  MEL: 'Australia/Melbourne',
  BNE: 'Australia/Brisbane',
  PER: 'Australia/Perth',
  AKL: 'Pacific/Auckland',
  CHC: 'Pacific/Auckland',
  PPT: 'Pacific/Tahiti',
  NAN: 'Pacific/Fiji',
  JNB: 'Africa/Johannesburg',
  CPT: 'Africa/Johannesburg',
  NBO: 'Africa/Nairobi',
  CMN: 'Africa/Casablanca',
};

/**
 * Obtiene la zona horaria IANA para un código IATA.
 * Si no la encuentra, usa 'America/Argentina/Buenos_Aires' como default operativo de la agencia.
 */
export function getAirportTimezone(iata?: string | null): string {
  if (!iata) return 'America/Argentina/Buenos_Aires';
  const code = iata.trim().toUpperCase();
  return AIRPORT_TIMEZONES[code] || 'America/Argentina/Buenos_Aires';
}

/**
 * Convierte una fecha y hora local de aeropuerto a su instante exacto en UTC.
 */
export function convertLocalToUtc(
  localDateOrStr: Date | string | undefined | null,
  iata?: string | null
): { utcDate: Date | null; isoUtc: string | null; timezone: string } {
  const timezone = getAirportTimezone(iata);
  if (!localDateOrStr) {
    return { utcDate: null, isoUtc: null, timezone };
  }

  let year: number;
  let month: number;
  let day: number;
  let hour: number;
  let minute: number;

  if (typeof localDateOrStr === 'string') {
    // Acepta formatos "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD HH:mm", etc.
    const match = localDateOrStr.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
    if (!match) {
      return { utcDate: null, isoUtc: null, timezone };
    }
    year = parseInt(match[1], 10);
    month = parseInt(match[2], 10);
    day = parseInt(match[3], 10);
    hour = match[4] ? parseInt(match[4], 10) : 0;
    minute = match[5] ? parseInt(match[5], 10) : 0;
  } else if (localDateOrStr instanceof Date && !isNaN(localDateOrStr.getTime())) {
    year = localDateOrStr.getFullYear();
    month = localDateOrStr.getMonth() + 1;
    day = localDateOrStr.getDate();
    hour = localDateOrStr.getHours();
    minute = localDateOrStr.getMinutes();
  } else {
    return { utcDate: null, isoUtc: null, timezone };
  }

  const guessUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(guessUtc);
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
    const tzYear = getPart('year');
    const tzMonth = getPart('month');
    const tzDay = getPart('day');
    let tzHour = getPart('hour');
    if (tzHour === 24) tzHour = 0;
    const tzMinute = getPart('minute');

    const tzAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0);
    const offsetMs = tzAsUtc - guessUtc.getTime();

    const utcDate = new Date(guessUtc.getTime() - offsetMs);
    return {
      utcDate,
      isoUtc: utcDate.toISOString(),
      timezone,
    };
  } catch {
    return {
      utcDate: guessUtc,
      isoUtc: guessUtc.toISOString(),
      timezone,
    };
  }
}
