import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw } from 'lucide-react';
import { parsePNR } from '@/lib/pnrParser';
import { useUpdateReservationFromPNR } from '@/hooks/useFlightReservations';
import { toast } from 'sonner';

interface ReimportPNRDialogProps {
  reservationId: string;
  currentLocator?: string | null;
  currentGds?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReimportPNRDialog({
  reservationId,
  currentLocator,
  currentGds,
  open,
  onOpenChange,
}: ReimportPNRDialogProps) {
  const [rawText, setRawText] = useState('');
  const updateFromPNR = useUpdateReservationFromPNR();

  const handleSubmit = async () => {
    if (!rawText.trim()) {
      toast.error('Pegá el texto del PNR actualizado');
      return;
    }
    const parsed = parsePNR(rawText);
    if (parsed.segments.length === 0) {
      toast.error('No se detectaron segmentos en el texto');
      return;
    }

    if (currentLocator && parsed.locator && parsed.locator.toUpperCase() !== currentLocator.toUpperCase()) {
      const ok = window.confirm(
        `El localizador del PNR pegado (${parsed.locator}) no coincide con el actual (${currentLocator}). ¿Continuar igual?`
      );
      if (!ok) return;
    }

    try {
      const result = await updateFromPNR.mutateAsync({
        reservationId,
        parsed: {
          locator: parsed.locator || currentLocator || undefined,
          passengers: parsed.passengers,
          segments: parsed.segments,
          rawText,
        },
        gds: currentGds || undefined,
      });
      if (result.changesCount > 0) {
        toast.success(`Reserva actualizada. Se detectaron ${result.changesCount} cambio(s).`);
      } else {
        toast.success('Reserva actualizada. Sin cambios respecto al PNR anterior.');
      }
      setRawText('');
      onOpenChange(false);
    } catch {
      toast.error('Error al actualizar la reserva');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Re-importar PNR</DialogTitle>
          <DialogDescription>
            Pegá el PNR actualizado desde el GDS. Vamos a comparar contra los segmentos actuales y registrar
            cambios de horario, cancelaciones, vuelos nuevos o eliminados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Texto del PNR actualizado</Label>
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Pegá acá el PNR actualizado..."
            className="min-h-[260px] font-mono text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateFromPNR.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateFromPNR.isPending || !rawText.trim()}>
            {updateFromPNR.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Comparar y actualizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
