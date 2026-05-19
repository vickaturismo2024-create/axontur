import * as XLSX from 'xlsx';

export type ImportType = 'clients' | 'suppliers' | 'files' | 'file_operators' | 'passengers' | 'unknown';

export interface DetectionResult {
  type: ImportType;
  confidence: 'high' | 'medium' | 'low';
  label: string;
  description: string;
  headers: string[];
  rows: Record<string, unknown>[];
  sheetName: string;
}

const LABELS: Record<ImportType, string> = {
  clients: 'Clientes',
  suppliers: 'Proveedores',
  files: 'Expedientes',
  file_operators: 'Operadores por Expediente',
  passengers: 'Pasajeros',
  unknown: 'Desconocido',
};

const DESCRIPTIONS: Record<ImportType, string> = {
  clients: 'Importa datos de clientes: nombre, contacto, documentos, dirección.',
  suppliers: 'Importa proveedores/operadores: nombre, contacto, datos fiscales.',
  files: 'Importa expedientes/reservas con servicios, cobros y pagos.',
  file_operators: 'Importa la relación operador-expediente con costos y pagos individuales.',
  passengers: 'Importa pasajeros vinculados a expedientes.',
  unknown: 'No se pudo detectar el tipo de datos.',
};

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

/**
 * Lee un archivo Excel y detecta automáticamente a qué módulo pertenece.
 */
export async function detectImportType(file: File): Promise<DetectionResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    // Corregir rango si está roto
    const cellKeys = Object.keys(ws).filter(k => !k.startsWith('!'));
    if (cellKeys.length) {
      let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
      for (const k of cellKeys) {
        const d = XLSX.utils.decode_cell(k);
        if (d.r < minR) minR = d.r;
        if (d.r > maxR) maxR = d.r;
        if (d.c < minC) minC = d.c;
        if (d.c > maxC) maxC = d.c;
      }
      if (minR !== Infinity) {
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
      }
    }

    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false }) as unknown[][];
    if (!aoa.length) continue;

    // Buscar fila de headers en las primeras 10 filas
    let headerRowIdx = 0;
    let headerRow: string[] = [];
    for (let i = 0; i < Math.min(10, aoa.length); i++) {
      const row = (aoa[i] || []).map(c => String(c ?? '').trim());
      const normed = row.map(norm);
      // Si tiene al menos 3 headers no vacíos, es candidato
      if (row.filter(Boolean).length >= 3) {
        headerRow = row;
        headerRowIdx = i;
        break;
      }
    }

    if (!headerRow.length) continue;

    const normedHeaders = new Set(headerRow.map(norm));
    const has = (...keys: string[]) => keys.every(k => normedHeaders.has(norm(k)));
    const hasAny = (...keys: string[]) => keys.some(k => normedHeaders.has(norm(k)));

    // Parse rows using detected header
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
      defval: '',
      range: headerRowIdx,
      blankrows: false,
    });

    let type: ImportType = 'unknown';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // 1. PASSENGERS — tiene APELLIDOPA o NOMBREPAX + ID_RES
    if (has('ID_RES') && hasAny('APELLIDOPA', 'NOMBREPAX')) {
      type = 'passengers';
      confidence = 'high';
    }
    // 2. FILE OPERATORS — tiene ID_RES + ID_OPE + NOM_OPE (tabla cruzada)
    else if (has('ID_RES') && hasAny('ID_OPE') && hasAny('NOM_OPE')) {
      type = 'file_operators';
      confidence = 'high';
    }
    // 3. FILES/EXPEDIENTES — tiene ID_RES + datos financieros
    else if (has('ID_RES') && hasAny('VENTA', 'COSTO', 'NOM_CLI')) {
      type = 'files';
      confidence = 'high';
    }
    // 4. SUPPLIERS — tiene NOM_OPE + DOM_OPE o TEL_OPE (sin ID_RES)
    else if (hasAny('NOM_OPE') && hasAny('DOM_OPE', 'TEL_OPE', 'NUM_IVA') && !hasAny('ID_RES')) {
      type = 'suppliers';
      confidence = 'high';
    }
    // 5. CLIENTS — tiene NOMBRE + campos de cliente
    else if (hasAny('ID_CLI', 'NOMBRE') && hasAny('TEL_PAR', 'CELULAR', 'FEC_NAC', 'DIR_CLI', 'EMAIL')) {
      type = 'clients';
      confidence = has('ID_CLI') ? 'high' : 'medium';
    }

    if (type !== 'unknown') {
      return {
        type,
        confidence,
        label: LABELS[type],
        description: DESCRIPTIONS[type],
        headers: headerRow.filter(Boolean),
        rows,
        sheetName,
      };
    }
  }

  return {
    type: 'unknown',
    confidence: 'low',
    label: LABELS.unknown,
    description: DESCRIPTIONS.unknown,
    headers: [],
    rows: [],
    sheetName: '',
  };
}

/** Orden recomendado de importación */
export const IMPORT_ORDER: { type: ImportType; label: string; step: number }[] = [
  { type: 'clients', label: '1. Clientes', step: 1 },
  { type: 'suppliers', label: '2. Proveedores', step: 2 },
  { type: 'files', label: '3. Expedientes', step: 3 },
  { type: 'passengers', label: '4. Pasajeros', step: 4 },
  { type: 'file_operators', label: '5. Operadores', step: 5 },
];
