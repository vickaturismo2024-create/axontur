import * as XLSX from 'xlsx';

export interface PassengerExportRow {
  name: string;
  dni?: string | null;
  passport?: string | null;
  passport_expiry?: string | null;
  birth_date?: string | null;
  nationality?: string | null;
  notes?: string | null;
}

export function exportPassengersToExcel(passengers: PassengerExportRow[], filename = 'pasajeros.xlsx') {
  const rows = passengers.map(p => ({
    Nombre: p.name || '',
    DNI: p.dni || '',
    Pasaporte: p.passport || '',
    'Vto. Pasaporte': p.passport_expiry || '',
    'Fecha Nac.': p.birth_date || '',
    Nacionalidad: p.nationality || '',
    Notas: p.notes || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pasajeros');
  XLSX.writeFile(wb, filename);
}
