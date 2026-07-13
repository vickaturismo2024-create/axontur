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

/**
 * Client-side parser for itinerary PDFs.
 * Detects patterns like "Día 1 ...: Title" or "Day 1: Title"
 * and extracts the description text between days.
 */
function parseItineraryText(text: string): ItineraryDay[] {
  // Normalize whitespace but keep line breaks
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Pattern to match day headers:
  // "Día 1 Miércoles: Como"
  // "Día 2 Jueves: Como – Lago de Como (Bellagio - Cernobbio) - Como"
  // "DIA 1: Título"
  // "Day 1: Title"
  // Also matches "Día 1:" without day-of-week
  const dayPattern = /(?:^|\n)\s*[Dd][ií]a\s+(\d+)\s*[^\n:]*?:\s*([^\n]+)/g;

  const matches: { index: number; dayNumber: number; title: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = dayPattern.exec(normalized)) !== null) {
    matches.push({
      index: match.index,
      dayNumber: parseInt(match[1], 10),
      title: match[2].trim(),
    });
  }

  if (matches.length === 0) return [];

  const days: ItineraryDay[] = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const headerEnd = normalized.indexOf('\n', current.index + 1);
    const startOfDescription = headerEnd > 0 ? headerEnd + 1 : current.index;

    // End of this day's text is the start of the next day header, or end of text
    let endOfDescription: number;
    if (i + 1 < matches.length) {
      endOfDescription = matches[i + 1].index;
    } else {
      // For the last day, stop at common ending sections
      const stopPatterns = [
        /\n\s*(?:HOTELES|CONDICIONES|PRECIOS|El precio incluye|El precio NO incluye|NOCHES ADICIONALES|NOCHES PRE)/i,
        /\n\s*Por motivos organizativos/i,
      ];
      endOfDescription = normalized.length;
      for (const sp of stopPatterns) {
        const stopMatch = sp.exec(normalized.substring(startOfDescription));
        if (stopMatch) {
          const pos = startOfDescription + stopMatch.index;
          if (pos < endOfDescription) endOfDescription = pos;
        }
      }
    }

    const rawDescription = normalized.substring(startOfDescription, endOfDescription).trim();

    // Clean up the description: remove excessive whitespace, headers, page info
    const cleanedDescription = rawDescription
      .replace(/Via Mulini.*?(?:\n|$)/gi, '')
      .replace(/Tel\..*?(?:\n|$)/gi, '')
      .replace(/info@.*?(?:\n|$)/gi, '')
      .replace(/Partita Iva.*?(?:\n|$)/gi, '')
      .replace(/SALES\s*&\s*MARKETING.*?(?:\n|$)/gi, '')
      .replace(/DEPARTMENT.*?(?:\n|$)/gi, '')
      .replace(/LAGOS DEL NORTE.*?(?:\n|$)/gi, '')
      .replace(/MIERCOLES-SABADO.*?(?:\n|$)/gi, '')
      .replace(/\d+\s*DIAS\/\d+\s*NOCHES.*?(?:\n|$)/gi, '')
      .replace(/^\d+\s*$/gm, '') // page numbers
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Extract activities from the description
    const activities = extractActivities(cleanedDescription, current.title);

    days.push({
      id: crypto.randomUUID(),
      dayNumber: current.dayNumber,
      date: '',
      title: `Día ${current.dayNumber}: ${current.title}`,
      description: cleanedDescription,
      activities,
    });
  }

  return days;
}

/**
 * Extract meaningful activities from a day's description text.
 */
function extractActivities(description: string, title: string): string[] {
  const activities: string[] = [];
  const lowerDesc = description.toLowerCase();

  // Common travel activities detection
  const activityPatterns: [RegExp, string][] = [
    [/traslado\s+(?:grupal\s+)?(?:de\s+)?(?:llegada|al|del|de salida)[^.]*\./i, ''],
    [/llegada\s+al\s+aeropuerto[^.]*\./i, ''],
    [/desayuno\s+(?:en\s+el\s+hotel|buffet)[^.]*/i, ''],
    [/cena\s+y\s+alojamiento[^.]*/i, ''],
    [/alojamiento[^.]*/i, ''],
    [/check[- ]?in[^.]*/i, ''],
    [/check[- ]?out[^.]*/i, ''],
    [/visita(?:remos)?\s+[^.]+\./i, ''],
    [/excursi[oó]n\s+[^.]+\./i, ''],
    [/salida\s+(?:en|hacia)\s+[^.]+\./i, ''],
  ];

  // Extract sentences that contain activity-like content
  const sentences = description
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  // Key activity keywords
  const keywords = [
    'traslado', 'llegada', 'desayuno', 'almuerzo', 'cena', 'alojamiento',
    'excursión', 'visita', 'recorrido', 'paseo', 'ferry', 'barco',
    'check-in', 'check-out', 'salida', 'regreso', 'tiempo libre',
    'embarque', 'tour', 'explorar',
  ];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (keywords.some(k => lower.includes(k))) {
      // Truncate long sentences
      const activity = sentence.length > 120
        ? sentence.substring(0, 117) + '...'
        : sentence;
      if (!activities.includes(activity)) {
        activities.push(activity);
      }
    }
  }

  // If no activities extracted, create basic ones from key phrases
  if (activities.length === 0) {
    if (lowerDesc.includes('desayuno')) activities.push('Desayuno en el hotel');
    if (lowerDesc.includes('cena')) activities.push('Cena');
    if (lowerDesc.includes('alojamiento')) activities.push('Alojamiento');
    if (title) activities.push(title);
  }

  return activities;
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

      // Step 2: Try local parser first (fast, no cost)
      setProgress('Analizando estructura del itinerario...');
      let parsedDays = parseItineraryText(text);

      // Step 3: If local parser found days, use them. Otherwise try AI fallback.
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
          console.warn('AI fallback failed:', aiErr);
        }
      }

      if (parsedDays.length === 0) {
        toast.error('No se pudieron extraer días de itinerario del PDF. Verificá que el PDF contenga un itinerario día por día.');
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
