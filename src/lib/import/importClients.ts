import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

export interface ClientImportRow {
  legacy_id: number | null;
  name: string;
  email: string;
  phone: string;
  phone_work: string;
  phone_mobile: string;
  address: string;
  address_work: string;
  nationality: string;
  birth_date: string;
  dni: string;
  dni_expiry: string;
  passport: string;
  passport_issue: string;
  passport_expiry: string;
  locality: string;
  cuil_cuit: string;
  sex: string;
  company_name: string;
  civil_status: string;
  occupation: string;
  postal_code: string;
  referred_by: string;
  category: string;
  iva_condition: string;
  isDuplicate?: boolean;
}

const clean = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};

function parseDate(val: unknown): string {
  if (!val && val !== 0) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    if (y < 1900 || y > 2100) return '';
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'number') {
    if (val <= 366 || val > 60000) return '';
    const d = XLSX.SSF.parse_date_code(val);
    if (!d || d.y < 1900) return '';
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim().replace(/\s+\d{2}:\d{2}(:\d{2})?$/, '');
  if (!s || s === '01/01/00' || s === '1/1/00') return '';
  // ISO
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // dd/mm/yyyy
  const parts = s.split('/');
  if (parts.length === 3) {
    let [d, m, y] = parts.map(Number);
    if (y < 100) y += y <= 30 ? 2000 : 1900;
    if (y < 1900 || y > 2100) return '';
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return '';
}

const get = (row: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const k of keys) {
    if (k in row && row[k] !== '' && row[k] !== null && row[k] !== undefined) return row[k];
  }
  return '';
};

/**
 * Parsea las filas del Excel de clientes del sistema viejo.
 */
export function parseClients(rows: Record<string, unknown>[]): ClientImportRow[] {
  return rows.map(r => {
    const apellido = clean(get(r, 'NOMBRE', 'nombre', 'APELLIDO', 'apellido'));
    const nombre2 = clean(get(r, 'NOMBRE2', 'nombre2', 'NOMBRE_2'));
    const name = nombre2 ? `${apellido} ${nombre2}` : apellido;

    // Documento: puede venir como TIPO + NUMERO o como NRO_DOC / DNI
    const tipoDoc = clean(get(r, 'TIPO', 'tipo'));
    const nroDoc = clean(get(r, 'NUMERO', 'numero', 'NRO_DOC', 'DNI', 'dni'));
    const dni = tipoDoc && nroDoc ? `${nroDoc}` : nroDoc;

    // Pasaporte
    const tipoPas = clean(get(r, 'TIPO1', 'tipo1'));
    const nroPas = clean(get(r, 'NUMERO1', 'numero1', 'NRO_PASAPORTE', 'PASAPORTE', 'pasaporte'));
    const passport = nroPas;

    return {
      legacy_id: num(get(r, 'ID_CLI', 'id_cli')),
      name,
      email: clean(get(r, 'EMAIL', 'email', 'E-MAIL')),
      phone: clean(get(r, 'TEL_PAR', 'tel_par')),
      phone_work: clean(get(r, 'TEL_COM', 'tel_com')),
      phone_mobile: clean(get(r, 'CELULAR', 'celular')),
      address: clean(get(r, 'DIR_CLI', 'DIRECCIÓN', 'DIRECCION', 'direccion')),
      address_work: clean(get(r, 'DIR_COM', 'dir_com')),
      nationality: clean(get(r, 'NACIONALIDAD', 'nacionalidad')),
      birth_date: parseDate(get(r, 'FEC_NAC', 'F_NACIMIENTO', 'FECHA DE NACIMIENTO', 'fecha_nacimiento')),
      dni,
      dni_expiry: parseDate(get(r, 'VTO_DOC', 'vto_doc', 'VTO_DNI')),
      passport,
      passport_issue: parseDate(get(r, 'EMI_PAS', 'FEC_EMI', 'F_EMISION_PAS', 'EMISIÓN_PAS', 'EMISIÓN PASAPORTE')),
      passport_expiry: parseDate(get(r, 'VEN_PAS', 'FEC_VTO', 'VTO_PAS', 'VENCIMIENTO PASAPORTE')),
      locality: clean(get(r, 'LOCALIDAD', 'localidad')),
      cuil_cuit: clean(get(r, 'NUM_IVA', 'CUIL/CUIT', 'CUIL', 'CUIT', 'cuil_cuit')),
      sex: clean(get(r, 'SEXO', 'sexo')).charAt(0).toUpperCase(),
      company_name: clean(get(r, 'RAZON', 'razon')),
      civil_status: clean(get(r, 'CIVIL', 'civil')),
      occupation: clean(get(r, 'OCUPACION', 'ocupacion')),
      postal_code: clean(get(r, 'POSTAL', 'postal')),
      referred_by: clean(get(r, 'PROMOTOR', 'promotor')),
      category: clean(get(r, 'ID_CAT', 'id_cat')),
      iva_condition: clean(get(r, 'ID_IVA', 'id_iva')),
    };
  }).filter(c => c.name.trim().length > 0);
}

export interface ClientImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Marca duplicados comparando con legacy_id o DNI existentes.
 */
export async function enrichClients(
  clients: ClientImportRow[],
  userId: string,
): Promise<ClientImportRow[]> {
  // Cargar legacy_ids existentes
  const existingLegacy = new Set<number>();
  const existingDnis = new Set<string>();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await supabase
      .from('clients')
      .select('legacy_id, dni')
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    data.forEach((c: any) => {
      if (c.legacy_id) existingLegacy.add(Number(c.legacy_id));
      if (c.dni) existingDnis.add(c.dni);
    });
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return clients.map(c => ({
    ...c,
    isDuplicate: (c.legacy_id !== null && existingLegacy.has(c.legacy_id)) ||
                 (!!c.dni && existingDnis.has(c.dni)),
  }));
}

/**
 * Inserta clientes en lotes, omitiendo duplicados.
 */
export async function insertClients(
  clients: ClientImportRow[],
  userId: string,
  agencyId: string | null,
  onProgress: (current: number, total: number) => void,
): Promise<ClientImportResult> {
  const toInsert = clients.filter(c => !c.isDuplicate);
  const result: ClientImportResult = { imported: 0, skipped: clients.length - toInsert.length, errors: [] };

  const BATCH = 200;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH).map(c => {
      const obj: Record<string, unknown> = {
        user_id: userId,
        agency_id: agencyId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        phone_work: c.phone_work,
        phone_mobile: c.phone_mobile,
        address: c.address,
        address_work: c.address_work || null,
        nationality: c.nationality,
        birth_date: c.birth_date || null,
        dni: c.dni,
        dni_expiry: c.dni_expiry || null,
        passport: c.passport,
        passport_issue: c.passport_issue || null,
        passport_expiry: c.passport_expiry || null,
        locality: c.locality,
        cuil_cuit: c.cuil_cuit,
        sex: c.sex,
        company_name: c.company_name || null,
        civil_status: c.civil_status || null,
        occupation: c.occupation || null,
        postal_code: c.postal_code || null,
        referred_by: c.referred_by || null,
        category: c.category || null,
        iva_condition: c.iva_condition || null,
      };
      if (c.legacy_id !== null) obj.legacy_id = c.legacy_id;
      return obj;
    });
    const { error } = await supabase.from('clients').insert(batch as any);
    if (error) {
      result.errors.push(`Lote ${Math.floor(i / BATCH) + 1}: ${error.message}`);
    } else {
      result.imported += batch.length;
    }
    onProgress(Math.min(i + BATCH, toInsert.length), toInsert.length);
  }

  return result;
}
