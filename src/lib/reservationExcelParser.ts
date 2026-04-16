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
  return String(v).trim();
};

const parseDate = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  // Formato esperado: "2025-07-28 10:42:49" o "2026-04-27 00:00:00"
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  // Excel serial?
  const n = Number(s);
  if (Number.isFinite(n) && n > 25000 && n < 60000) {
    const date = XLSX.SSF.parse_date_code(n);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  return null;
};

export interface ParseResult {
  reservations: ParsedLegacyReservation[];
  totalRows: number;
  errors: string[];
}

export async function parseReservationsExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const errors: string[] = [];
  const groups = new Map<string, Record<string, unknown>[]>();

  for (const row of rows) {
    const id = str(row['ID_RES']);
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(row);
  }

  const reservations: ParsedLegacyReservation[] = [];
  for (const [legacyId, groupRows] of groups) {
    const first = groupRows[0];
    const services: LegacyService[] = groupRows.map(r => ({
      operatorName: str(r['NOM_OPE']),
      saleArs: num(r['VENTA']),
      costArs: num(r['COSTO']),
      saleUsd: num(r['VENTAUS']),
      costUsd: num(r['COSTOUS']),
      paymentsArs: num(r['PAGOS']),
      paymentsUsd: num(r['PAGOSUS']),
      receivedArs: num(r['COBROS']),
      receivedUsd: num(r['COBROSUS']),
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
      clientLastName: str(first['NOM_CLI']),
      clientFirstName: str(first['NOMBRE']),
      openDate: parseDate(first['FEC_APE']),
      travelDate: parseDate(first['FEC_SAL']),
      agent: str(first['NOM_USU']),
      destination: str(first['DETALLE_VIAJE']),
      numPax: Math.max(1, Math.round(num(first['NUM_PAX'])) || 1),
      services,
      totals,
    });
  }

  reservations.sort((a, b) => a.legacyId.localeCompare(b.legacyId, undefined, { numeric: true }));

  return { reservations, totalRows: rows.length, errors };
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
