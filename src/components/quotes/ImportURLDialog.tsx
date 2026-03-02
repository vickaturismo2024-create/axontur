import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Link,
  Loader2,
  Plane,
  Building2,
  Car,
  Shield,
  Compass,
  AlertCircle,
  Trash2,
  Percent,
  DollarSign,
  Check,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Surcharge {
  type: 'percentage' | 'fixed_total' | 'fixed_per_person';
  label: string;
  value: number;
}

interface ExtractedData {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  currency: string;
  coverTitle: string;
  coverSubtitle: string;
  flights: any[];
  lodgings: any[];
  transfers: any[];
  activities: any[];
  insurance: any;
  basePrice: number;
  finalPrice: number;
  surcharges: Surcharge[];
  observations: string;
  sourceUrl: string;
  pageTitle: string;
}

interface ImportURLDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ExtractedData) => void;
}

function calculateFinalPrice(
  basePrice: number,
  surcharges: Surcharge[],
  travelers: number
): number {
  let price = basePrice;
  for (const s of surcharges) {
    if (s.type === 'percentage') {
      price += basePrice * (s.value / 100);
    }
  }
  for (const s of surcharges) {
    if (s.type === 'fixed_total') {
      price += s.value;
    } else if (s.type === 'fixed_per_person') {
      price += s.value * travelers;
    }
  }
  return Math.round(price * 100) / 100;
}

function getSurchargeAmount(
  surcharge: Surcharge,
  basePrice: number,
  travelers: number
): number {
  if (surcharge.type === 'percentage') return basePrice * (surcharge.value / 100);
  if (surcharge.type === 'fixed_total') return surcharge.value;
  if (surcharge.type === 'fixed_per_person') return surcharge.value * travelers;
  return 0;
}

function getSurchargeTypeLabel(type: string): string {
  switch (type) {
    case 'percentage': return 'Porcentaje';
    case 'fixed_total': return 'Fijo total';
    case 'fixed_per_person': return 'Fijo por persona';
    default: return type;
  }
}

export function ImportURLDialog({ open, onOpenChange, onImport }: ImportURLDialogProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [surcharges, setSurcharges] = useState<Surcharge[]>([]);

  const handleProcess = async () => {
    if (!url.trim()) {
      toast.error('Ingresá una URL');
      return;
    }

    setIsLoading(true);
    setExtracted(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-package', {
        body: { url: url.trim() },
      });

      if (error) {
        toast.error(error.message || 'Error al procesar la URL');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'No se pudo extraer información');
        return;
      }

      setExtracted(data.data);
      setSurcharges(data.data.surcharges || []);
      toast.success('Paquete extraído correctamente');
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Error de conexión. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveSurcharge = (index: number) => {
    setSurcharges((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (!extracted) return;

    const finalPrice = calculateFinalPrice(
      extracted.basePrice,
      surcharges,
      extracted.travelers
    );

    onImport({
      ...extracted,
      surcharges,
      finalPrice,
    });

    // Reset state
    setUrl('');
    setExtracted(null);
    setSurcharges([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setUrl('');
    setExtracted(null);
    setSurcharges([]);
    onOpenChange(false);
  };

  const currentFinalPrice = extracted
    ? calculateFinalPrice(extracted.basePrice, surcharges, extracted.travelers)
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Link className="h-5 w-5" />
            Importar desde URL
          </DialogTitle>
          <DialogDescription>
            Pegá el link de un paquete de un mayorista y extraeremos la información automáticamente.
          </DialogDescription>
        </DialogHeader>

        {/* URL Input */}
        <div className="space-y-2">
          <Label htmlFor="import-url">URL del paquete</Label>
          <div className="flex gap-2">
            <Input
              id="import-url"
              placeholder="https://www.mayorista.com/paquete-cancun..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProcess();
              }}
            />
            <Button onClick={handleProcess} disabled={isLoading || !url.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Analizar'
              )}
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">
              Analizando la página y extrayendo datos del paquete...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Esto puede tardar unos segundos
            </p>
          </div>
        )}

        {/* Extracted Data Preview */}
        {extracted && !isLoading && (
          <div className="space-y-4">
            <Separator />

            {/* Destination & Dates */}
            <div>
              <h3 className="font-semibold text-lg">{extracted.destination}</h3>
              <p className="text-sm text-muted-foreground">
                {extracted.startDate && extracted.endDate
                  ? `${extracted.startDate} → ${extracted.endDate}`
                  : 'Fechas no detectadas'}
                {extracted.travelers > 0 && ` · ${extracted.travelers} pasajeros`}
              </p>
            </div>

            {/* Services summary */}
            <div className="flex flex-wrap gap-2">
              {extracted.flights?.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Plane className="h-3 w-3" />
                  {extracted.flights.length} vuelo{extracted.flights.length > 1 ? 's' : ''}
                </Badge>
              )}
              {extracted.lodgings?.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  {extracted.lodgings.length} alojamiento{extracted.lodgings.length > 1 ? 's' : ''}
                </Badge>
              )}
              {extracted.transfers?.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Car className="h-3 w-3" />
                  {extracted.transfers.length} transfer{extracted.transfers.length > 1 ? 's' : ''}
                </Badge>
              )}
              {extracted.activities?.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Compass className="h-3 w-3" />
                  {extracted.activities.length} actividad{extracted.activities.length > 1 ? 'es' : ''}
                </Badge>
              )}
              {extracted.insurance?.company && (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Seguro
                </Badge>
              )}
            </div>

            {/* Pricing with surcharges */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Precio base del mayorista</span>
                  <span className="font-mono font-medium">
                    {extracted.currency} {extracted.basePrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Surcharges */}
                {surcharges.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Recargos detectados
                      </div>
                      {surcharges.map((surcharge, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            {surcharge.type === 'percentage' ? (
                              <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <div>
                              <span className="text-sm">{surcharge.label}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({surcharge.type === 'percentage'
                                  ? `${surcharge.value}%`
                                  : `${extracted.currency} ${surcharge.value}`}
                                {surcharge.type === 'fixed_per_person' && ' por persona'})
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">
                              +{extracted.currency}{' '}
                              {getSurchargeAmount(
                                surcharge,
                                extracted.basePrice,
                                extracted.travelers
                              ).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRemoveSurcharge(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Separator />

                {/* Final price */}
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Costo final (para cargar al presupuesto)</span>
                  <span className="text-lg font-bold font-mono text-primary">
                    {extracted.currency} {currentFinalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {surcharges.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Este precio incluye los recargos detectados y se cargará como costo neto.
                    Vos definís tu precio de venta en el presupuesto.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Observations */}
            {extracted.observations && (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Observaciones del mayorista:</p>
                <p className="text-sm">{extracted.observations}</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} className="gap-1.5">
                <Check className="h-4 w-4" />
                Crear presupuesto con estos datos
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
