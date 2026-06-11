import { supabase } from '@/integrations/supabase/client';

export interface FileOperatorImportRow {
  legacyFileId: string;
  legacyOpeId: string;
  supplierName: string;
  priceArs: number;
  costArs: number;
  priceUsd: number;
  costUsd: number;
  paidArs: number;
  paidUsd: number;
  invoiceNumber: string;
  referenceNumber: string;
  resolvedFileId?: string | null;
  resolvedSupplierId?: string | null;
}

const clean = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
};

const num = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};

const get = (row: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const k of keys) {
    if (k in row && row[k] !== '' && row[k] !== null && row[k] !== undefined) return row[k];
  }
  return '';
};

export function parseFileOperators(rows: Record<string, unknown>[]): FileOperatorImportRow[] {
  return rows.map(r => ({
    legacyFileId: clean(get(r, 'ID_RES', 'id_res')),
    legacyOpeId: clean(get(r, 'ID_OPE', 'id_ope')),
    supplierName: clean(get(r, 'NOM_OPE', 'nom_ope')),
    priceArs: num(get(r, 'VENTA', 'venta')),
    costArs: num(get(r, 'COSTO', 'costo')),
    priceUsd: num(get(r, 'VENTAUS', 'ventaus')),
    costUsd: num(get(r, 'COSTOUS', 'costous')),
    paidArs: num(get(r, 'PAGOS', 'pagos')),
    paidUsd: num(get(r, 'PAGOSUS', 'pagosus')),
    invoiceNumber: clean(get(r, 'FACTURAS', 'facturas', 'FACT_COMP')),
    referenceNumber: clean(get(r, 'DETALLE', 'detalle')),
  })).filter(o => o.legacyFileId && o.supplierName);
}

export interface FileOperatorImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function enrichFileOperators(
  operators: FileOperatorImportRow[],
  agencyId: string | null,
): Promise<FileOperatorImportRow[]> {
  // Resolver legacy file IDs
  const legacyFileIds = [...new Set(operators.map(o => o.legacyFileId))];
  const fileMap = new Map<string, string>();
  const BATCH = 200;
  for (let i = 0; i < legacyFileIds.length; i += BATCH) {
    const batch = legacyFileIds.slice(i, i + BATCH);
    let query = supabase.from('files').select('id, legacy_id').in('legacy_id', batch);
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data } = await query;
    (data || []).forEach((f: any) => {
      if (f.legacy_id) fileMap.set(String(f.legacy_id), f.id);
    });
  }

  // Resolver supplier names
  const supplierNames = [...new Set(operators.map(o => o.supplierName.toLowerCase().trim()))];
  const supplierMap = new Map<string, string>();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    let query = supabase.from('suppliers').select('id, name');
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data } = await query.range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    data.forEach((s: any) => {
      if (s.name) supplierMap.set(s.name.toLowerCase().trim(), s.id);
    });
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return operators.map(o => ({
    ...o,
    resolvedFileId: fileMap.get(o.legacyFileId) || null,
    resolvedSupplierId: supplierMap.get(o.supplierName.toLowerCase().trim()) || null,
  }));
}

export async function insertFileOperators(
  operators: FileOperatorImportRow[],
  userId: string,
  agencyId: string | null,
  onProgress: (current: number, total: number) => void,
): Promise<FileOperatorImportResult> {
  const valid = operators.filter(o => o.resolvedFileId);
  const result: FileOperatorImportResult = {
    imported: 0,
    skipped: operators.length - valid.length,
    errors: [],
  };

  if (!agencyId) {
    result.errors.push('No se pudo determinar la agencia del usuario.');
    return result;
  }

  const BATCH = 100;
  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH).map(o => ({
      agency_id: agencyId,
      file_id: o.resolvedFileId!,
      supplier_id: o.resolvedSupplierId || null,
      supplier_name: o.supplierName,
      legacy_ope_id: o.legacyOpeId ? parseInt(o.legacyOpeId, 10) || null : null,
      cost_ars: o.costArs,
      price_ars: o.priceArs,
      paid_ars: o.paidArs,
      cost_usd: o.costUsd,
      price_usd: o.priceUsd,
      paid_usd: o.paidUsd,
      invoice_number: o.invoiceNumber || null,
      reference_number: o.referenceNumber || null,
    }));
    const { error } = await (supabase as any).from('file_operators').insert(batch);
    if (error) {
      result.errors.push(`Lote ${Math.floor(i / BATCH) + 1}: ${error.message}`);
    } else {
      result.imported += batch.length;
    }
    onProgress(Math.min(i + BATCH, valid.length), valid.length);
  }

  return result;
}
