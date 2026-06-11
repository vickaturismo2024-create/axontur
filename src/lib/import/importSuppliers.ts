import { supabase } from '@/integrations/supabase/client';

export interface SupplierImportRow {
  name: string;
  address: string;
  locality: string;
  phone: string;
  email: string;
  cuit: string;
  iva_condition: string;
  postal_code: string;
  province: string;
  is_airline: boolean;
  amadeus_code: string;
  iata_code: string;
  legal_name: string;
  website: string;
  is_active: boolean;
  notes: string;
  isDuplicate?: boolean;
}

const clean = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
};

const get = (row: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const k of keys) {
    if (k in row && row[k] !== '' && row[k] !== null && row[k] !== undefined) return row[k];
  }
  return '';
};

const toBool = (v: unknown): boolean => {
  const s = clean(v).toLowerCase();
  return s === 's' || s === 'si' || s === 'sí' || s === 'yes' || s === '1' || s === 'true';
};

export function parseSuppliers(rows: Record<string, unknown>[]): SupplierImportRow[] {
  return rows.map(r => {
    const fax = clean(get(r, 'FAX', 'fax'));
    const celular = clean(get(r, 'CELULAR', 'celular'));
    const tel = clean(get(r, 'TEL_OPE', 'tel_ope'));
    const phone = [tel, celular, fax].filter(Boolean).join(' / ');

    // DESUSO = "S" significa que está en desuso → is_active = false
    const desuso = toBool(get(r, 'DESUSO', 'desuso'));

    // Notes: combine address, locality, and detail fields since no dedicated columns
    const noteParts: string[] = [];
    const domOpe = clean(get(r, 'DOM_OPE', 'dom_ope'));
    if (domOpe) noteParts.push(`Dirección: ${domOpe}`);
    const locOpe = clean(get(r, 'LOC_OPE', 'loc_ope'));
    if (locOpe) noteParts.push(`Localidad: ${locOpe}`);
    const detalle = clean(get(r, 'DETALLE', 'detalle'));
    if (detalle) noteParts.push(`Detalle: ${detalle}`);
    const prov = clean(get(r, 'PROVINCIA', 'provincia'));
    if (prov) noteParts.push(`Provincia: ${prov}`);

    return {
      name: clean(get(r, 'NOM_OPE', 'nom_ope')),
      address: domOpe,
      locality: clean(get(r, 'LOC_OPE', 'loc_ope')),
      phone,
      email: clean(get(r, 'EMAIL', 'email')),
      cuit: clean(get(r, 'NUM_IVA', 'num_iva')),
      iva_condition: clean(get(r, 'ID_IVA', 'id_iva')),
      postal_code: clean(get(r, 'POSTAL', 'postal')),
      province: clean(get(r, 'PROVINCIA', 'provincia')),
      is_airline: toBool(get(r, 'AEREO', 'aereo')),
      amadeus_code: clean(get(r, 'AMADEUS', 'amadeus')),
      iata_code: clean(get(r, 'CODIGOAER', 'codigoaer')),
      legal_name: clean(get(r, 'RAZON', 'razon')),
      website: clean(get(r, 'WEBSITE', 'website')),
      is_active: !desuso,
      notes: noteParts.join('\n'),
    };
  }).filter(s => s.name.trim().length > 0);
}

export interface SupplierImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function enrichSuppliers(
  suppliers: SupplierImportRow[],
  agencyId: string | null,
): Promise<SupplierImportRow[]> {
  const existingNames = new Set<string>();
  const existingCuits = new Set<string>();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    let query = supabase.from('suppliers').select('name, cuit');
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data } = await query.range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    data.forEach((s: any) => {
      if (s.name) existingNames.add(s.name.toLowerCase().trim());
      if (s.cuit) existingCuits.add(s.cuit.trim());
    });
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return suppliers.map(s => ({
    ...s,
    isDuplicate: existingNames.has(s.name.toLowerCase().trim()) ||
                 (!!s.cuit && existingCuits.has(s.cuit.trim())),
  }));
}

export async function insertSuppliers(
  suppliers: SupplierImportRow[],
  userId: string,
  agencyId: string | null,
  onProgress: (current: number, total: number) => void,
): Promise<SupplierImportResult> {
  const toInsert = suppliers.filter(s => !s.isDuplicate);
  const result: SupplierImportResult = { imported: 0, skipped: suppliers.length - toInsert.length, errors: [] };

  const BATCH = 100;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH).map(s => ({
      user_id: userId,
      agency_id: agencyId,
      name: s.name,
      phone: s.phone,
      email: s.email,
      type: s.is_airline ? 'Aerolínea' : '',
      notes: s.notes,
      cuit: s.cuit || null,
      iva_condition: s.iva_condition || null,
      postal_code: s.postal_code || null,
      province: s.province || null,
      is_airline: s.is_airline,
      amadeus_code: s.amadeus_code || null,
      iata_code: s.iata_code || null,
      legal_name: s.legal_name || null,
      website: s.website || null,
      is_active: s.is_active,
    }));
    const { error } = await supabase.from('suppliers').insert(batch as any);
    if (error) {
      result.errors.push(`Lote ${Math.floor(i / BATCH) + 1}: ${error.message}`);
    } else {
      result.imported += batch.length;
    }
    onProgress(Math.min(i + BATCH, toInsert.length), toInsert.length);
  }

  return result;
}
