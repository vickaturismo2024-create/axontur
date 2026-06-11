import { Quote, Lodging } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SupplierSelect } from '@/components/quotes/SupplierSelect';
import { OccupancyConfig } from '@/components/quotes/OccupancyConfig';
import { Plus, Trash2 } from 'lucide-react';
import { OperativeFields } from '@/components/shared/OperativeFields';

interface LodgingStepProps {
  quote: Quote;
  onUpdate: (updates: Partial<Quote>) => void;
}

const createEmptyLodging = (isOption: boolean = false, optionLabel: string = ''): Lodging => ({
  id: crypto.randomUUID(),
  name: '', category: '', address: '', checkIn: '', checkOut: '',
  regime: '', roomType: '', nights: 0, notes: '', destination: '',
  isOption, optionLabel, pricePerNight: undefined,
});

export function LodgingStep({ quote, onUpdate }: LodgingStepProps) {
  const addLodging = (isOption: boolean = false) => {
    const optionCount = (quote.lodgings || []).filter(l => l.isOption).length;
    const label = isOption ? `Opción ${optionCount + 1}` : '';
    onUpdate({ lodgings: [...(quote.lodgings || []), createEmptyLodging(isOption, label)] });
  };

  const updateLodging = (id: string, updates: Partial<Lodging>) => {
    onUpdate({ lodgings: (quote.lodgings || []).map(l => l.id === id ? { ...l, ...updates } : l) });
  };

  const removeLodging = (id: string) => {
    onUpdate({ lodgings: (quote.lodgings || []).filter(l => l.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div data-tour="lodging-instructions" className="rounded-lg border border-gold/30 bg-gold/5 p-4">
        <p className="text-sm text-muted-foreground">
          {quote.trip.type === 'multiDestination'
            ? <><strong>Viaje multi-destino:</strong> Agrega un alojamiento por cada destino del tour.</>
            : <><strong>Consejo:</strong> Puedes agregar múltiples opciones de alojamiento para que el pasajero elija.</>}
        </p>
      </div>

      <div className="space-y-4">
        {(quote.lodgings || []).map((lodging, idx) => (
          <Card key={lodging.id} className={`relative ${lodging.isOption ? 'border-dashed border-accent' : ''}`}>
            <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-destructive" onClick={() => removeLodging(lodging.id!)}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center gap-4">
                <p className="font-medium text-gold">
                  {lodging.isOption ? `🏷️ ${lodging.optionLabel || `Opción ${idx + 1}`}` : `Alojamiento ${idx + 1}`}
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={lodging.isOption || false}
                    onChange={(e) => updateLodging(lodging.id!, { isOption: e.target.checked, optionLabel: e.target.checked ? `Opción ${idx + 1}` : '' })}
                    className="rounded border-gray-300" />
                  Es una opción alternativa
                </label>
              </div>

              {lodging.isOption && (
                <div className="mb-4">
                  <Label>Etiqueta de la opción</Label>
                  <Input value={lodging.optionLabel || ''} onChange={(e) => updateLodging(lodging.id!, { optionLabel: e.target.value })} placeholder="Opción económica, Opción premium..." />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Destino / Ciudad</Label>
                  <Input value={lodging.destination || ''} onChange={(e) => updateLodging(lodging.id!, { destination: e.target.value })} placeholder="París, Francia" />
                </div>
                <div>
                  <Label>Nombre del hotel</Label>
                  <Input value={lodging.name} onChange={(e) => updateLodging(lodging.id!, { name: e.target.value })} placeholder="Grand Fiesta Americana" />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input value={lodging.category} onChange={(e) => updateLodging(lodging.id!, { category: e.target.value })} placeholder="5 Estrellas" />
                </div>
                <div className="md:col-span-2">
                  <Label>Dirección</Label>
                  <Input value={lodging.address} onChange={(e) => updateLodging(lodging.id!, { address: e.target.value })} placeholder="Blvd. Kukulcán Km 12.5" />
                </div>
                <div>
                  <Label>Check-in</Label>
                  <Input type="date" value={lodging.checkIn} onChange={(e) => updateLodging(lodging.id!, { checkIn: e.target.value })} />
                </div>
                <div>
                  <Label>Check-out</Label>
                  <Input type="date" value={lodging.checkOut} onChange={(e) => updateLodging(lodging.id!, { checkOut: e.target.value })} />
                </div>
                <div>
                  <Label>Régimen</Label>
                  <Input value={lodging.regime} onChange={(e) => updateLodging(lodging.id!, { regime: e.target.value })} placeholder="All Inclusive" />
                </div>
                <div>
                  <Label>Tipo de habitación</Label>
                  <Input value={lodging.roomType} onChange={(e) => updateLodging(lodging.id!, { roomType: e.target.value })} placeholder="Suite Junior" />
                </div>
                <div>
                  <Label>Noches</Label>
                  <Input type="number" min={0} value={lodging.nights || ''} onChange={(e) => updateLodging(lodging.id!, { nights: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} />
                </div>
                <div>
                  <Label>Notas</Label>
                  <Input value={lodging.notes} onChange={(e) => updateLodging(lodging.id!, { notes: e.target.value })} placeholder="Vista al mar..." />
                </div>
                <div className="md:col-span-2">
                  <OperativeFields 
                    data={lodging} 
                    onChange={(updates) => updateLodging(lodging.id!, updates)} 
                    currency={quote.trip.currency} 
                  />
                </div>

                {/* Pricing Mode */}
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <Label className="mb-2 block">Modo de precio</Label>
                    <RadioGroup value={lodging.pricingMode || 'perNight'} onValueChange={(value: 'perNight' | 'total') => updateLodging(lodging.id!, { pricingMode: value })} className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="perNight" id={`perNight-${lodging.id}`} />
                        <Label htmlFor={`perNight-${lodging.id}`} className="font-normal cursor-pointer">Por noche</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="total" id={`total-${lodging.id}`} />
                        <Label htmlFor={`total-${lodging.id}`} className="font-normal cursor-pointer">Total estadía</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {(lodging.pricingMode || 'perNight') === 'perNight' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Costo por noche ({quote.trip.currency})</Label>
                        <Input type="number" min={0} step="0.01" value={lodging.costPerNight || ''} onChange={(e) => updateLodging(lodging.id!, { costPerNight: parseFloat(e.target.value) || undefined })} placeholder="0.00" />
                      </div>
                      <div>
                        <Label>Precio por noche ({quote.trip.currency})</Label>
                        <Input type="number" min={0} step="0.01" value={lodging.pricePerNight || ''} onChange={(e) => updateLodging(lodging.id!, { pricePerNight: parseFloat(e.target.value) || undefined })} placeholder="0.00" />
                      </div>
                      {lodging.nights > 0 && (lodging.costPerNight || lodging.pricePerNight) && (
                        <div className="col-span-2 text-sm text-muted-foreground">
                          Total calculado: {lodging.nights} noches × {quote.trip.currency} {(lodging.pricePerNight || 0).toFixed(2)} = {quote.trip.currency} {((lodging.pricePerNight || 0) * lodging.nights).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Costo total ({lodging.nights} noches)</Label>
                        <Input type="number" min={0} step="0.01" value={lodging.totalCost || ''} onChange={(e) => updateLodging(lodging.id!, { totalCost: parseFloat(e.target.value) || undefined })} placeholder="0.00" />
                      </div>
                      <div>
                        <Label>Precio total ({lodging.nights} noches)</Label>
                        <Input type="number" min={0} step="0.01" value={lodging.totalPrice || ''} onChange={(e) => updateLodging(lodging.id!, { totalPrice: parseFloat(e.target.value) || undefined })} placeholder="0.00" />
                      </div>
                    </div>
                  )}
                </div>

                <OccupancyConfig
                  lodging={lodging}
                  totalTravelers={quote.trip.travelers}
                  currency={quote.trip.currency}
                  onUpdate={(updates) => updateLodging(lodging.id!, updates)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button data-tour="add-lodging" variant="outline" onClick={() => addLodging(false)} className="flex-1">
          <Plus className="mr-2 h-4 w-4" />Agregar alojamiento
        </Button>
        <Button data-tour="add-lodging-option" variant="outline" onClick={() => addLodging(true)} className="flex-1 border-dashed">
          <Plus className="mr-2 h-4 w-4" />Agregar opción alternativa
        </Button>
      </div>
    </div>
  );
}
