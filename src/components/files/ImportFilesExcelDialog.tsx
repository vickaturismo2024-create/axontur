import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Users, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  parseReservationsExcel,
  ParsedLegacyReservation,
  buildLegacyNotes,
} from '@/lib/reservationExcelParser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewRow extends ParsedLegacyReservation {
  isDuplicate?: boolean;
  matchedClientId?: string | null;
  matchedClientName?: string | null;
}

interface ImportResult {
  created: number;
  updated: number;
  servicesInserted: number;
  errors: { legacyId: string; message: string }[];
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

export function ImportFilesExcelDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<{ message: string; sheets: string[]; headers?: string[] } | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const reset = () => {
    setPreview([]);
    setProgress(null);
    setResult(null);
    setParseError(null);
    setFileName('');
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setParseError(null);
    setFileName(file.name);
    try {
      const { reservations, totalRows, diagnostics } = await parseReservationsExcel(file);
      if (!reservations.length) {
        setParseError({
          message: 'No se encontró la columna ID_RES en el archivo.',
          sheets: diagnostics.sheetsDetected,
          headers: diagnostics.headersDetected,
        });
        toast.error('No se encontraron expedientes en el archivo');
        setParsing(false);
        return;
      }
      const enriched = await enrichPreview(reservations);
      setPreview(enriched);
      toast.success(`${reservations.length} expedientes detectados (${totalRows} filas)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setParseError({ message: `Error al leer el archivo: ${msg}`, sheets: [] });
      toast.error('Error al leer el archivo Excel');
      console.error(e);
    } finally {
      setParsing(false);
    }
  };

  const enrichPreview = async (
    reservations: ParsedLegacyReservation[]
  ): Promise<PreviewRow[]> => {
    if (!user) return reservations;
    const legacyIds = reservations.map(r => r.legacyId);

    const dupIds = new Set<string>();
    if (legacyIds.length) {
      const { data } = await supabase
        .from('files')
        .select('legacy_id')
        .eq('user_id', user.id)
        .in('legacy_id', legacyIds);
      (data || []).forEach((r: { legacy_id: string | null }) => {
        if (r.legacy_id) dupIds.add(r.legacy_id);
      });
    }

    // Cargar clientes (paginado)
    const clients: { id: string; name: string }[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .range(from, from + PAGE - 1);
      const batch = data || [];
      clients.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }

    const byName = new Map<string, { id: string; name: string }>();
    for (const c of clients) {
      const n = norm(c.name || '');
      if (n && !byName.has(n)) byName.set(n, c);
      const first = n.split(' ')[0];
      if (first && !byName.has(first)) byName.set(first, c);
    }

    return reservations.map(r => {
      const fullName = `${r.clientLastName} ${r.clientFirstName}`.trim();
      const match =
        byName.get(norm(fullName)) ||
        byName.get(norm(r.clientLastName)) ||
        null;
      return {
        ...r,
        isDuplicate: dupIds.has(r.legacyId),
        matchedClientId: match?.id || null,
        matchedClientName: match?.name || null,
      };
    });
  };

  const detectCurrency = (r: ParsedLegacyReservation): string => {
    if (r.totals.saleUsd > 0 || r.totals.costUsd > 0) return 'USD';
    if (r.totals.saleArs > 0 || r.totals.costArs > 0) return 'ARS';
    return 'USD';
  };

  const handleImport = async () => {
    if (!user || !preview.length) return;
    setImporting(true);
    setProgress({ current: 0, total: preview.length });
    const res: ImportResult = { created: 0, updated: 0, servicesInserted: 0, errors: [] };

    for (let i = 0; i < preview.length; i++) {
      const r = preview[i];
      try {
        const currency = detectCurrency(r);
        const totalPrice = currency === 'USD' ? r.totals.saleUsd : r.totals.saleArs;
        const totalCost = currency === 'USD' ? r.totals.costUsd : r.totals.costArs;
        const clientName = `${r.clientLastName} ${r.clientFirstName}`.trim() || 'Sin cliente';
        const notes = buildLegacyNotes(r);

        // Buscar duplicado
        const { data: existing } = await supabase
          .from('files')
          .select('id')
          .eq('user_id', user.id)
          .eq('legacy_id', r.legacyId)
          .maybeSingle();

        let fileId: string;

        if (existing?.id) {
          // Update existente
          await supabase
            .from('files')
            .update({
              client_name: clientName,
              client_id: r.matchedClientId || null,
              destination: r.destination || '',
              start_date: r.travelDate,
              travelers: r.numPax,
              currency,
              total_price: totalPrice,
              total_cost: totalCost,
              internal_notes: notes,
            })
            .eq('id', existing.id);
          fileId = existing.id;
          // Reemplazar servicios: borrar previos
          await supabase.from('file_services').delete().eq('file_id', fileId).eq('user_id', user.id);
          res.updated++;
        } else {
          const { data: created, error } = await supabase
            .from('files')
            .insert({
              user_id: user.id,
              legacy_id: r.legacyId,
              client_name: clientName,
              client_id: r.matchedClientId || null,
              destination: r.destination || '',
              start_date: r.travelDate,
              travelers: r.numPax,
              currency,
              total_price: totalPrice,
              total_cost: totalCost,
              internal_notes: notes,
              status: 'confirmed',
            })
            .select('id')
            .single();
          if (error || !created) throw error || new Error('No se pudo crear el expediente');
          fileId = created.id;
          res.created++;
        }

        // Insertar servicios
        const servicesToInsert = r.services
          .filter(s => s.operatorName || s.saleArs || s.costArs || s.saleUsd || s.costUsd)
          .map(s => {
            const svcCurrency = s.saleUsd > 0 || s.costUsd > 0 ? 'USD' : 'ARS';
            const price = svcCurrency === 'USD' ? s.saleUsd : s.saleArs;
            const cost = svcCurrency === 'USD' ? s.costUsd : s.costArs;
            return {
              user_id: user.id,
              file_id: fileId,
              service_type: 'other',
              description: s.operatorName || 'Servicio',
              supplier_name: s.operatorName || '',
              currency: svcCurrency,
              price,
              cost,
              status: 'confirmed' as const,
            };
          });

        if (servicesToInsert.length) {
          const { error: svcErr } = await supabase.from('file_services').insert(servicesToInsert);
          if (svcErr) throw svcErr;
          res.servicesInserted += servicesToInsert.length;
        }
      } catch (e) {
        res.errors.push({ legacyId: r.legacyId, message: e instanceof Error ? e.message : 'Error' });
      }
      setProgress({ current: i + 1, total: preview.length });
    }

    qc.invalidateQueries({ queryKey: ['files'] });
    setResult(res);
    setImporting(false);
    toast.success(`Importación finalizada: ${res.created} nuevos, ${res.updated} actualizados`);
  };

  const newCount = preview.filter(p => !p.isDuplicate).length;
  const dupCount = preview.filter(p => p.isDuplicate).length;
  const linkedCount = preview.filter(p => p.matchedClientId).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar expedientes desde Excel
          </DialogTitle>
          <DialogDescription>
            Importá expedientes del sistema antiguo. Las filas con el mismo número (ID_RES) se agrupan en un expediente con todos sus servicios.
          </DialogDescription>
        </DialogHeader>

        {!preview.length && !result && (
          <div className="flex-1 flex items-center justify-center py-12">
            <label className="cursor-pointer flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Seleccionar archivo .xlsx</p>
                <p className="text-sm text-muted-foreground">
                  {parsing ? 'Procesando...' : 'O arrastrá el archivo aquí'}
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={parsing}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </div>
        )}

        {preview.length > 0 && !result && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {newCount} nuevos
              </Badge>
              {dupCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {dupCount} duplicados (se actualizan)
                </Badge>
              )}
              {linkedCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" />
                  {linkedCount} con cliente vinculado
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[50vh] border rounded-md">
              <Accordion type="multiple" className="px-3">
                {preview.map(r => (
                  <AccordionItem key={r.legacyId} value={r.legacyId}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2 flex-wrap text-left">
                        <span className="font-mono font-semibold">#{r.legacyId}</span>
                        <span className="text-muted-foreground">
                          {r.clientLastName} {r.clientFirstName}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{r.destination}</span>
                        {r.isDuplicate ? (
                          <Badge variant="secondary" className="text-xs">Actualizar</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">Nuevo</Badge>
                        )}
                        {r.matchedClientName && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users className="h-3 w-3" /> {r.matchedClientName}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm pl-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Apertura:</span> {r.openDate || '-'}</div>
                          <div><span className="text-muted-foreground">Salida:</span> {r.travelDate || '-'}</div>
                          <div><span className="text-muted-foreground">Vendedor:</span> {r.agent || '-'}</div>
                          <div><span className="text-muted-foreground">Pax:</span> {r.numPax}</div>
                        </div>
                        <div className="border-t pt-2">
                          <p className="font-medium mb-1 text-xs">Servicios ({r.services.length}):</p>
                          <ul className="space-y-1 text-xs">
                            {r.services.map((s, i) => (
                              <li key={i} className="flex justify-between gap-2">
                                <span className="truncate">{s.operatorName || '(s/proveedor)'}</span>
                                <span className="text-muted-foreground whitespace-nowrap">
                                  {s.saleArs > 0 && `ARS ${s.saleArs.toLocaleString('es-AR')}`}
                                  {s.saleArs > 0 && s.saleUsd > 0 && ' · '}
                                  {s.saleUsd > 0 && `USD ${s.saleUsd.toLocaleString('es-AR')}`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>

            {progress && (
              <div className="space-y-1">
                <Progress value={(progress.current / progress.total) * 100} />
                <p className="text-xs text-muted-foreground text-center">
                  {progress.current} / {progress.total}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => reset()} disabled={importing}>
                Cambiar archivo
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? 'Importando...' : `Importar ${preview.length} expedientes`}
              </Button>
            </DialogFooter>
          </>
        )}

        {result && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <FolderOpen className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Importación completada</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{result.created}</div>
                <div className="text-xs text-muted-foreground">Nuevos</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold">{result.updated}</div>
                <div className="text-xs text-muted-foreground">Actualizados</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold">{result.servicesInserted}</div>
                <div className="text-xs text-muted-foreground">Servicios cargados</div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="border border-destructive/50 rounded-lg p-3 bg-destructive/5">
                <p className="text-sm font-medium text-destructive mb-2">
                  {result.errors.length} errores:
                </p>
                <ScrollArea className="max-h-32">
                  <ul className="text-xs space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        <span className="font-mono">#{e.legacyId}</span>: {e.message}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); }}>
                Importar otro
              </Button>
              <Button onClick={() => { handleClose(false); navigate('/files'); }}>
                Ver expedientes
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
