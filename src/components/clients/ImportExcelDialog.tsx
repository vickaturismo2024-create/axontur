import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ClientRecord, emptyClient } from './ClientFormDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

function parseExcelDate(val: any): string {
  if (!val && val !== 0) return '';
  if (typeof val === 'number') {
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
  onImport: (clients: Omit<ClientRecord, 'id'>[]) => Promise<void>;
  existingDnis?: Set<string>;
}

export function ImportExcelDialog({ open, onOpenChange, onImport, existingDnis = new Set() }: Props) {
  const [preview, setPreview] = useState<Omit<ClientRecord, 'id'>[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

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
      setResult(null);
    };
    reader.readAsBinaryString(file);
  };

  const newClients = preview.filter(c => !c.dni || !existingDnis.has(c.dni));
  const duplicateCount = preview.length - newClients.length;

  const handleConfirm = async () => {
    if (!user || newClients.length === 0) return;
    setImporting(true);
    setProgress(0);

    const BATCH = 500;
    let imported = 0;
    for (let i = 0; i < newClients.length; i += BATCH) {
      const batch = newClients.slice(i, i + BATCH).map(r => {
        const obj: any = { ...r, user_id: user.id };
        ['birth_date', 'dni_expiry', 'passport_issue', 'passport_expiry'].forEach(f => {
          if (!obj[f]) obj[f] = null;
        });
        return obj;
      });
      const { error } = await supabase.from('clients').insert(batch);
      if (error) {
        console.error('Batch insert error:', error);
      } else {
        imported += batch.length;
      }
      setProgress(Math.round(((i + batch.length) / newClients.length) * 100));
    }

    setResult({ imported, skipped: duplicateCount });
    setImporting(false);
    // Trigger parent refresh
    await onImport([]);
  };

  const handleClose = () => {
    setPreview([]);
    setResult(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Clientes desde Excel</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm text-center">
              <strong>{result.imported}</strong> clientes importados correctamente.
              {result.skipped > 0 && <><br /><span className="text-muted-foreground">{result.skipped} omitidos (DNI ya existente)</span></>}
            </p>
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        ) : importing ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Importando {newClients.length} clientes...</p>
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        ) : preview.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Seleccioná un archivo .xlsx con las columnas APELLIDO, NOMBRE, DNI, etc.</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
            <Button onClick={() => fileRef.current?.click()}>Seleccionar archivo</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 rounded-md border p-3 text-center">
                <p className="text-2xl font-bold text-primary">{newClients.length}</p>
                <p className="text-xs text-muted-foreground">Nuevos</p>
              </div>
              {duplicateCount > 0 && (
                <div className="flex-1 rounded-md border p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <p className="text-2xl font-bold text-amber-500">{duplicateCount}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Ya existentes (se omiten)</p>
                </div>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Nombre</th>
                    <th className="px-2 py-1 text-left">DNI</th>
                    <th className="px-2 py-1 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((c, i) => {
                    const isDup = c.dni && existingDnis.has(c.dni);
                    return (
                      <tr key={i} className={`border-t ${isDup ? 'opacity-50' : ''}`}>
                        <td className="px-2 py-1">{c.name}</td>
                        <td className="px-2 py-1">{c.dni || '-'}</td>
                        <td className="px-2 py-1">{isDup ? <span className="text-amber-500">Existente</span> : <span className="text-green-600">Nuevo</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview([])}>Cancelar</Button>
              <Button onClick={handleConfirm} disabled={newClients.length === 0}>
                Importar {newClients.length} clientes
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
