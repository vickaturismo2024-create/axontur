import ExcelJS from 'exceljs';

export interface PassengerExportRow {
  name: string;
  dni?: string | null;
  passport?: string | null;
  passport_expiry?: string | null;
  birth_date?: string | null;
  nationality?: string | null;
  notes?: string | null;
}

export async function exportPassengersToExcel(
  passengers: PassengerExportRow[],
  filename = 'pasajeros.xlsx',
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Pasajeros');

  ws.columns = [
    { header: 'Nombre',        key: 'Nombre',          width: 29 },
    { header: 'DNI',           key: 'DNI',             width: 15 },
    { header: 'Pasaporte',     key: 'Pasaporte',       width: 17 },
    { header: 'Vto. Pasaporte',key: 'VtoPasaporte',    width: 15 },
    { header: 'Fecha Nac.',    key: 'FechaNac',        width: 15 },
    { header: 'Nacionalidad',  key: 'Nacionalidad',    width: 19 },
    { header: 'Notas',         key: 'Notas',           width: 31 },
  ];

  passengers.forEach(p => {
    ws.addRow({
      Nombre:        p.name             || '',
      DNI:           p.dni              || '',
      Pasaporte:     p.passport         || '',
      VtoPasaporte:  p.passport_expiry  || '',
      FechaNac:      p.birth_date       || '',
      Nacionalidad:  p.nationality      || '',
      Notas:         p.notes            || '',
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = filename;
  a.click();
  URL.revokeObjectURL(url);
}
