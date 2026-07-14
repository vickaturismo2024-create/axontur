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

  // 2. Try multiple day-header patterns (international formats)
  const dayPatterns = [
    // Spanish: "Día 1 Miércoles: Como", "DÍA 1: Título", "Dia 1 - Titulo"
    /^[ \t]*[Dd][ií]a\s+(\d+)\s*[^:\n\-–—]*?[:\-–—]\s*(.+)$/gm,
    // English: "Day 1: Title", "Day 1 - Title"
    /^[ \t]*[Dd]ay\s+(\d+)\s*[:\-–—]\s*(.+)$/gm,
    // Italian: "Giorno 1: Titolo", "Giorno 1 - Titolo"
    /^[ \t]*[Gg]iorno\s+(\d+)\s*[:\-–—]\s*(.+)$/gm,
    // French: "Jour 1: Titre", "Jour 1 - Titre"
    /^[ \t]*[Jj]our\s+(\d+)\s*[:\-–—]\s*(.+)$/gm,
    // German: "Tag 1: Titel"
    /^[ \t]*[Tt]ag\s+(\d+)\s*[:\-–—]\s*(.+)$/gm,
    // Portuguese: "Dia 1: Título"
    /^[ \t]*[Dd]ia\s+(\d+)\s*[:\-–—]\s*(.+)$/gm,
    // Ordinal: "1° Día: ...", "1er día:", "2do día:"
    /^[ \t]*(\d+)[°ºªer|do|to|mo]\s*[Dd][ií]a\s*[:\-–—]\s*(.+)$/gm,
    // Bare numbered: "1. Título del día" or "1) Título del día" (only if line starts with number)
    /^[ \t]*(\d+)\s*[.)]\s+([A-ZÁÉÍÓÚÑ][^\n]{5,})$/gm,
  ];

  const headers: { index: number; fullMatch: string; dayNumber: number; title: string }[] = [];

  for (const pattern of dayPatterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const dayNum = parseInt(m[1], 10);
      const title = m[2].trim();
      // Avoid duplicates (same position)
      if (!headers.some(h => Math.abs(h.index - m!.index) < 5)) {
        headers.push({
          index: m.index,
          fullMatch: m[0],
          dayNumber: dayNum,
          title,
        });
      }
    }
  }

  // Sort headers by position in text
  headers.sort((a, b) => a.index - b.index);

  // Re-number if needed (some PDFs repeat day numbers across pages)
  for (let i = 0; i < headers.length; i++) {
    headers[i].dayNumber = i + 1;
  }

  if (headers.length === 0) {
    // FALLBACK: No day structure detected — import ALL text as one block
    return [{
      id: crypto.randomUUID(),
      dayNumber: 1,
      date: '',
      title: 'Itinerario importado desde PDF',
      description: text.replace(/\n{3,}/g, '\n\n').trim(),
      activities: [],
    }];
  }

  // 3. Extract each day's FULL content
  const days: ItineraryDay[] = [];

  for (let i = 0; i < headers.length; i++) {
    const hdr = headers[i];
    const headerLineEnd = text.indexOf('\n', hdr.index);
    const descStart = headerLineEnd > 0 ? headerLineEnd + 1 : hdr.index + hdr.fullMatch.length;
    const descEnd = (i + 1 < headers.length) ? headers[i + 1].index : text.length;

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

  // 4. Separate additional info from last day (prices, hotels, etc.)
  const lastDay = days[days.length - 1];
  const additionalInfoMarkers = [
    /^(?:HOTELES|CONDICIONES|PRECIOS|FECHAS\s+DE\s+SALIDA)\b/im,
    /^El precio incluye/im,
    /^Por motivos organizativos/im,
    /^PRECIOS\s+VENTA/im,
    /^NOCHES\s+(?:ADICIONALES|PRE)/im,
    /^(?:INCLUYE|NO INCLUYE|INCLUDES|NOT INCLUDED)\s*[:\-]/im,
    /^(?:The price includes|Price includes)/im,
    /^(?:TARIFAS|RATES|TARIFFE)\b/im,
  ];

  let splitPos = -1;
  for (const pattern of additionalInfoMarkers) {
    const match = pattern.exec(lastDay.description);
    if (match && (splitPos === -1 || match.index < splitPos)) {
      splitPos = match.index;
    }
  }

  if (splitPos > 0) {
    const itineraryPart = lastDay.description.substring(0, splitPos).trim();
    const additionalInfo = lastDay.description.substring(splitPos).trim();

    if (itineraryPart) lastDay.description = itineraryPart;

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

      // Step 2: Try AI first (best quality), then local parser as fallback
      setProgress('Analizando itinerario con IA...');
      let parsedDays: ItineraryDay[] = [];

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
        console.warn('AI extraction failed, using local parser:', aiErr);
      }

      // Step 3: Local parser fallback (always returns at least 1 day)
      if (parsedDays.length === 0) {
        setProgress('Procesando con parser local...');
        parsedDays = parseItineraryText(text);
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
