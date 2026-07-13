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

/* ─────────────────────────────────────────────────────────────────
 * Header / footer lines that repeat on every PDF page.
 * We remove ONLY full lines that match these patterns.
 * We never touch partial content inside descriptive paragraphs.
 * ───────────────────────────────────────────────────────────────── */
const PAGE_NOISE_LINE_PATTERNS = [
  /^Via\s+Mulini\b.*$/i,
  /^Tel\.\s*\+?\d.*$/i,          // "Tel. +39 091..." — only at line start
  /^info@\S+\s*[–—-]\s*www\.\S+.*$/i,
  /^Partita\s+Iva\b.*$/i,
  /^SALES\s*[&]\s*MARKETING.*$/i,
  /^DEPARTMENT\s*$/i,
  /^\d{1,3}\s*$/,                // standalone page numbers
];

/**
 * Remove header/footer noise from the extracted text.
 * Only removes WHOLE LINES that match known patterns.
 */
function removePageNoise(text: string): string {
  return text
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      if (trimmed === '') return true; // keep blank lines
      return !PAGE_NOISE_LINE_PATTERNS.some(p => p.test(trimmed));
    })
    .join('\n');
}

/**
 * Parse the extracted PDF text into itinerary days.
 *
 * Looks for "Día N …: Title" headers and captures everything
 * between one header and the next as the day's content.
 */
function parseItineraryText(rawText: string): ItineraryDay[] {
  // 1. Clean ONLY page noise (headers/footers from the PDF template)
  const text = removePageNoise(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // 2. Find all "Día N …: Title" headers
  const dayHeaderRegex = /^[ \t]*[Dd][ií]a\s+(\d+)\s*([^:\n]*?):\s*(.+)$/gm;
  const headers: { index: number; fullMatch: string; dayNumber: number; title: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = dayHeaderRegex.exec(text)) !== null) {
    const rawTitle = m[3].trim();
    headers.push({
      index: m.index,
      fullMatch: m[0],
      dayNumber: parseInt(m[1], 10),
      title: rawTitle,
    });
  }

  if (headers.length === 0) return [];

  // 3. Extract each day's FULL content — NO FILTERING
  const days: ItineraryDay[] = [];

  for (let i = 0; i < headers.length; i++) {
    const hdr = headers[i];

    // Description starts after the header line
    const headerLineEnd = text.indexOf('\n', hdr.index);
    const descStart = headerLineEnd > 0 ? headerLineEnd + 1 : hdr.index + hdr.fullMatch.length;

    // Description ends at the next day header
    const descEnd = (i + 1 < headers.length)
      ? headers[i + 1].index
      : text.length;

    // Get the FULL description, only collapse excessive blank lines
    const description = text.substring(descStart, descEnd)
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    days.push({
      id: crypto.randomUUID(),
      dayNumber: hdr.dayNumber,
      date: '',
      title: hdr.title,
      description,
      activities: [],
    });
  }

  // 4. Capture ALL remaining content AFTER the last day's description
  //    (prices, dates, hotels, inclusions, conditions, etc.)
  const lastDay = days[days.length - 1];
  const lastDayHeaderIndex = headers[headers.length - 1].index;
  const lastDayHeaderEnd = text.indexOf('\n', lastDayHeaderIndex);
  const lastDayDescStart = lastDayHeaderEnd > 0 ? lastDayHeaderEnd + 1 : lastDayHeaderIndex;

  // Find where the last day's itinerary description actually ends
  // and where the "additional info" section begins.
  // Look for known section markers AFTER the last day header.
  const additionalInfoMarkers = [
    /^(?:HOTELES|CONDICIONES|PRECIOS|FECHAS\s+DE\s+SALIDA)\b/im,
    /^El precio incluye/im,
    /^Por motivos organizativos/im,
    /^PRECIOS\s+VENTA/im,
    /^NOCHES\s+(?:ADICIONALES|PRE)/im,
  ];

  let additionalInfoStart = -1;
  const textAfterLastDayHeader = text.substring(lastDayDescStart);

  for (const pattern of additionalInfoMarkers) {
    const match = pattern.exec(textAfterLastDayHeader);
    if (match) {
      const absIndex = lastDayDescStart + match.index;
      if (additionalInfoStart === -1 || absIndex < additionalInfoStart) {
        additionalInfoStart = absIndex;
      }
    }
  }

  if (additionalInfoStart > 0) {
    // Split the last day: itinerary part vs additional info
    const lastDayItinerary = text.substring(lastDayDescStart, additionalInfoStart)
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const additionalInfo = text.substring(additionalInfoStart)
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Update the last day with only its itinerary content
    if (lastDayItinerary) {
      lastDay.description = lastDayItinerary;
    }

    // Add additional info as a separate section
    if (additionalInfo && additionalInfo.length > 20) {
      days.push({
        id: crypto.randomUUID(),
        dayNumber: days.length + 1,
        date: '',
        title: 'Información General del Paquete',
        description: additionalInfo,
        activities: [],
      });
    }
  }

  return days;
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
      // Step 1: Extract text from PDF (client-side)
      const text = await extractTextFromPDF(file, setProgress);
      if (!text || text.length < 30) {
        toast.error('No se pudo extraer texto del PDF (puede ser una imagen escaneada)');
        return;
      }

      // Step 2: Parse with local parser
      setProgress('Analizando estructura del itinerario...');
      let parsedDays = parseItineraryText(text);

      // Step 3: AI fallback if local parser finds nothing
      if (parsedDays.length === 0) {
        setProgress('Parser local no detectó días, intentando con IA...');
        try {
          const { data, error } = await supabase.functions.invoke('generate-itinerary', {
            body: { pdfText: text },
          });
          if (!error && data?.days && data.days.length > 0) {
            parsedDays = data.days.map((day: any, idx: number) => ({
              id: crypto.randomUUID(),
              dayNumber: day.dayNumber || idx + 1,
              date: day.date || '',
              title: day.title || '',
              description: day.description || '',
              activities: Array.isArray(day.activities) ? day.activities : [],
            }));
          }
        } catch (aiErr) {
          console.warn('AI fallback failed, local parser also found 0 days:', aiErr);
        }
      }

      if (parsedDays.length === 0) {
        toast.error('No se pudieron extraer días de itinerario del PDF.');
        return;
      }

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
            Subí un PDF con un itinerario de viaje y se extraerán automáticamente los días, descripciones y actividades.
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
