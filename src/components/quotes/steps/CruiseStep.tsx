import { useState } from 'react';
import { Quote, Cruise, CruisePort, CruiseExtras } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SupplierSelect } from '@/components/quotes/SupplierSelect';
import { CruiseItineraryPasteDialog } from '@/components/quotes/CruiseItineraryPasteDialog';
import { Plus, Trash2, Ship, ClipboardPaste } from 'lucide-react';
import { OperativeFields } from '@/components/shared/OperativeFields';

interface CruiseStepProps {
  quote: Quote;
  onUpdate: (updates: Partial<Quote>) => void;
}

const createEmptyCruise = (): Cruise => ({
  id: crypto.randomUUID(), shipName: '', company: '', cabinType: '', cabinNumber: '', deck: '',
  embarkationPort: '', embarkationDate: '', disembarkationPort: '', disembarkationDate: '',
  nights: 0, regime: '', itinerary: [],
  extras: { tips: '', beverages: '', wifi: '', excursions: '', specialDining: '', spa: '', other: '' },
  notes: '',
});

const createEmptyCruisePort = (): CruisePort => ({
  id: crypto.randomUUID(), day: 1, port: '', country: '', arrivalTime: '', departureTime: '', notes: '',
});

export function CruiseStep({ quote, onUpdate }: CruiseStepProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const initCruise = () => { if (!quote.cruise) onUpdate({ cruise: createEmptyCruise() }); };

  const updateCruise = (updates: Partial<Cruise>) => {
    if (quote.cruise) onUpdate({ cruise: { ...quote.cruise, ...updates } });
  };

  const addCruisePort = () => {
    if (quote.cruise) {
      const newPort = createEmptyCruisePort();
      newPort.day = quote.cruise.itinerary.length + 1;
      onUpdate({ cruise: { ...quote.cruise, itinerary: [...quote.cruise.itinerary, newPort] } });
    }
  };

  const updateCruisePort = (id: string, updates: Partial<CruisePort>) => {
    if (quote.cruise) onUpdate({ cruise: { ...quote.cruise, itinerary: quote.cruise.itinerary.map(p => p.id === id ? { ...p, ...updates } : p) } });
  };

  const removeCruisePort = (id: string) => {
    if (quote.cruise) onUpdate({ cruise: { ...quote.cruise, itinerary: quote.cruise.itinerary.filter(p => p.id !== id).map((p, idx) => ({ ...p, day: idx + 1 })) } });
  };

  const updateCruiseExtras = (updates: Partial<CruiseExtras>) => {
    if (quote.cruise) onUpdate({ cruise: { ...quote.cruise, extras: { ...quote.cruise.extras, ...updates } } });
  };

  if (!quote.cruise) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Ship className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">No hay crucero configurado</p>
        <Button onClick={initCruise} className="mt-4"><Plus className="mr-2 h-4 w-4" />Agregar crucero</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Información del barco</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Nombre del barco</Label><Input value={quote.cruise.shipName} onChange={(e) => updateCruise({ shipName: e.target.value })} placeholder="Norwegian Escape" /></div>
            <div><Label>Compañía</Label><Input value={quote.cruise.company} onChange={(e) => updateCruise({ company: e.target.value })} placeholder="Norwegian Cruise Line" /></div>
            <div><Label>Tipo de cabina</Label><Input value={quote.cruise.cabinType} onChange={(e) => updateCruise({ cabinType: e.target.value })} placeholder="Balcón" /></div>
            <div><Label>Número de cabina</Label><Input value={quote.cruise.cabinNumber} onChange={(e) => updateCruise({ cabinNumber: e.target.value })} placeholder="9124" /></div>
            <div><Label>Cubierta</Label><Input value={quote.cruise.deck} onChange={(e) => updateCruise({ deck: e.target.value })} placeholder="Deck 9" /></div>
            <div><Label>Régimen</Label><Input value={quote.cruise.regime} onChange={(e) => updateCruise({ regime: e.target.value })} placeholder="Full Board" /></div>
            <div><Label>Noches</Label><Input type="number" min={0} value={quote.cruise.nights || ''} onChange={(e) => updateCruise({ nights: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) })} /></div>
            <div className="md:col-span-2">
              <OperativeFields 
                data={quote.cruise} 
                onChange={(updates) => updateCruise(updates)} 
                currency={quote.trip.currency} 
              />
            </div>
            <div><Label>Costo neto total ({quote.trip.currency})</Label><Input type="number" min={0} step="0.01" value={quote.cruise.cost || ''} onChange={(e) => updateCruise({ cost: parseFloat(e.target.value) || undefined })} placeholder="0.00" /></div>
            <div><Label>Precio venta total ({quote.trip.currency})</Label><Input type="number" min={0} step="0.01" value={quote.cruise.price || ''} onChange={(e) => updateCruise({ price: parseFloat(e.target.value) || undefined })} placeholder="0.00" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Embarque y desembarque</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Puerto de embarque</Label><Input value={quote.cruise.embarkationPort} onChange={(e) => updateCruise({ embarkationPort: e.target.value })} placeholder="Miami, Florida" /></div>
            <div><Label>Fecha de embarque</Label><Input type="date" value={quote.cruise.embarkationDate} onChange={(e) => updateCruise({ embarkationDate: e.target.value })} /></div>
            <div><Label>Puerto de desembarque</Label><Input value={quote.cruise.disembarkationPort} onChange={(e) => updateCruise({ disembarkationPort: e.target.value })} placeholder="Miami, Florida" /></div>
            <div><Label>Fecha de desembarque</Label><Input type="date" value={quote.cruise.disembarkationDate} onChange={(e) => updateCruise({ disembarkationDate: e.target.value })} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Itinerario del crucero</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
            <ClipboardPaste className="mr-2 h-4 w-4" />Pegar itinerario
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {quote.cruise.itinerary.map((port) => (
            <Card key={port.id} className="relative">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-destructive" onClick={() => removeCruisePort(port.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <CardContent className="pt-6">
                <p className="mb-4 font-medium text-gold">Día {port.day}</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div><Label>Puerto</Label><Input value={port.port} onChange={(e) => updateCruisePort(port.id, { port: e.target.value })} placeholder="Cozumel" /></div>
                  <div><Label>País</Label><Input value={port.country} onChange={(e) => updateCruisePort(port.id, { country: e.target.value })} placeholder="México" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Llegada</Label><Input type="time" value={port.arrivalTime} onChange={(e) => updateCruisePort(port.id, { arrivalTime: e.target.value })} /></div>
                    <div><Label>Salida</Label><Input type="time" value={port.departureTime} onChange={(e) => updateCruisePort(port.id, { departureTime: e.target.value })} /></div>
                  </div>
                  <div className="md:col-span-3"><Label>Notas</Label><Input value={port.notes} onChange={(e) => updateCruisePort(port.id, { notes: e.target.value })} placeholder="Día en el mar, excursión opcional..." /></div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addCruisePort} className="w-full"><Plus className="mr-2 h-4 w-4" />Agregar puerto</Button>
        </CardContent>
      </Card>

      <CruiseItineraryPasteDialog
        open={pasteOpen}
        onOpenChange={setPasteOpen}
        onApply={(ports, mode) => {
          if (!quote.cruise) return;
          const merged = mode === 'replace'
            ? ports.map((p, idx) => ({ ...p, day: idx + 1 }))
            : [...quote.cruise.itinerary, ...ports].map((p, idx) => ({ ...p, day: idx + 1 }));
          onUpdate({ cruise: { ...quote.cruise, itinerary: merged } });
        }}
      />

      <Card>
        <CardHeader><CardTitle className="text-lg">Extras del crucero</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Propinas</Label><Input value={quote.cruise.extras.tips} onChange={(e) => updateCruiseExtras({ tips: e.target.value })} placeholder="USD 16 por persona por día" /></div>
            <div><Label>Paquete de bebidas</Label><Input value={quote.cruise.extras.beverages} onChange={(e) => updateCruiseExtras({ beverages: e.target.value })} placeholder="Premium Plus Beverage Package" /></div>
            <div><Label>WiFi</Label><Input value={quote.cruise.extras.wifi} onChange={(e) => updateCruiseExtras({ wifi: e.target.value })} placeholder="Paquete Unlimited WiFi" /></div>
            <div><Label>Excursiones</Label><Input value={quote.cruise.extras.excursions} onChange={(e) => updateCruiseExtras({ excursions: e.target.value })} placeholder="Shore Excursion Credit USD 150" /></div>
            <div><Label>Restaurantes especiales</Label><Input value={quote.cruise.extras.specialDining} onChange={(e) => updateCruiseExtras({ specialDining: e.target.value })} placeholder="Specialty Dining Package 3 cenas" /></div>
            <div><Label>Spa</Label><Input value={quote.cruise.extras.spa} onChange={(e) => updateCruiseExtras({ spa: e.target.value })} placeholder="Thermal Suite Pass" /></div>
            <div className="md:col-span-2"><Label>Otros extras</Label><Textarea value={quote.cruise.extras.other} onChange={(e) => updateCruiseExtras({ other: e.target.value })} placeholder="Cualquier otro extra o información..." rows={2} /></div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label>Notas generales del crucero</Label>
        <Textarea value={quote.cruise.notes} onChange={(e) => updateCruise({ notes: e.target.value })} placeholder="Información adicional..." rows={3} />
      </div>

      <Button variant="destructive" onClick={() => onUpdate({ cruise: undefined })} className="w-full">
        <Trash2 className="mr-2 h-4 w-4" />Eliminar crucero
      </Button>
    </div>
  );
}
