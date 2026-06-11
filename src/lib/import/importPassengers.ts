import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

export interface PassengerImportRow {
  legacyFileId: string;
  name: string;
  birth_date: string;
  nationality: string;
  dni: string;
  occupation: string;
  iva_condition: string;
  cuil_cuit: string;
  resolvedFileId?: string | null;
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
  const s = String(val).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parts = s.split('/');
  if (parts.length === 3) {
    let [d, m, y] = parts.map(Number);
    if (y < 100) y += y <= 30 ? 2000 : 1900;
    if (y < 1900 || y > 2100) return '';
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return '';
}

export function parsePassengers(rows: Record<string, unknown>[]): PassengerImportRow[] {
  return rows.map(r => {
    const apellido = clean(get(r, 'APELLIDOPA', 'apellidopa', 'NOMBRE'));
    const nombre = clean(get(r, 'NOMBREPAX', 'nombrepax', 'NOMB1'));
    const name = [apellido, nombre].filter(Boolean).join(' ');

    const tipoDoc = clean(get(r, 'TIPODOC', 'tipodoc'));
    const nroDoc = clean(get(r, 'NRODOC', 'nrodoc', 'DOCUMENTO', 'documento'));
    const dni = nroDoc;

    return {
      legacyFileId: clean(get(r, 'ID_RES', 'id_res')),
      name,
      birth_date: parseDate(get(r, 'FECHANAC', 'fechanac', 'FEC_NAC')),
      nationality: clean(get(r, 'NACIONAL', 'nacional', 'NACIONALIDAD')),
      dni,
      occupation: clean(get(r, 'OCUPACIO', 'ocupacio', 'OCUPACION')),
      iva_condition: clean(get(r, 'CONDIVA_', 'condiva_')),
      cuil_cuit: clean(get(r, 'CUIT_', 'cuit_')),
    };
  }).filter(p => p.name.trim().length > 0 && p.legacyFileId);
}

export interface PassengerImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Resuelve legacy_id de expedientes a file IDs reales.
 */
export async function enrichPassengers(
  passengers: PassengerImportRow[],
  agencyId: string | null,
): Promise<PassengerImportRow[]> {
  const legacyIds = [...new Set(passengers.map(p => p.legacyFileId))];
  const fileMap = new Map<string, string>();

  // Buscar en lotes
  const BATCH = 200;
  for (let i = 0; i < legacyIds.length; i += BATCH) {
    const batch = legacyIds.slice(i, i + BATCH);
    let query = supabase
      .from('files')
      .select('id, legacy_id')
      .in('legacy_id', batch);
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data } = await query;
    (data || []).forEach((f: any) => {
      if (f.legacy_id) fileMap.set(String(f.legacy_id), f.id);
    });
  }

  return passengers.map(p => ({
    ...p,
    resolvedFileId: fileMap.get(p.legacyFileId) || null,
  }));
}

export async function insertPassengers(
  passengers: PassengerImportRow[],
  userId: string,
  agencyId: string | null,
  onProgress: (current: number, total: number) => void,
): Promise<PassengerImportResult> {
  const valid = passengers.filter(p => p.resolvedFileId);
  const result: PassengerImportResult = {
    imported: 0,
    skipped: passengers.length - valid.length,
    errors: [],
  };

  // 1. Cargar todos los clientes del CRM de la agencia actual en memoria de manera paginada
  const clients: { id: string; name: string; dni: string | null }[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    let query = supabase.from('clients').select('id, name, dni');
    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }
    const { data } = await query.range(from, from + PAGE - 1);
    const batch = data || [];
    clients.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  // 2. Normalizar nombres y DNI para matchear eficientemente en memoria
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const byName = new Map<string, string>();
  const byDni = new Map<string, string>();
  for (const c of clients) {
    const n = norm(c.name || '');
    if (n && !byName.has(n)) byName.set(n, c.id);
    const d = (c.dni || '').trim();
    if (d && !byDni.has(d)) byDni.set(d, c.id);
  }

  // 3. Agrupar pasajeros que no existen como clientes en el CRM
  const clientsToCreateMap = new Map<string, {
    name: string;
    dni: string | null;
    birth_date: string | null;
    nationality: string | null;
    occupation: string | null;
    iva_condition: string | null;
    cuil_cuit: string | null;
  }>();

  for (const p of valid) {
    const passengerDni = (p.dni || '').trim();
    const passengerNameNorm = norm(p.name || '');
    
    let matchedClientId = passengerDni ? byDni.get(passengerDni) : null;
    if (!matchedClientId && passengerNameNorm) {
      matchedClientId = byName.get(passengerNameNorm);
    }

    if (!matchedClientId) {
      // Clave única para evitar duplicar el mismo cliente en este mismo lote de pasajeros
      const key = passengerDni ? `dni:${passengerDni}` : `name:${passengerNameNorm}`;
      if (!clientsToCreateMap.has(key)) {
        clientsToCreateMap.set(key, {
          name: p.name,
          dni: p.dni || null,
          birth_date: p.birth_date || null,
          nationality: p.nationality || null,
          occupation: p.occupation || null,
          iva_condition: p.iva_condition || null,
          cuil_cuit: p.cuil_cuit || null,
        });
      }
    }
  }

  // 4. Crear clientes en lote
  const newClientsList = Array.from(clientsToCreateMap.values());
  if (newClientsList.length > 0) {
    const CLIENT_BATCH = 200;
    for (let j = 0; j < newClientsList.length; j += CLIENT_BATCH) {
      const clientBatch = newClientsList.slice(j, j + CLIENT_BATCH).map(c => ({
        user_id: userId,
        agency_id: agencyId,
        name: c.name,
        dni: c.dni,
        birth_date: c.birth_date,
        nationality: c.nationality,
        occupation: c.occupation,
        iva_condition: c.iva_condition,
        cuil_cuit: c.cuil_cuit,
      }));
      const { data, error } = await supabase.from('clients').insert(clientBatch as any).select('id, name, dni');
      if (error) {
        result.errors.push(`Error creando clientes en lote ${Math.floor(j / CLIENT_BATCH) + 1}: ${error.message}`);
      } else if (data) {
        for (const created of data) {
          const n = norm(created.name || '');
          if (n && !byName.has(n)) byName.set(n, created.id);
          const d = (created.dni || '').trim();
          if (d && !byDni.has(d)) byDni.set(d, created.id);
        }
      }
    }
  }

  // 5. Insertar pasajeros en file_passengers vinculando su client_id
  const BATCH = 100;
  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH).map(p => {
      const passengerDni = (p.dni || '').trim();
      const passengerNameNorm = norm(p.name || '');
      let matchedClientId = passengerDni ? byDni.get(passengerDni) : null;
      if (!matchedClientId && passengerNameNorm) {
        matchedClientId = byName.get(passengerNameNorm);
      }

      return {
        user_id: userId,
        agency_id: agencyId,
        file_id: p.resolvedFileId!,
        client_id: matchedClientId || null,
        name: p.name,
        birth_date: p.birth_date || null,
        nationality: p.nationality || null,
        dni: p.dni || null,
        occupation: p.occupation || null,
        iva_condition: p.iva_condition || null,
        cuil_cuit: p.cuil_cuit || null,
      };
    });

    const { error } = await supabase.from('file_passengers').insert(batch as any);
    if (error) {
      result.errors.push(`Lote pasajeros ${Math.floor(i / BATCH) + 1}: ${error.message}`);
    } else {
      result.imported += batch.length;
    }
    onProgress(Math.min(i + BATCH, valid.length), valid.length);
  }

  return result;
}
