import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ClientRecord, emptyClient } from './ClientFormDialog';

function parseExcelDate(val: any): string {
  if (!val && val !== 0) return '';
  if (typeof val === 'number') {
    // Excel serial date: 1 = 1900-01-01, treat <=366 as placeholder "sin dato"
    if (val <= 366) return '';
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return '';
    const y = d.y, m = d.m, day = d.d;
    if (y < 1950 || (y === 2000 && m === 1 && day === 1)) return '';
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const s = String(val).trim().replace(/\s+\d{2}:\d{2}(:\d{2})?$/, '');
  if (!s || s === '01/01/00' || s === '1/1/00') return '';
  try {
    const parts = s.split('/');
    if (parts.length === 3) {
      let [d, m, y] = parts.map(Number);
      if (y < 100) {
        const currentYearShort = new Date().getFullYear() % 100;
        y += y <= currentYearShort ? 2000 : 1900;
      }
      if (y < 1900) return '';
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  } catch { /* ignore */ }
  return '';
}

function clean(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (clients: Omit<ClientRecord, 'id'>[]) => void;
}

export function ImportExcelDialog({ open, onOpenChange, onImport }: Props) {
  const [preview, setPreview] = useState<Omit<ClientRecord, 'id'>[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const mapped = rows.map((r) => {
        const apellido = clean(r['APELLIDO'] || r['apellido'] || '');
        const nombre = clean(r['NOMBRE'] || r['nombre'] || '');
        const name = apellido && nombre ? `${apellido} ${nombre}` : apellido || nombre || clean(r['name'] || '');
        return {
          ...emptyClient,
          name,
          phone: clean(r['TEL_PAR'] || r['tel_par'] || ''),
          phone_work: clean(r['TEL_COM'] || r['tel_com'] || ''),
          phone_mobile: clean(r['CELULAR'] || r['celular'] || ''),
          email: clean(r['EMAIL'] || r['email'] || r['E-MAIL'] || ''),
          address: clean(r['DIRECCIÓN'] || r['DIRECCION'] || r['direccion'] || ''),
          nationality: clean(r['NACIONALIDAD'] || r['nacionalidad'] || ''),
          birth_date: parseExcelDate(r['FECHA DE NACIMIENTO'] || r['F_NACIMIENTO'] || r['fecha_nacimiento']),
          dni: clean(r['DNI'] || r['dni'] || r['NRO_DOC'] || ''),
          dni_expiry: parseExcelDate(r['VTO_DOC'] || r['vto_doc'] || r['VTO_DNI']),
          passport: clean(r['PASAPORTE'] || r['pasaporte'] || r['NRO_PAS']),
          passport_issue: parseExcelDate(r['EMISIÓN PASAPORTE'] || r['EMISION PASAPORTE'] || r['F_EMISION_PAS'] || r['EMISIÓN_PAS']),
          passport_expiry: parseExcelDate(r['VENCIMIENTO PASAPORTE'] || r['VENCIMINETO PASAPORTE'] || r['VTO_PAS'] || r['vto_pas']),
          locality: clean(r['LOCALIDAD'] || r['localidad'] || ''),
          cuil_cuit: clean(r['CUIL/CUIT'] || r['CUIL'] || r['CUIT'] || r['cuil_cuit'] || ''),
          sex: clean(r['SEXO'] || r['sexo'] || '').charAt(0).toUpperCase(),
        };
      }).filter(c => c.name.trim().length > 0);

      setPreview(mapped);
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirm = () => {
    onImport(preview);
    setPreview([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setPreview([]); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Clientes desde Excel</DialogTitle>
        </DialogHeader>
        {preview.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Seleccioná un archivo .xlsx con las columnas APELLIDO, NOMBRE, DNI, etc.</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
            <Button onClick={() => fileRef.current?.click()}>Seleccionar archivo</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">Se detectaron <strong>{preview.length}</strong> clientes para importar.</p>
            <div className="max-h-60 overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Nombre</th>
                    <th className="px-2 py-1 text-left">DNI</th>
                    <th className="px-2 py-1 text-left">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((c, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{c.name}</td>
                      <td className="px-2 py-1">{c.dni || '-'}</td>
                      <td className="px-2 py-1">{c.email || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview([])}>Cancelar</Button>
              <Button onClick={handleConfirm}>Importar {preview.length} clientes</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
