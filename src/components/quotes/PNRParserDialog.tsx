import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Flight } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';

interface PNRParserDialogProps {
  onFlightsParsed: (flights: Omit<Flight, 'id'>[]) => void;
}

export function PNRParserDialog({ onFlightsParsed }: PNRParserDialogProps) {
  const [open, setOpen] = useState(false);
  const [pnrText, setPnrText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleParse = async () => {
    if (!pnrText.trim()) {
      toast.error('Por favor, pegá el PNR del GDS');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Debés iniciar sesión para usar esta función');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-pnr`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ pnrText }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          toast.error('Sesión expirada. Por favor, iniciá sesión nuevamente.');
          return;
        }
        if (response.status === 429) {
          toast.error('Límite de solicitudes excedido. Intentá de nuevo más tarde.');
          return;
        }
        if (response.status === 402) {
          toast.error('Créditos insuficientes. Por favor, agregá créditos a tu workspace.');
          return;
        }
        throw new Error(errorData.error || 'Error al parsear el PNR');
      }

      const data = await response.json();

      if (!data.flights || data.flights.length === 0) {
        toast.error('No se encontraron vuelos en el PNR');
        return;
      }

      onFlightsParsed(data.flights);
      toast.success(`${data.flights.length} vuelo(s) importado(s) correctamente`);
      setPnrText('');
      setOpen(false);
    } catch (error) {
      console.error('Error parsing PNR:', error);
      toast.error(error instanceof Error ? error.message : 'Error al parsear el PNR');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Importar PNR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            Importar vuelos desde PNR
          </DialogTitle>
          <DialogDescription>
            Pegá el PNR o la información de vuelos del GDS (Amadeus, Sabre, Galileo, etc.) y la IA
            extraerá automáticamente los datos de los vuelos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="pnr-text">Información del PNR</Label>
            <Textarea
              id="pnr-text"
              value={pnrText}
              onChange={(e) => setPnrText(e.target.value)}
              placeholder={`Ejemplo de formato Amadeus:
1 AR1234 Y 15MAR EZEEZE HK2 0830 1645
2 AM 456 Y 15MAR MEXIMIA HK2 1900 2230

O cualquier formato de GDS...`}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium">Formatos soportados:</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>Amadeus, Sabre, Galileo, Worldspan</li>
              <li>Texto libre con información de vuelos</li>
              <li>Itinerarios copiados de emails</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleParse} disabled={isLoading} className="gap-2">
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
