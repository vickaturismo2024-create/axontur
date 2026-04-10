import { Quote, Transfer, Train, Ferry, RentalCar } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupplierSelect } from '@/components/quotes/SupplierSelect';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface TransportStepProps {
  quote: Quote;
  onUpdate: (updates: Partial<Quote>) => void;
}

export function TransportStep({ quote, onUpdate }: TransportStepProps) {
  const [transportTab, setTransportTab] = useState('transfers');

  // Transfers
  const addTransfer = () => {
    const t: Transfer = { id: crypto.randomUUID(), type: 'Privado', description: '', dateTime: '', included: true };
    onUpdate({ transfers: [...quote.transfers, t] });
  };
  const updateTransfer = (id: string, u: Partial<Transfer>) => {
    onUpdate({ transfers: quote.transfers.map(t => t.id === id ? { ...t, ...u } : t) });
  };
  const removeTransfer = (id: string) => onUpdate({ transfers: quote.transfers.filter(t => t.id !== id) });

  // Trains
  const addTrain = () => {
    const t: Train = { id: crypto.randomUUID(), origin: '', destination: '', date: '', departureTime: '', arrivalTime: '', company: '', trainNumber: '', class: '', seat: '', notes: '', included: true };
    onUpdate({ trains: [...(quote.trains || []), t] });
  };
  const updateTrain = (id: string, u: Partial<Train>) => {
    onUpdate({ trains: (quote.trains || []).map(t => t.id === id ? { ...t, ...u } : t) });
  };
  const removeTrain = (id: string) => onUpdate({ trains: (quote.trains || []).filter(t => t.id !== id) });

  // Ferries
  const addFerry = () => {
    const f: Ferry = { id: crypto.randomUUID(), origin: '', destination: '', date: '', departureTime: '', arrivalTime: '', company: '', vessel: '', cabinType: '', notes: '', included: true };
    onUpdate({ ferries: [...(quote.ferries || []), f] });
  };
  const updateFerry = (id: string, u: Partial<Ferry>) => {
    onUpdate({ ferries: (quote.ferries || []).map(f => f.id === id ? { ...f, ...u } : f) });
  };
  const removeFerry = (id: string) => onUpdate({ ferries: (quote.ferries || []).filter(f => f.id !== id) });

  // Rental Cars
  const addRentalCar = () => {
    const r: RentalCar = { id: crypto.randomUUID(), company: '', pickupLocation: '', dropoffLocation: '', pickupDate: '', pickupTime: '', dropoffDate: '', dropoffTime: '', carType: '', extras: '', notes: '', included: true };
    onUpdate({ rentalCars: [...(quote.rentalCars || []), r] });
  };
  const updateRentalCar = (id: string, u: Partial<RentalCar>) => {
    onUpdate({ rentalCars: (quote.rentalCars || []).map(r => r.id === id ? { ...r, ...u } : r) });
  };
  const removeRentalCar = (id: string) => onUpdate({ rentalCars: (quote.rentalCars || []).filter(r => r.id !== id) });

  return (
    <div className="space-y-4">
      <Tabs value={transportTab} onValueChange={setTransportTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transfers">Traslados</TabsTrigger>
          <TabsTrigger value="trains">Trenes</TabsTrigger>
          <TabsTrigger value="ferries">Ferrys</TabsTrigger>
          <TabsTrigger value="rentals">Autos</TabsTrigger>
        </TabsList>

        {/* TRANSFERS */}
        <TabsContent value="transfers" className="space-y-4">
          {quote.transfers.map((transfer, idx) => (
            <Card key={transfer.id} className="relative">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-destructive" onClick={() => removeTransfer(transfer.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={transfer.type} onValueChange={(value) => updateTransfer(transfer.id, { type: value })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Privado">Privado</SelectItem>
                        <SelectItem value="Regular">Regular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descripción</Label>
                    <Input value={transfer.description} onChange={(e) => updateTransfer(transfer.id, { description: e.target.value })} placeholder="Aeropuerto → Hotel" />
                  </div>
                  <div>
                    <Label>Fecha y hora</Label>
                    <Input type="datetime-local" value={transfer.dateTime} onChange={(e) => updateTransfer(transfer.id, { dateTime: e.target.value })} />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={transfer.included} onChange={(e) => updateTransfer(transfer.id, { included: e.target.checked })} className="h-4 w-4 rounded border-border" />
                      Incluido en el paquete
                    </label>
                  </div>
                  <div className="md:col-span-3">
                    <SupplierSelect value={transfer.supplier} onChange={(val) => updateTransfer(transfer.id, { supplier: val })} />
                  </div>
                  <div>
                    <Label>Costo neto ({quote.trip.currency})</Label>
                    <Input type="number" min={0} step="0.01" value={transfer.cost || ''} onChange={(e) => updateTransfer(transfer.id, { cost: parseFloat(e.target.value) || undefined })} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Precio venta ({quote.trip.currency})</Label>
                    <Input type="number" min={0} step="0.01" value={transfer.price || ''} onChange={(e) => updateTransfer(transfer.id, { price: parseFloat(e.target.value) || undefined })} placeholder="0.00" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addTransfer} className="w-full">
            <Plus className="mr-2 h-4 w-4" />Agregar traslado
          </Button>
        </TabsContent>

        {/* TRAINS */}
        <TabsContent value="trains" className="space-y-4">
          {(quote.trains || []).map((train, idx) => (
            <Card key={train.id} className="relative">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-destructive" onClick={() => removeTrain(train.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <CardContent className="pt-6">
                <p className="mb-4 font-medium text-muted-foreground">Tren {idx + 1}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Origen</Label><Input value={train.origin} onChange={(e) => updateTrain(train.id, { origin: e.target.value })} placeholder="París Gare du Nord" /></div>
                  <div><Label>Destino</Label><Input value={train.destination} onChange={(e) => updateTrain(train.id, { destination: e.target.value })} placeholder="Londres St Pancras" /></div>
                  <div><Label>Fecha</Label><Input type="date" value={train.date} onChange={(e) => updateTrain(train.id, { date: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Salida</Label><Input type="time" value={train.departureTime} onChange={(e) => updateTrain(train.id, { departureTime: e.target.value })} /></div>
                    <div><Label>Llegada</Label><Input value={train.arrivalTime} onChange={(e) => updateTrain(train.id, { arrivalTime: e.target.value })} placeholder="14:30" /></div>
                  </div>
                  <div><Label>Compañía</Label><Input value={train.company} onChange={(e) => updateTrain(train.id, { company: e.target.value })} placeholder="Eurostar" /></div>
                  <div><Label>Número de tren</Label><Input value={train.trainNumber} onChange={(e) => updateTrain(train.id, { trainNumber: e.target.value })} placeholder="ES9024" /></div>
                  <div><Label>Clase</Label><Input value={train.class} onChange={(e) => updateTrain(train.id, { class: e.target.value })} placeholder="Business Premier" /></div>
                  <div><Label>Asiento</Label><Input value={train.seat} onChange={(e) => updateTrain(train.id, { seat: e.target.value })} placeholder="12A" /></div>
                  <div className="md:col-span-2">
                    <Label>Notas</Label>
                    <Textarea value={train.notes} onChange={(e) => updateTrain(train.id, { notes: e.target.value })} placeholder="WiFi incluido, café gratis..." rows={2} />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={train.included !== false} onChange={(e) => updateTrain(train.id, { included: e.target.checked })} className="h-4 w-4 rounded border-border" />
                      Incluido en el paquete
                    </label>
                  </div>
                  <SupplierSelect value={train.supplier} onChange={(val) => updateTrain(train.id, { supplier: val })} />
                  <div><Label>Costo neto ({quote.trip.currency})</Label><Input type="number" min={0} step="0.01" value={train.cost || ''} onChange={(e) => updateTrain(train.id, { cost: parseFloat(e.target.value) || undefined })} placeholder="0.00" /></div>
                  <div><Label>Precio venta ({quote.trip.currency})</Label><Input type="number" min={0} step="0.01" value={train.price || ''} onChange={(e) => updateTrain(train.id, { price: parseFloat(e.target.value) || undefined })} placeholder="0.00" /></div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addTrain} className="w-full"><Plus className="mr-2 h-4 w-4" />Agregar tren</Button>
        </TabsContent>

        {/* FERRIES */}
        <TabsContent value="ferries" className="space-y-4">
          {(quote.ferries || []).map((ferry, idx) => (
            <Card key={ferry.id} className="relative">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-destructive" onClick={() => removeFerry(ferry.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <CardContent className="pt-6">
                <p className="mb-4 font-medium text-muted-foreground">Ferry {idx + 1}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Origen</Label><Input value={ferry.origin} onChange={(e) => updateFerry(ferry.id, { origin: e.target.value })} placeholder="Dover" /></div>
                  <div><Label>Destino</Label><Input value={ferry.destination} onChange={(e) => updateFerry(ferry.id, { destination: e.target.value })} placeholder="Calais" /></div>
                  <div><Label>Fecha</Label><Input type="date" value={ferry.date} onChange={(e) => updateFerry(ferry.id, { date: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Salida</Label><Input type="time" value={ferry.departureTime} onChange={(e) => updateFerry(ferry.id, { departureTime: e.target.value })} /></div>
                    <div><Label>Llegada</Label><Input value={ferry.arrivalTime} onChange={(e) => updateFerry(ferry.id, { arrivalTime: e.target.value })} placeholder="14:30" /></div>
                  </div>
                  <div><Label>Compañía</Label><Input value={ferry.company} onChange={(e) => updateFerry(ferry.id, { company: e.target.value })} placeholder="P&O Ferries" /></div>
                  <div><Label>Embarcación</Label><Input value={ferry.vessel} onChange={(e) => updateFerry(ferry.id, { vessel: e.target.value })} placeholder="Spirit of Britain" /></div>
                  <div><Label>Tipo de cabina/asiento</Label><Input value={ferry.cabinType} onChange={(e) => updateFerry(ferry.id, { cabinType: e.target.value })} placeholder="Cabina exterior doble" /></div>
                  <div className="md:col-span-2">
                    <Label>Notas</Label>
                    <Textarea value={ferry.notes} onChange={(e) => updateFerry(ferry.id, { notes: e.target.value })} placeholder="Vista al mar, restaurante a bordo..." rows={2} />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={ferry.included !== false} onChange={(e) => updateFerry(ferry.id, { included: e.target.checked })} className="h-4 w-4 rounded border-border" />
                      Incluido en el paquete
                    </label>
                  </div>
                  <SupplierSelect value={ferry.supplier} onChange={(val) => updateFerry(ferry.id, { supplier: val })} />
                  <div><Label>Costo neto ({quote.trip.currency})</Label><Input type="number" min={0} step="0.01" value={ferry.cost || ''} onChange={(e) => updateFerry(ferry.id, { cost: parseFloat(e.target.value) || undefined })} placeholder="0.00" /></div>
                  <div><Label>Precio venta ({quote.trip.currency})</Label><Input type="number" min={0} step="0.01" value={ferry.price || ''} onChange={(e) => updateFerry(ferry.id, { price: parseFloat(e.target.value) || undefined })} placeholder="0.00" /></div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addFerry} className="w-full"><Plus className="mr-2 h-4 w-4" />Agregar ferry</Button>
        </TabsContent>

        {/* RENTAL CARS */}
        <TabsContent value="rentals" className="space-y-4">
          {(quote.rentalCars || []).map((car, idx) => (
            <Card key={car.id} className="relative">
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-destructive" onClick={() => removeRentalCar(car.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <CardContent className="pt-6">
                <p className="mb-4 font-medium text-muted-foreground">Auto {idx + 1}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Compañía</Label><Input value={car.company} onChange={(e) => updateRentalCar(car.id, { company: e.target.value })} placeholder="Hertz" /></div>
                  <div><Label>Tipo de vehículo</Label><Input value={car.carType} onChange={(e) => updateRentalCar(car.id, { carType: e.target.value })} placeholder="SUV Compacto" /></div>
                  <div><Label>Lugar de retiro</Label><Input value={car.pickupLocation} onChange={(e) => updateRentalCar(car.id, { pickupLocation: e.target.value })} placeholder="Aeropuerto de Roma" /></div>
                  <div><Label>Lugar de devolución</Label><Input value={car.dropoffLocation} onChange={(e) => updateRentalCar(car.id, { dropoffLocation: e.target.value })} placeholder="Aeropuerto de Florencia" /></div>
                  <div><Label>Fecha retiro</Label><Input type="date" value={car.pickupDate} onChange={(e) => updateRentalCar(car.id, { pickupDate: e.target.value })} /></div>
                  <div><Label>Hora retiro</Label><Input type="time" value={car.pickupTime} onChange={(e) => updateRentalCar(car.id, { pickupTime: e.target.value })} /></div>
                  <div><Label>Fecha devolución</Label><Input type="date" value={car.dropoffDate} onChange={(e) => updateRentalCar(car.id, { dropoffDate: e.target.value })} /></div>
                  <div><Label>Hora devolución</Label><Input type="time" value={car.dropoffTime} onChange={(e) => updateRentalCar(car.id, { dropoffTime: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label>Extras</Label><Input value={car.extras} onChange={(e) => updateRentalCar(car.id, { extras: e.target.value })} placeholder="GPS, silla de bebé, seguro full coverage" /></div>
                  <div className="md:col-span-2"><Label>Notas</Label><Textarea value={car.notes} onChange={(e) => updateRentalCar(car.id, { notes: e.target.value })} placeholder="Conductor adicional incluido..." rows={2} /></div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={car.included !== false} onChange={(e) => updateRentalCar(car.id, { included: e.target.checked })} className="h-4 w-4 rounded border-border" />
                      Incluido en el paquete
                    </label>
                  </div>
                  <SupplierSelect value={car.supplier} onChange={(val) => updateRentalCar(car.id, { supplier: val })} />
                  <div><Label>Costo neto ({quote.trip.currency})</Label><Input type="number" min={0} step="0.01" value={car.cost || ''} onChange={(e) => updateRentalCar(car.id, { cost: parseFloat(e.target.value) || undefined })} placeholder="0.00" /></div>
                  <div><Label>Precio venta ({quote.trip.currency})</Label><Input type="number" min={0} step="0.01" value={car.price || ''} onChange={(e) => updateRentalCar(car.id, { price: parseFloat(e.target.value) || undefined })} placeholder="0.00" /></div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addRentalCar} className="w-full"><Plus className="mr-2 h-4 w-4" />Agregar auto de alquiler</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
