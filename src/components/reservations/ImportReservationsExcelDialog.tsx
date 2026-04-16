import { useState } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
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
} from '@/lib/reservationExcelParser';
import {
  useBulkImportReservations,
  BulkImportResult,
} from '@/hooks/useFlightReservations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewRow extends ParsedLegacyReservation {
  isDuplicate?: boolean;
  matchedClient?: string | null;
}

export function ImportReservationsExcelDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const bulkImport = useBulkImportReservations();

  const reset = () => {
    setPreview([]);
    setProgress(null);
    setResult(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const { reservations, totalRows } = await parseReservationsExcel(file);
      if (!reservations.length) {
        toast.error('No se encontraron reservas en el archivo');
        setParsing(false);
        return;
      }

      // Detectar duplicados y matches de cliente
      const enriched = await enrichPreview(reservations);
      setPreview(enriched);
      toast.success(`${reservations.length} reservas detectadas (${totalRows} filas)`);
    } catch (e) {
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

    // Duplicados existentes
    const dupIds = new Set<string>();
    if (legacyIds.length) {
      const { data } = await supabase
        .from('reservations')
        .select('legacy_id')
        .eq('user_id', user.id)
        .in('legacy_id', legacyIds);
      (data || []).forEach((r: { legacy_id: string | null }) => {
        if (r.legacy_id) dupIds.add(r.legacy_id);
      });
    }

    // Cargar clientes para preview de match
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

    const norm = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const byName = new Map<string, string>();
    for (const c of clients) {
      const n = norm(c.name || '');
      if (n && !byName.has(n)) byName.set(n, c.name);
      const first = n.split(' ')[0];
      if (first && !byName.has(first)) byName.set(first, c.name);
    }

    return reservations.map(r => ({
      ...r,
      isDuplicate: dupIds.has(r.legacyId),
      matchedClient:
        byName.get(norm(`${r.clientLastName} ${r.clientFirstName}`.trim())) ||
        byName.get(norm(r.clientLastName)) ||
        null,
    }));
  };

  const handleImport = async () => {
    if (!preview.length) return;
    setProgress({ current: 0, total: preview.length });
    try {
      const res = await bulkImport.mutateAsync({
        reservations: preview,
        onProgress: p => setProgress({ current: p.current, total: p.total }),
      });
      setResult(res);
      toast.success(`Importación finalizada: ${res.created} nuevas, ${res.merged} actualizadas`);
    } catch (e) {
      toast.error('Error durante la importación');
      console.error(e);
    }
  };

  const isImporting = bulkImport.isPending;
  const newCount = preview.filter(p => !p.isDuplicate).length;
  const dupCount = preview.filter(p => p.isDuplicate).length;
  const linkedCount = preview.filter(p => p.matchedClient).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar reservas desde Excel
          </DialogTitle>
          <DialogDescription>
            Importá reservas del sistema antiguo. Las filas con el mismo número (ID_RES) se agrupan en una reserva.
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
                {newCount} nuevas
              </Badge>
              {dupCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {dupCount} duplicadas (merge)
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
                        {r.isDuplicate && (
                          <Badge variant="secondary" className="text-xs">Merge</Badge>
                        )}
                        {!r.isDuplicate && (
                          <Badge variant="default" className="text-xs">Nuevo</Badge>
                        )}
                        {r.matchedClient && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users className="h-3 w-3" /> {r.matchedClient}
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
              <Button variant="outline" onClick={() => reset()} disabled={isImporting}>
                Cambiar archivo
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? 'Importando...' : `Importar ${preview.length} reservas`}
              </Button>
            </DialogFooter>
          </>
        )}

        {result && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Importación completada</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{result.created}</div>
                <div className="text-xs text-muted-foreground">Nuevas</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold">{result.merged}</div>
                <div className="text-xs text-muted-foreground">Actualizadas</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-2xl font-bold">{result.passengersLinked}</div>
                <div className="text-xs text-muted-foreground">Pax vinculados</div>
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
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
