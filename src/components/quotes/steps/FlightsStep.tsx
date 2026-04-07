import { Quote, Flight, LuggageType, LUGGAGE_LABELS } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SupplierSelect } from '@/components/quotes/SupplierSelect';
import { PNRParserDialog } from '@/components/quotes/PNRParserDialog';
import { Plus, Trash2 } from 'lucide-react';

interface FlightsStepProps {
  quote: Quote;
  onUpdate: (updates: Partial<Quote>) => void;
}

export function FlightsStep({ quote, onUpdate }: FlightsStepProps) {
  const addFlight = (isOption: boolean = false) => {
    const optionCount = quote.flights.filter(f => f.isOption).length;
    const label = isOption ? `Opción ${optionCount + 1}` : '';
    const newFlight: Flight = {
      id: crypto.randomUUID(),
      origin: '', destination: '', date: '', departureTime: '', arrivalTime: '',
      airline: '', flightNumber: '', luggage: '', notes: '',
      isOption, optionLabel: label, flightType: 'direct',
    };
    onUpdate({ flights: [...quote.flights, newFlight] });
  };

  const updateFlight = (id: string, updates: Partial<Flight>) => {
    onUpdate({ flights: quote.flights.map(f => f.id === id ? { ...f, ...updates } : f) });
  };

  const removeFlight = (id: string) => {
    onUpdate({ flights: quote.flights.filter(f => f.id !== id) });
  };

  const handleFlightsParsed = (parsedFlights: Omit<Flight, 'id'>[]) => {
    const flightsWithIds = parsedFlights.map(flight => ({
      ...flight, id: crypto.randomUUID(), luggage: flight.luggage || '', notes: flight.notes || '',
    }));
    onUpdate({ flights: [...quote.flights, ...flightsWithIds] });
  };

  return (
    <div className="space-y-4">
      <div data-tour="flight-instructions" className="rounded-lg border border-gold/30 bg-gold/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Consejo:</strong> Puedes agregar múltiples opciones de vuelo (directo, con escala, distintos equipajes) para que el pasajero elija.
        </p>
      </div>

      {quote.flights.map((flight, idx) => (
        <Card key={flight.id} className={`relative ${flight.isOption ? 'border-dashed border-accent' : ''}`}>
          <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-destructive" onClick={() => removeFlight(flight.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-4">
              <p className="font-medium text-gold">
                {flight.isOption ? `🏷️ ${flight.optionLabel || `Opción ${idx + 1}`}` : `Tramo ${idx + 1}`}
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={flight.isOption || false}
                  onChange={(e) => updateFlight(flight.id, { isOption: e.target.checked, optionLabel: e.target.checked ? `Opción ${idx + 1}` : '' })}
                  className="rounded border-gray-300" />
                Es una opción alternativa
              </label>
            </div>

            {flight.isOption && (
              <div className="mb-4">
                <Label>Etiqueta de la opción</Label>
                <Input value={flight.optionLabel || ''} onChange={(e) => updateFlight(flight.id, { optionLabel: e.target.value })} placeholder="Vuelo directo con equipaje completo" />
              </div>
            )}

            <div className="mb-4">
              <Label className="mb-2 block">Tipo de vuelo</Label>
              <RadioGroup value={flight.flightType || 'direct'} onValueChange={(value: 'direct' | 'stopover' | 'charter') => updateFlight(flight.id, { flightType: value })} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="direct" id={`flight-type-direct-${flight.id}`} />
                  <Label htmlFor={`flight-type-direct-${flight.id}`} className="cursor-pointer font-normal">✈️ Directo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stopover" id={`flight-type-stopover-${flight.id}`} />
                  <Label htmlFor={`flight-type-stopover-${flight.id}`} className="cursor-pointer font-normal">✈️ Con escala</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="charter" id={`flight-type-charter-${flight.id}`} />
                  <Label htmlFor={`flight-type-charter-${flight.id}`} className="cursor-pointer font-normal">✈️ Charter</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Origen</Label>
                <Input value={flight.origin} onChange={(e) => updateFlight(flight.id, { origin: e.target.value })} placeholder="Buenos Aires (EZE)" />
              </div>
              <div>
                <Label>Destino</Label>
                <Input value={flight.destination} onChange={(e) => updateFlight(flight.id, { destination: e.target.value })} placeholder="Cancún (CUN)" />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={flight.date} onChange={(e) => updateFlight(flight.id, { date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Salida</Label>
                  <Input type="time" value={flight.departureTime} onChange={(e) => updateFlight(flight.id, { departureTime: e.target.value })} />
                </div>
                <div>
                  <Label>Llegada</Label>
                  <Input value={flight.arrivalTime} onChange={(e) => updateFlight(flight.id, { arrivalTime: e.target.value })} placeholder="16:45" />
                </div>
              </div>
              <div>
                <Label>Aerolínea</Label>
                <Input value={flight.airline} onChange={(e) => updateFlight(flight.id, { airline: e.target.value })} placeholder="Aeromexico" />
              </div>
              <div>
                <Label>Número de vuelo</Label>
                <Input value={flight.flightNumber} onChange={(e) => updateFlight(flight.id, { flightNumber: e.target.value })} placeholder="AM456" />
              </div>
              <div className="md:col-span-2">
                <Label>Equipaje</Label>
                <div className="flex gap-2">
                  <Select value={flight.luggageType || 'custom'} onValueChange={(value: LuggageType) => {
                    if (value === 'custom') { updateFlight(flight.id, { luggageType: 'custom' }); }
                    else { updateFlight(flight.id, { luggageType: value, luggage: LUGGAGE_LABELS[value] }); }
                  }}>
                    <SelectTrigger className="w-1/2"><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">🎒 Artículo Personal</SelectItem>
                      <SelectItem value="personal_carryon">🎒 + 🧳 Art. Personal + Carry On</SelectItem>
                      <SelectItem value="personal_carryon_checked">🎒 + 🧳 + 🛄 Art. Personal + Carry On + Bodega</SelectItem>
                      <SelectItem value="custom">✏️ Personalizado...</SelectItem>
                    </SelectContent>
                  </Select>
                  {(flight.luggageType === 'custom' || !flight.luggageType) && (
                    <Input className="flex-1" value={flight.luggage} onChange={(e) => updateFlight(flight.id, { luggage: e.target.value })} placeholder="Ej: 2 valijas de 23kg + carry-on" />
                  )}
                </div>
                {flight.luggageType && flight.luggageType !== 'custom' && (
                  <p className="text-xs text-muted-foreground mt-1">{LUGGAGE_LABELS[flight.luggageType]}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label>Vincular vuelos (escala / ida y vuelta)</Label>
                <Select value={flight.connectionGroupId || 'none'} onValueChange={(value) => {
                  if (value === 'none') { updateFlight(flight.id, { connectionGroupId: undefined }); }
                  else if (value === 'new') { updateFlight(flight.id, { connectionGroupId: crypto.randomUUID(), flightType: 'stopover' }); }
                  else { updateFlight(flight.id, { connectionGroupId: value, flightType: 'stopover' }); }
                }}>
                  <SelectTrigger><SelectValue placeholder="Sin vincular (vuelo independiente)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">🚀 Sin vincular (vuelo independiente)</SelectItem>
                    <SelectItem value="new">➕ Crear nuevo grupo de vuelos</SelectItem>
                    {quote.flights.filter(f => f.id !== flight.id && f.connectionGroupId)
                      .reduce((groups, f) => { if (f.connectionGroupId && !groups.includes(f.connectionGroupId)) groups.push(f.connectionGroupId); return groups; }, [] as string[])
                      .map((groupId, gIdx) => {
                        const groupFlights = quote.flights.filter(f => f.connectionGroupId === groupId);
                        const label = groupFlights.map(f => `${f.origin}→${f.destination}`).join(' + ');
                        return <SelectItem key={groupId} value={groupId}>🔗 Grupo {gIdx + 1}: {label}</SelectItem>;
                      })}
                  </SelectContent>
                </Select>
                {flight.connectionGroupId && <p className="text-xs text-amber-600 mt-1">✈️ Este vuelo está vinculado con otros tramos del mismo paquete aéreo</p>}
              </div>
              <div className="md:col-span-2">
                <Label>Notas</Label>
                <Textarea value={flight.notes} onChange={(e) => updateFlight(flight.id, { notes: e.target.value })} placeholder="Escala, observaciones..." rows={2} />
              </div>
              <SupplierSelect value={flight.supplier} onChange={(val) => updateFlight(flight.id, { supplier: val })} />
              <div className="grid grid-cols-2 gap-2 md:col-span-2">
                <div>
                  <Label>Costo neto ({quote.trip.currency})</Label>
                  <Input type="number" min={0} step="0.01" value={flight.cost || ''} onChange={(e) => updateFlight(flight.id, { cost: parseFloat(e.target.value) || undefined })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Precio venta ({quote.trip.currency})</Label>
                  <Input type="number" min={0} step="0.01" value={flight.price || ''} onChange={(e) => updateFlight(flight.id, { price: parseFloat(e.target.value) || undefined })} placeholder="0.00" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button data-tour="add-flight" variant="outline" onClick={() => addFlight(false)} className="flex-1">
          <Plus className="mr-2 h-4 w-4" />Agregar vuelo
        </Button>
        <Button data-tour="add-flight-option" variant="outline" onClick={() => addFlight(true)} className="flex-1 border-dashed border-accent text-accent hover:bg-accent/10">
          <Plus className="mr-2 h-4 w-4" />Agregar opción de vuelo
        </Button>
        <div data-tour="pnr-parser"><PNRParserDialog onFlightsParsed={handleFlightsParsed} /></div>
      </div>
    </div>
  );
}
