import { useState, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Users, Store,
  FolderOpen, UserCheck, Briefcase, ArrowRight, X, Loader2, FileWarning,
} from 'lucide-react';
import { toast } from 'sonner';
import { detectImportType, IMPORT_ORDER, type ImportType, type DetectionResult } from '@/lib/importDetector';
import { parseClients, enrichClients, insertClients, type ClientImportRow } from '@/lib/import/importClients';
import { parseSuppliers, enrichSuppliers, insertSuppliers, type SupplierImportRow } from '@/lib/import/importSuppliers';
import { parsePassengers, enrichPassengers, insertPassengers, type PassengerImportRow } from '@/lib/import/importPassengers';
import { parseFileOperators, enrichFileOperators, insertFileOperators, type FileOperatorImportRow } from '@/lib/import/importFileOperators';
import { insertFiles } from '@/lib/import/importFiles';
import { parseReservationsExcel } from '@/lib/reservationExcelParser';
import { supabase } from '@/integrations/supabase/client';

type AnyRow = ClientImportRow | SupplierImportRow | PassengerImportRow | FileOperatorImportRow;

const ICONS: Record<ImportType, React.ReactNode> = {
  clients: <Users className="h-4 w-4" />, suppliers: <Store className="h-4 w-4" />,
  files: <FolderOpen className="h-4 w-4" />, passengers: <UserCheck className="h-4 w-4" />,
  file_operators: <Briefcase className="h-4 w-4" />, unknown: <FileWarning className="h-4 w-4" />,
};

const TYPE_LABELS: Record<ImportType, string> = {
  clients: 'Clientes', suppliers: 'Proveedores', files: 'Expedientes',
  passengers: 'Pasajeros', file_operators: 'Operadores', unknown: 'Desconocido',
};

// Orden de procesamiento para importar dependencias primero
const PROCESS_ORDER: ImportType[] = ['clients', 'suppliers', 'files', 'passengers', 'file_operators'];

interface QueuedFile {
  file: File;
  detection: DetectionResult;
  status: 'pending' | 'processing' | 'done' | 'error' | 'skipped';
  result?: { imported: number; skipped: number; errors: string[] };
  parsedCount?: number;
}

interface ImportResult { imported: number; skipped: number; errors: string[] }

export default function DataImport() {
  const { user } = useAuth();
  const [step, setStep] = useState<'upload' | 'queue' | 'importing' | 'done'>('upload');
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload'); setQueue([]); setDragOver(false);
    setDetecting(false); setCurrentIdx(-1); setProgress({ current: 0, total: 0 });
  };

  // --- Procesar archivos subidos o arrastrados ---
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const xlsFiles = Array.from(files).filter(f =>
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    if (!xlsFiles.length) { toast.error('No se encontraron archivos .xlsx'); return; }

    setDetecting(true);
    const detected: QueuedFile[] = [];
    for (const file of xlsFiles) {
      try {
        const det = await detectImportType(file);
        detected.push({ file, detection: det, status: 'pending', parsedCount: det.rows.length });
      } catch (e) {
        console.error(`Error detectando ${file.name}:`, e);
        detected.push({
          file, status: 'error',
          detection: { type: 'unknown', confidence: 'low', label: 'Error', description: 'No se pudo leer', headers: [], rows: [], sheetName: '' },
          result: { imported: 0, skipped: 0, errors: ['No se pudo leer el archivo'] },
        });
      }
    }

    // Ordenar por orden de procesamiento recomendado
    detected.sort((a, b) => {
      const ia = PROCESS_ORDER.indexOf(a.detection.type);
      const ib = PROCESS_ORDER.indexOf(b.detection.type);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    setQueue(detected);
    setStep('queue');
    setDetecting(false);

    const validCount = detected.filter(d => d.detection.type !== 'unknown').length;
    const unknownCount = detected.filter(d => d.detection.type === 'unknown').length;
    toast.success(`${validCount} archivos detectados${unknownCount > 0 ? `, ${unknownCount} no reconocidos` : ''}`);
  }, []);

  // --- Drag & Drop handlers ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const removeFromQueue = (idx: number) => {
    setQueue(q => q.filter((_, i) => i !== idx));
    if (queue.length <= 1) reset();
  };

  // --- Importar toda la cola en orden ---
  const handleImportAll = async () => {
    if (!user) return;
    setStep('importing');

    const { data: profile } = await supabase
      .from('agency_members').select('agency_id').eq('user_id', user.id).maybeSingle();
    const agencyId = (profile as any)?.agency_id || null;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.detection.type === 'unknown' || item.status === 'error') {
        setQueue(q => q.map((it, idx) => idx === i ? { ...it, status: 'skipped' } : it));
        continue;
      }

      setCurrentIdx(i);
      setQueue(q => q.map((it, idx) => idx === i ? { ...it, status: 'processing' } : it));
      setProgress({ current: 0, total: item.parsedCount || 0 });

      const onProg = (c: number, t: number) => setProgress({ current: c, total: t });
      let res: ImportResult = { imported: 0, skipped: 0, errors: [] };

      try {
        const rows = item.detection.rows;
        const type = item.detection.type;

        if (type === 'clients') {
          const parsed = parseClients(rows);
          const enriched = await enrichClients(parsed, user.id);
          res = await insertClients(enriched, user.id, agencyId, onProg);
        } else if (type === 'suppliers') {
          const parsed = parseSuppliers(rows);
          const enriched = await enrichSuppliers(parsed);
          res = await insertSuppliers(enriched, user.id, agencyId, onProg);
        } else if (type === 'passengers') {
          const parsed = parsePassengers(rows);
          const enriched = await enrichPassengers(parsed);
          res = await insertPassengers(parsed, user.id, agencyId, onProg);
        } else if (type === 'file_operators') {
          const parsed = parseFileOperators(rows);
          const enriched = await enrichFileOperators(parsed);
          res = await insertFileOperators(enriched, user.id, agencyId, onProg);
        } else if (type === 'files') {
          const { reservations } = await parseReservationsExcel(item.file);
          res = await insertFiles(reservations, user.id, agencyId, onProg);
        }

        setQueue(q => q.map((it, idx) => idx === i ? { ...it, status: 'done', result: res } : it));
      } catch (e) {
        res.errors.push(e instanceof Error ? e.message : 'Error desconocido');
        setQueue(q => q.map((it, idx) => idx === i ? { ...it, status: 'error', result: res } : it));
      }
    }

    setStep('done');
    setCurrentIdx(-1);
    const totals = queue.reduce((acc, q) => ({
      imported: acc.imported + (q.result?.imported || 0),
      errors: acc.errors + (q.result?.errors?.length || 0),
    }), { imported: 0, errors: 0 });
    toast.success(`Importación completa: ${totals.imported} registros importados`);
  };

  const totalImported = queue.reduce((s, q) => s + (q.result?.imported || 0), 0);
  const totalSkipped = queue.reduce((s, q) => s + (q.result?.skipped || 0), 0);
  const totalErrors = queue.reduce((s, q) => s + (q.result?.errors?.length || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-sans text-3xl font-bold text-foreground flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            Importación de Datos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Subí los archivos Excel del sistema anterior. Podés arrastrar varios a la vez.
          </p>
        </div>

        {/* Orden recomendado */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-sans text-sm font-bold text-muted-foreground">Orden automático de procesamiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {IMPORT_ORDER.map((item, i) => (
                <div key={item.type} className="flex items-center gap-1">
                  <Badge variant={queue.some(q => q.detection.type === item.type) ? 'default' : 'outline'} className="gap-1 text-xs">
                    {ICONS[item.type]} {item.label}
                  </Badge>
                  {i < IMPORT_ORDER.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* UPLOAD ZONE — siempre visible en paso upload */}
        {step === 'upload' && (
          <Card>
            <CardContent className="py-8">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  cursor-pointer flex flex-col items-center gap-4 p-12 border-2 border-dashed rounded-xl
                  transition-all duration-200
                  ${dragOver
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : 'border-border hover:border-primary/50 hover:bg-accent/30'
                  }
                `}
              >
                {detecting ? (
                  <Loader2 className="h-14 w-14 text-primary animate-spin" />
                ) : (
                  <Upload className={`h-14 w-14 transition-colors ${dragOver ? 'text-primary' : 'text-muted-foreground/40'}`} />
                )}
                <div className="text-center">
                  <p className="font-semibold text-lg">
                    {detecting ? 'Analizando archivos...' : dragOver ? 'Soltá los archivos aquí' : 'Arrastrá archivos .xlsx o hacé click'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Podés subir varios archivos a la vez. Se procesan en el orden correcto automáticamente.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  className="hidden"
                  disabled={detecting}
                  onChange={e => { if (e.target.files?.length) processFiles(e.target.files); e.target.value = ''; }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* COLA DE ARCHIVOS */}
        {(step === 'queue' || step === 'importing' || step === 'done') && (
          <div className="space-y-4">
            {/* Agregar más archivos (solo en queue) */}
            {step === 'queue' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  cursor-pointer flex items-center gap-3 p-4 border-2 border-dashed rounded-lg text-sm
                  transition-all ${dragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
                `}
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Arrastrá más archivos o hacé click para agregar</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.length) {
                      // Agregar a la cola existente
                      (async () => {
                        const xlsFiles = Array.from(e.target.files!).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
                        for (const file of xlsFiles) {
                          try {
                            const det = await detectImportType(file);
                            setQueue(q => {
                              const newQ = [...q, { file, detection: det, status: 'pending' as const, parsedCount: det.rows.length }];
                              newQ.sort((a, b) => {
                                const ia = PROCESS_ORDER.indexOf(a.detection.type);
                                const ib = PROCESS_ORDER.indexOf(b.detection.type);
                                return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                              });
                              return newQ;
                            });
                          } catch { /* skip */ }
                        }
                        toast.success('Archivos agregados');
                      })();
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            )}

            {/* Lista de archivos en cola */}
            {queue.map((item, idx) => (
              <Card key={`${item.file.name}-${idx}`} className={`
                transition-all
                ${item.status === 'processing' ? 'ring-2 ring-primary' : ''}
                ${item.status === 'done' ? 'opacity-80' : ''}
                ${item.status === 'skipped' || item.status === 'error' ? 'opacity-60' : ''}
              `}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    {/* Icono de tipo */}
                    <div className={`
                      flex h-10 w-10 items-center justify-center rounded-lg shrink-0
                      ${item.detection.type !== 'unknown' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                    `}>
                      {item.status === 'processing' ? <Loader2 className="h-5 w-5 animate-spin" /> : ICONS[item.detection.type]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{item.file.name}</p>
                        <Badge variant={item.detection.type !== 'unknown' ? 'default' : 'destructive'} className="text-xs shrink-0">
                          {TYPE_LABELS[item.detection.type]}
                        </Badge>
                        {item.detection.confidence === 'high' && item.detection.type !== 'unknown' && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.parsedCount || 0} filas · {(item.file.size / 1024).toFixed(0)} KB
                        {item.result && item.status === 'done' && (
                          <span className="text-green-600 ml-2">
                            ✓ {item.result.imported} importados, {item.result.skipped} omitidos
                          </span>
                        )}
                        {item.status === 'skipped' && <span className="text-amber-500 ml-2">Omitido (tipo no reconocido)</span>}
                        {item.status === 'error' && item.result?.errors?.[0] && (
                          <span className="text-destructive ml-2">{item.result.errors[0]}</span>
                        )}
                      </p>
                    </div>

                    {/* Eliminar de cola */}
                    {step === 'queue' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeFromQueue(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Barra de progreso cuando está procesando */}
                  {item.status === 'processing' && (
                    <div className="mt-3">
                      <Progress value={progress.total ? (progress.current / progress.total) * 100 : 0} />
                      <p className="text-xs text-muted-foreground text-right mt-1">{progress.current} / {progress.total}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Botones de acción */}
            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={reset}>
                {step === 'done' ? 'Nueva importación' : 'Cancelar'}
              </Button>
              {step === 'queue' && (
                <Button onClick={handleImportAll} disabled={!queue.some(q => q.detection.type !== 'unknown')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar {queue.filter(q => q.detection.type !== 'unknown').length} archivos
                </Button>
              )}
            </div>

            {/* Resumen final */}
            {step === 'done' && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="h-10 w-10 text-green-500 shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold">Importación completada</h3>
                      <p className="text-sm text-muted-foreground">
                        <span className="text-foreground font-semibold">{totalImported}</span> importados
                        {totalSkipped > 0 && <> · <span>{totalSkipped}</span> omitidos</>}
                        {totalErrors > 0 && <> · <span className="text-destructive">{totalErrors} errores</span></>}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
