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
import { ItineraryDay } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPDF } from '@/lib/pdfTextExtractor';

interface ItineraryPDFDialogProps {
  onDaysParsed: (days: ItineraryDay[]) => void;
  existingDaysCount: number;
}

export function ItineraryPDFDialog({ onDaysParsed, existingDaysCount }: ItineraryPDFDialogProps) {
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

    if (existingDaysCount > 0) {
      const confirmed = window.confirm(
        'Ya tenés días de itinerario cargados. ¿Querés reemplazarlos con los que se extraigan del PDF?'
      );
      if (!confirmed) return;
    }

    setIsLoading(true);
    try {
      // Step 1: Extract text from PDF client-side
      const text = await extractTextFromPDF(file, setProgress);
      if (!text || text.length < 30) {
        toast.error('No se pudo extraer texto del PDF (puede ser una imagen escaneada)');
        return;
      }

      // Step 2: Send text to AI edge function for structured extraction
      setProgress('Analizando itinerario con IA...');
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: { pdfText: text },
      });

      if (error) throw new Error(error.message || 'Error al procesar el itinerario');
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (!data?.days || data.days.length === 0) {
        toast.error('No se pudieron extraer días de itinerario del PDF');
        return;
      }

      // Step 3: Map to ItineraryDay format
      const parsedDays: ItineraryDay[] = data.days.map((day: any, idx: number) => ({
        id: crypto.randomUUID(),
        dayNumber: day.dayNumber || idx + 1,
        date: day.date || '',
        title: day.title || '',
        description: day.description || '',
        activities: Array.isArray(day.activities) ? day.activities : [],
      }));

      onDaysParsed(parsedDays);
      toast.success(`Se importaron ${parsedDays.length} día(s) de itinerario desde el PDF`);
      setFile(null);
      setOpen(false);
    } catch (error) {
      console.error('Error parsing itinerary PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Error al procesar el PDF');
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setFile(null); setProgress(''); } }}>
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
            Importar itinerario desde PDF
          </DialogTitle>
          <DialogDescription>
            Subí un PDF con un itinerario de viaje y la IA extraerá automáticamente los días, descripciones y actividades.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="itinerary-pdf-input">Archivo PDF (máx. 10MB)</Label>
            <input
              ref={inputRef}
              id="itinerary-pdf-input"
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
              <li>Itinerarios de operadores turísticos</li>
              <li>Programas de circuitos día por día</li>
              <li>Paquetes turísticos con detalle de actividades</li>
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
                Importar itinerario
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
