import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseCruiseItinerary } from '@/lib/cruiseItineraryParser';
import { CruisePort } from '@/types/quote';
import { ClipboardPaste, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CruiseItineraryPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (ports: CruisePort[], mode: 'replace' | 'append') => void;
}

export function CruiseItineraryPasteDialog({ open, onOpenChange, onApply }: CruiseItineraryPasteDialogProps) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<{ cruiseName?: string; ports: CruisePort[] } | null>(null);
  const [debugSample, setDebugSample] = useState<string | null>(null);

  const handleProcess = () => {
    if (!text.trim()) {
      toast.error('Pegá el texto del itinerario primero');
      return;
    }
    const result = parseCruiseItinerary(text);
    if (result.ports.length === 0) {
      toast.error('No se detectaron puertos. Verificá el formato.');
      setParsed(null);
      setDebugSample(result.normalizedSample || '(texto vacío)');
      return;
    }
    setParsed(result);
    setDebugSample(null);
    toast.success(`${result.ports.length} puertos detectados`);
  };

  const handleApply = (mode: 'replace' | 'append') => {
    if (!parsed) return;
    onApply(parsed.ports, mode);
    setText('');
    setParsed(null);
    onOpenChange(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setText('');
      setParsed(null);
      setDebugSample(null);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Importar itinerario del crucero
          </DialogTitle>
          <DialogDescription>
            Pegá el itinerario completo (con día, fecha, puerto, llegada y salida) y lo procesamos automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Ejemplo:\nCrucero 1 : SUDAMÉRICA\n\nDíaFechaPuertoArriboPartidaSab23/01/2027Buenos Aires, Argentina-18:00Dom24/01/2027Navegación--...`}
            rows={8}
            className="font-mono text-xs"
          />

          {!parsed && (
            <>
              <Button onClick={handleProcess} className="w-full">
                Procesar itinerario
              </Button>
              {debugSample && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                  <div className="mb-1 flex items-center gap-2 font-medium text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    No se pudo parsear. Muestra normalizada (· = espacio):
                  </div>
                  <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">{debugSample}</pre>
                </div>
              )}
            </>
          )}

          {parsed && (
            <div className="space-y-3">
              {parsed.cruiseName && (
                <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
                  <span className="font-medium">Crucero detectado:</span> {parsed.cruiseName}
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Día</TableHead>
                      <TableHead className="w-24">Fecha</TableHead>
                      <TableHead>Puerto</TableHead>
                      <TableHead>País</TableHead>
                      <TableHead className="w-20">Llegada</TableHead>
                      <TableHead className="w-20">Salida</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.ports.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.day}</TableCell>
                        <TableCell className="text-xs">{p.notes}</TableCell>
                        <TableCell>{p.port}</TableCell>
                        <TableCell>{p.country || '—'}</TableCell>
                        <TableCell>{p.arrivalTime || '—'}</TableCell>
                        <TableCell>{p.departureTime || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-start gap-2 rounded-md border border-accent/30 bg-accent/5 p-3 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-accent" />
                <p>Revisá el resultado antes de aplicar. La columna "Fecha" se guarda como nota en cada puerto.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          {parsed && (
            <>
              <Button variant="secondary" onClick={() => handleApply('append')}>
                Agregar al final
              </Button>
              <Button onClick={() => handleApply('replace')}>
                Reemplazar itinerario
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
