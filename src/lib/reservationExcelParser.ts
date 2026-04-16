import * as XLSX from 'xlsx';

// Estructura de cada servicio dentro de una reserva legada
export interface LegacyService {
  operatorName: string; // NOM_OPE (TTS, ASSIST CARD, etc.)
  saleArs: number;      // VENTA
  costArs: number;      // COSTO
  saleUsd: number;      // VENTAUS
  costUsd: number;      // COSTOUS
  paymentsArs: number;  // PAGOS
  paymentsUsd: number;  // PAGOSUS
  receivedArs: number;  // COBROS
  receivedUsd: number;  // COBROSUS
}

export interface ParsedLegacyReservation {
  legacyId: string;
  clientLastName: string;     // NOM_CLI
  clientFirstName: string;    // NOMBRE (puede venir vacío)
  openDate: string | null;    // FEC_APE
  travelDate: string | null;  // FEC_SAL
  agent: string;              // NOM_USU
  destination: string;        // DETALLE_VIAJE
  numPax: number;             // NUM_PAX
  services: LegacyService[];
  totals: {
    saleArs: number;
    costArs: number;
    saleUsd: number;
    costUsd: number;
  };
}

const num = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/,/g, '').trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

const parseDate = (v: unknown): string | null => {
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = str(v);
  if (!s) return null;
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const n = Number(s);
  if (Number.isFinite(n) && n > 25000 && n < 60000) {
    const date = XLSX.SSF.parse_date_code(n);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  return null;
};

// Normaliza un nombre de header: trim, lowercase, sin acentos, sin separadores
const normHeader = (s: string): string =>
  s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

// Sinónimos posibles del campo ID_RES
const ID_RES_SYNONYMS = new Set(['idres', 'idreserva', 'nroreserva', 'noreserva', 'nreserva', 'numreserva']);

// Reconstruye el !ref real escaneando celdas (algunos exports legados solo declaran "A1")
function fixSheetRef(sheet: XLSX.WorkSheet): void {
  const cellKeys = Object.keys(sheet).filter(k => !k.startsWith('!'));
  if (!cellKeys.length) return;
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const k of cellKeys) {
    const decoded = XLSX.utils.decode_cell(k);
    if (decoded.r < minR) minR = decoded.r;
    if (decoded.r > maxR) maxR = decoded.r;
    if (decoded.c < minC) minC = decoded.c;
    if (decoded.c > maxC) maxC = decoded.c;
  }
  if (minR === Infinity) return;
  sheet['!ref'] = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
}

// Busca, dentro de las primeras N filas, la fila que contiene ID_RES y devuelve su índice (0-based) + el mapeo de headers
function detectHeaderRow(sheet: XLSX.WorkSheet, maxScan = 10): { rowIdx: number; headers: string[] } | null {
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false }) as unknown[][];
  const limit = Math.min(maxScan, aoa.length);
  for (let i = 0; i < limit; i++) {
    const row = aoa[i] || [];
    const normalized = row.map(c => normHeader(String(c ?? '')));
    if (normalized.some(n => n === 'idres' || ID_RES_SYNONYMS.has(n))) {
      return { rowIdx: i, headers: row.map(c => String(c ?? '').trim()) };
    }
  }
  return null;
}

export interface ParseDiagnostics {
  sheetsDetected: string[];
  sheetUsed?: string;
  headerRowIndex?: number;
  headersDetected?: string[];
  rowsRead: number;
}

export interface ParseResult {
  reservations: ParsedLegacyReservation[];
  totalRows: number;
  errors: string[];
  diagnostics: ParseDiagnostics;
}

export async function parseReservationsExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const errors: string[] = [];
  const diagnostics: ParseDiagnostics = {
    sheetsDetected: workbook.SheetNames,
    rowsRead: 0,
  };

  // Probar todas las hojas hasta encontrar una con ID_RES
  let chosen: { name: string; rows: Record<string, unknown>[]; headerRow: number; headers: string[] } | null = null;
  const headerSamples: { sheet: string; headers: string[] }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    fixSheetRef(sheet);
    const detected = detectHeaderRow(sheet);
    if (!detected) {
      // Capturar muestra para diagnóstico
      const sample = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false }) as unknown[][];
      headerSamples.push({ sheet: sheetName, headers: (sample[0] || []).map(c => String(c ?? '').trim()).slice(0, 30) });
      continue;
    }
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      range: detected.rowIdx,
      blankrows: false,
    });
    if (rows.length) {
      chosen = { name: sheetName, rows, headerRow: detected.rowIdx, headers: detected.headers };
      break;
    }
    headerSamples.push({ sheet: sheetName, headers: detected.headers });
  }

  if (!chosen) {
    diagnostics.headersDetected = headerSamples.flatMap(s => [`[${s.sheet}] ${s.headers.join(' | ')}`]);
    return { reservations: [], totalRows: 0, errors, diagnostics };
  }

  diagnostics.sheetUsed = chosen.name;
  diagnostics.headerRowIndex = chosen.headerRow;
  diagnostics.headersDetected = chosen.headers;
  diagnostics.rowsRead = chosen.rows.length;

  // Construir un getter por sinónimos de header
  const get = (row: Record<string, unknown>, ...candidates: string[]): unknown => {
    for (const c of candidates) {
      if (c in row && row[c] !== '' && row[c] !== null && row[c] !== undefined) return row[c];
    }
    // Fallback case-insensitive normalizado
    const normMap = new Map<string, unknown>();
    for (const k of Object.keys(row)) normMap.set(normHeader(k), row[k]);
    for (const c of candidates) {
      const v = normMap.get(normHeader(c));
      if (v !== undefined && v !== '') return v;
    }
    return '';
  };

  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of chosen.rows) {
    const idRaw = get(row, 'ID_RES', 'id_res', 'IdRes', 'NRO_RES', 'NUM_RES');
    const id = str(idRaw);
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(row);
  }

  const reservations: ParsedLegacyReservation[] = [];
  for (const [legacyId, groupRows] of groups) {
    const first = groupRows[0];
    const services: LegacyService[] = groupRows.map(r => ({
      operatorName: str(get(r, 'NOM_OPE')),
      saleArs: num(get(r, 'VENTA')),
      costArs: num(get(r, 'COSTO')),
      saleUsd: num(get(r, 'VENTAUS')),
      costUsd: num(get(r, 'COSTOUS')),
      paymentsArs: num(get(r, 'PAGOS')),
      paymentsUsd: num(get(r, 'PAGOSUS')),
      receivedArs: num(get(r, 'COBROS')),
      receivedUsd: num(get(r, 'COBROSUS')),
    })).filter(s => s.operatorName || s.saleArs || s.costArs || s.saleUsd || s.costUsd);

    const totals = services.reduce(
      (acc, s) => ({
        saleArs: acc.saleArs + s.saleArs,
        costArs: acc.costArs + s.costArs,
        saleUsd: acc.saleUsd + s.saleUsd,
        costUsd: acc.costUsd + s.costUsd,
      }),
      { saleArs: 0, costArs: 0, saleUsd: 0, costUsd: 0 }
    );

    reservations.push({
      legacyId,
      clientLastName: str(get(first, 'NOM_CLI')),
      clientFirstName: str(get(first, 'NOMBRE')),
      openDate: parseDate(get(first, 'FEC_APE')),
      travelDate: parseDate(get(first, 'FEC_SAL')),
      agent: str(get(first, 'NOM_USU')),
      destination: str(get(first, 'DETALLE_VIAJE')),
      numPax: Math.max(1, Math.round(num(get(first, 'NUM_PAX'))) || 1),
      services,
      totals,
    });
  }

  reservations.sort((a, b) => a.legacyId.localeCompare(b.legacyId, undefined, { numeric: true }));

  console.log('[parseReservationsExcel] diagnostics:', diagnostics, 'grouped reservations:', reservations.length);

  return { reservations, totalRows: chosen.rows.length, errors, diagnostics };
}

// Construye el texto de notas con el detalle de servicios (para guardar en `notes`)
export function buildLegacyNotes(r: ParsedLegacyReservation): string {
  const lines: string[] = [];
  lines.push(`Importado del sistema antiguo (Nº ${r.legacyId})`);
  if (r.agent) lines.push(`Vendedor: ${r.agent}`);
  if (r.destination) lines.push(`Destino: ${r.destination}`);
  if (r.openDate) lines.push(`Apertura: ${r.openDate}`);
  if (r.travelDate) lines.push(`Salida: ${r.travelDate}`);
  lines.push(`Pasajeros: ${r.numPax}`);
  lines.push('');
  lines.push('SERVICIOS:');
  for (const s of r.services) {
    const parts: string[] = [`• ${s.operatorName || '(sin proveedor)'}`];
    if (s.saleArs || s.costArs) parts.push(`ARS venta ${s.saleArs.toLocaleString('es-AR')} / costo ${s.costArs.toLocaleString('es-AR')}`);
    if (s.saleUsd || s.costUsd) parts.push(`USD venta ${s.saleUsd.toLocaleString('es-AR')} / costo ${s.costUsd.toLocaleString('es-AR')}`);
    lines.push(parts.join(' — '));
  }
  lines.push('');
  lines.push('TOTALES:');
  if (r.totals.saleArs || r.totals.costArs) {
    lines.push(`ARS: venta ${r.totals.saleArs.toLocaleString('es-AR')} / costo ${r.totals.costArs.toLocaleString('es-AR')}`);
  }
  if (r.totals.saleUsd || r.totals.costUsd) {
    lines.push(`USD: venta ${r.totals.saleUsd.toLocaleString('es-AR')} / costo ${r.totals.costUsd.toLocaleString('es-AR')}`);
  }
  return lines.join('\n');
}

export const normalizeName = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
