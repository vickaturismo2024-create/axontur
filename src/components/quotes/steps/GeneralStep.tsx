import { Quote } from '@/types/quote';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientSelect } from '@/components/quotes/ClientSelect';

interface GeneralStepProps {
  quote: Quote;
  onUpdate: (updates: Partial<Quote>) => void;
}

export function GeneralStep({ quote, onUpdate }: GeneralStepProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Datos del Cliente</h4>
          <ClientSelect onSelect={(c) => onUpdate({ client: { ...quote.client, ...c } })} />
        </div>
        <div>
          <Label htmlFor="clientName">Nombre completo</Label>
          <Input
            data-tour="client-name"
            id="clientName"
            value={quote.client.name}
            onChange={(e) => onUpdate({ client: { ...quote.client, name: e.target.value } })}
            placeholder="María García"
          />
        </div>
        <div>
          <Label htmlFor="clientPhone">Teléfono</Label>
          <Input
            id="clientPhone"
            value={quote.client.phone}
            onChange={(e) => onUpdate({ client: { ...quote.client, phone: e.target.value } })}
            placeholder="+54 11 1234-5678"
          />
        </div>
        <div>
          <Label htmlFor="clientEmail">Email</Label>
          <Input
            id="clientEmail"
            type="email"
            value={quote.client.email}
            onChange={(e) => onUpdate({ client: { ...quote.client, email: e.target.value } })}
            placeholder="email@ejemplo.com"
          />
        </div>
      </div>
      <div className="space-y-4">
        <h4 className="font-medium">Datos del Viaje</h4>
        <div>
          <Label htmlFor="tripType">Tipo de viaje</Label>
          <Select
            value={quote.trip.type || 'standard'}
            onValueChange={(value) => onUpdate({ trip: { ...quote.trip, type: value as any } })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Viaje estándar</SelectItem>
              <SelectItem value="multiDestination">Multi-destino (tour)</SelectItem>
              <SelectItem value="cruise">Crucero</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="destination">Destino</Label>
          <Input
            data-tour="trip-destination"
            id="destination"
            value={quote.trip.destination}
            onChange={(e) => onUpdate({ trip: { ...quote.trip, destination: e.target.value } })}
            placeholder="Cancún, México"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Fecha inicio</Label>
            <Input
              id="startDate"
              type="date"
              value={quote.trip.startDate}
              onChange={(e) => onUpdate({ trip: { ...quote.trip, startDate: e.target.value } })}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Fecha fin</Label>
            <Input
              id="endDate"
              type="date"
              value={quote.trip.endDate}
              onChange={(e) => onUpdate({ trip: { ...quote.trip, endDate: e.target.value } })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="travelers">Pasajeros</Label>
            <Input
              id="travelers"
              type="number"
              min={1}
              value={quote.trip.travelers}
              onChange={(e) => onUpdate({ trip: { ...quote.trip, travelers: parseInt(e.target.value) || 1 } })}
            />
          </div>
          <div>
            <Label htmlFor="currency">Moneda</Label>
            <Input
              id="currency"
              value={quote.trip.currency}
              onChange={(e) => onUpdate({ trip: { ...quote.trip, currency: e.target.value } })}
              placeholder="USD"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
