import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FileUp, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Flight } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPDF } from '@/lib/pdfTextExtractor';
import { parsePNR } from '@/lib/pnrParser';

interface PDFParserDialogProps {
  onFlightsParsed: (flights: Omit<Flight, 'id'>[]) => void;
}

export function PDFParserDialog({ onFlightsParsed }: PDFParserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      toast.error('El archivo debe ser un PDF');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('El PDF no puede superar los 10MB');
      return;
    }
    setFile(f);
  };

  const handleParse = async () => {
    if (!file) {
      toast.error('Seleccioná un archivo PDF');
      return;
    }

    setIsLoading(true);
    try {
      const text = await extractTextFromPDF(file, setProgress);
      if (!text || text.length < 20) {
        toast.error('No se pudo extraer texto del PDF (puede ser una imagen escaneada)');
        return;
      }

      setProgress('Analizando con IA...');
      let flightsToUse = null;

      try {
        const { data, error } = await supabase.functions.invoke('parse-pdf', {
          body: { text },
        });

        if (!error && data && data.flights && data.flights.length > 0) {
          flightsToUse = data.flights;
        } else if (error) {
          console.warn('parse-pdf edge function returned error:', error);
        }
      } catch (err) {
        console.warn('Error invoking parse-pdf edge function:', err);
      }

      if (!flightsToUse || flightsToUse.length === 0) {
        console.info('Utilizando extractor local alternativo para procesar el PDF...');
        const parsed = parsePNR(text);
        if (parsed.segments && parsed.segments.length > 0) {
          flightsToUse = parsed.segments.map(seg => ({
            origin: seg.originIata,
            destination: seg.destinationIata,
            date: seg.depDatetime ? seg.depDatetime.toISOString().split('T')[0] : '',
            departureTime: seg.depDatetime ? seg.depDatetime.toTimeString().slice(0, 5) : '',
            arrivalTime: seg.arrDatetime ? seg.arrDatetime.toTimeString().slice(0, 5) : '',
            airline: seg.airlineCode || '',
            flightNumber: `${seg.airlineCode}${seg.flightNumber}`.trim(),
            luggage: '',
            notes: seg.rawText || '',
            flightType: 'direct' as const,
          }));
          toast.info('Vuelos extraídos localmente (sin conexión IA)');
        }
      }

      if (!flightsToUse || flightsToUse.length === 0) {
        toast.error('No se pudieron extraer vuelos del PDF (extractor local ni IA detectaron vuelos)');
        return;
      }

      onFlightsParsed(flightsToUse);
      toast.success(`${flightsToUse.length} vuelo(s) importado(s) desde PDF`);
      setFile(null);
      setOpen(false);
    } catch (error) {
      console.error('Error parsing PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Error al procesar el PDF');
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setFile(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileUp className="h-4 w-4" />
          Importar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            Importar vuelos desde PDF
          </DialogTitle>
          <DialogDescription>
            Subí un e-ticket o itinerario en PDF y la IA extraerá automáticamente los vuelos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="pdf-input">Archivo PDF (máx. 10MB)</Label>
            <input
              ref={inputRef}
              id="pdf-input"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={isLoading}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file && (
              <p className="mt-2 text-sm text-muted-foreground">
                📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {isLoading && progress && (
            <div className="rounded-lg bg-muted p-3 text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress}
            </div>
          )}

          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium">Soportado:</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>E-tickets de aerolíneas</li>
              <li>Itinerarios de agencias</li>
              <li>Confirmaciones de GDS exportadas a PDF</li>
            </ul>
            <p className="mt-2 text-xs">⚠️ PDFs escaneados (sólo imagen) no son soportados.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleParse} disabled={isLoading || !file} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Importar vuelos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
