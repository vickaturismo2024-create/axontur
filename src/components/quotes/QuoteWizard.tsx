import { useState } from 'react';
import { Quote, Template, Flight, Transfer, ItineraryDay, Lodging, Cruise, CruisePort } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { 
  User, 
  MapPin, 
  Image, 
  Plane, 
  Building2, 
  Car, 
  Shield, 
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Palette,
  Ship,
  Anchor
} from 'lucide-react';
import { PDFPreview } from '@/components/pdf/PDFPreview';
import { defaultTemplate } from '@/data/demoData';
import { PNRParserDialog } from '@/components/quotes/PNRParserDialog';
import { Switch } from '@/components/ui/switch';

interface QuoteWizardProps {
  initialQuote?: Quote;
  templates: Template[];
  defaultTemplate?: Template | null;
  onSave: (quote: Quote) => void;
  onCancel: () => void;
}

const steps = [
  { id: 'template', label: 'Plantilla', icon: Palette },
  { id: 'general', label: 'Datos Generales', icon: User },
  { id: 'cover', label: 'Portada', icon: Image },
  { id: 'flights', label: 'Vuelos', icon: Plane },
  { id: 'lodging', label: 'Alojamiento', icon: Building2 },
  { id: 'cruise', label: 'Crucero', icon: Ship },
  { id: 'transfers', label: 'Traslados', icon: Car },
  { id: 'insurance', label: 'Asistencia', icon: Shield },
  { id: 'pricing', label: 'Precio', icon: DollarSign },
  { id: 'itinerary', label: 'Itinerario', icon: Calendar },
  { id: 'preview', label: 'Vista Previa', icon: Eye },
];

const createEmptyCruise = (): Cruise => ({
  enabled: false,
  cruiseLine: '',
  shipName: '',
  cabinType: '',
  cabinNumber: '',
  deck: '',
  embarkationPort: '',
  embarkationDate: '',
  disembarkationPort: '',
  disembarkationDate: '',
  nights: 0,
  itinerary: [],
  tipsIncluded: false,
  tipsAmount: 0,
  beveragePackage: '',
  wifiPackage: '',
  diningPackage: '',
  excursionsIncluded: false,
  excursionsNotes: '',
  notes: '',
});

const createEmptyQuote = (defaultTemplateId?: string): Quote => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templateId: defaultTemplateId || 'default',
  client: { name: '', phone: '', email: '' },
  trip: { destination: '', startDate: '', endDate: '', travelers: 1, currency: 'USD' },
  cover: { title: 'PRESUPUESTO DE VIAJE', subtitle: '', imageUrl: '' },
  flights: [],
  lodgings: [],
  transfers: [],
  insurance: { company: '', plan: '', coverage: '', notes: '' },
  pricing: { totalPrice: 0, pricePerPerson: 0, taxes: 0, paymentMethod: '', conditions: '', observations: '' },
  itineraryDays: [],
  cruise: createEmptyCruise(),
});

export function QuoteWizard({ initialQuote, templates, defaultTemplate, onSave, onCancel }: QuoteWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [quote, setQuote] = useState<Quote>(() => {
    if (initialQuote) return initialQuote;
    return createEmptyQuote(defaultTemplate?.id);
  });
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);

  const currentTemplate = templates.find(t => t.id === quote.templateId) || defaultTemplate || (templates[0] ?? null);

  const updateQuote = (updates: Partial<Quote>) => {
    setQuote(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  };

  const addFlight = () => {
    const newFlight: Flight = {
      id: crypto.randomUUID(),
      origin: '',
      destination: '',
      date: '',
      departureTime: '',
      arrivalTime: '',
      airline: '',
      flightNumber: '',
      luggage: '',
      notes: '',
    };
    updateQuote({ flights: [...quote.flights, newFlight] });
  };

  const updateFlight = (id: string, updates: Partial<Flight>) => {
    updateQuote({
      flights: quote.flights.map(f => f.id === id ? { ...f, ...updates } : f),
    });
  };

  const removeFlight = (id: string) => {
    updateQuote({ flights: quote.flights.filter(f => f.id !== id) });
  };

  const handleFlightsParsed = (parsedFlights: Omit<Flight, 'id'>[]) => {
    const flightsWithIds = parsedFlights.map(flight => ({
      ...flight,
      id: crypto.randomUUID(),
      luggage: flight.luggage || '',
      notes: flight.notes || '',
    }));
    updateQuote({ flights: [...quote.flights, ...flightsWithIds] });
  };

  // Lodgings management
  const addLodging = () => {
    const newLodging: Lodging = {
      id: crypto.randomUUID(),
      name: '',
      category: '',
      address: '',
      checkIn: '',
      checkOut: '',
      regime: '',
      roomType: '',
      nights: 0,
      notes: '',
      destination: '',
    };
    updateQuote({ lodgings: [...(quote.lodgings || []), newLodging] });
  };

  const updateLodging = (id: string, updates: Partial<Lodging>) => {
    updateQuote({
      lodgings: (quote.lodgings || []).map(l => l.id === id ? { ...l, ...updates } : l),
    });
  };

  const removeLodging = (id: string) => {
    updateQuote({ lodgings: (quote.lodgings || []).filter(l => l.id !== id) });
  };

  const addTransfer = () => {
    const newTransfer: Transfer = {
      id: crypto.randomUUID(),
      type: 'Privado',
      description: '',
      dateTime: '',
      included: true,
    };
    updateQuote({ transfers: [...quote.transfers, newTransfer] });
  };

  const updateTransfer = (id: string, updates: Partial<Transfer>) => {
    updateQuote({
      transfers: quote.transfers.map(t => t.id === id ? { ...t, ...updates } : t),
    });
  };

  const removeTransfer = (id: string) => {
    updateQuote({ transfers: quote.transfers.filter(t => t.id !== id) });
  };

  // Cruise management
  const updateCruise = (updates: Partial<Cruise>) => {
    updateQuote({ cruise: { ...(quote.cruise || createEmptyCruise()), ...updates } });
  };

  const addCruisePort = () => {
    const cruise = quote.cruise || createEmptyCruise();
    const newPort: CruisePort = {
      id: crypto.randomUUID(),
      day: cruise.itinerary.length + 1,
      port: '',
      country: '',
      arrival: '',
      departure: '',
      description: '',
    };
    updateCruise({ itinerary: [...cruise.itinerary, newPort] });
  };

  const updateCruisePort = (id: string, updates: Partial<CruisePort>) => {
    const cruise = quote.cruise || createEmptyCruise();
    updateCruise({
      itinerary: cruise.itinerary.map(p => p.id === id ? { ...p, ...updates } : p),
    });
  };

  const removeCruisePort = (id: string) => {
    const cruise = quote.cruise || createEmptyCruise();
    const updatedPorts = cruise.itinerary
      .filter(p => p.id !== id)
      .map((p, idx) => ({ ...p, day: idx + 1 }));
    updateCruise({ itinerary: updatedPorts });
  };

  const addItineraryDay = () => {
    const newDay: ItineraryDay = {
      id: crypto.randomUUID(),
      dayNumber: quote.itineraryDays.length + 1,
      date: '',
      title: '',
      description: '',
      activities: [],
    };
    updateQuote({ itineraryDays: [...quote.itineraryDays, newDay] });
  };

  const updateItineraryDay = (id: string, updates: Partial<ItineraryDay>) => {
    updateQuote({
      itineraryDays: quote.itineraryDays.map(d => d.id === id ? { ...d, ...updates } : d),
    });
  };

  const removeItineraryDay = (id: string) => {
    const updatedDays = quote.itineraryDays
      .filter(d => d.id !== id)
      .map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
    updateQuote({ itineraryDays: updatedDays });
  };

  const handleSave = () => {
    onSave(quote);
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="flex h-full gap-6">
      {/* Main Content */}
      <div className="flex-1">
        {/* Steps Navigation */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-all ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : index < currentStep
                    ? 'bg-gold/20 text-gold-dark'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              {(() => { const Icon = steps[currentStep].icon; return <Icon className="h-5 w-5 text-gold" />; })()}
              {steps[currentStep].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Plantilla */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium">Selecciona una plantilla de diseño</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Define el estilo visual de tu presupuesto. Podrás cambiarlo más adelante.
                  </p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => updateQuote({ templateId: template.id })}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                        quote.templateId === template.id
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {/* Color Preview */}
                      <div className="mb-3 flex gap-2">
                        <div 
                          className="h-8 w-8 rounded-full border"
                          style={{ backgroundColor: template.colors.primary }}
                        />
                        <div 
                          className="h-8 w-8 rounded-full border"
                          style={{ backgroundColor: template.colors.secondary }}
                        />
                        <div 
                          className="h-8 w-8 rounded-full border"
                          style={{ backgroundColor: template.colors.accent }}
                        />
                      </div>
                      <h4 className="font-serif font-medium">{template.name}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {template.fonts.heading} / {template.fonts.body}
                      </p>
                      {quote.templateId === template.id && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                          <span className="h-2 w-2 rounded-full bg-primary"></span>
                          Seleccionada
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {templates.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-muted-foreground">No hay plantillas disponibles.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ve a la sección de Plantillas para crear una.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Datos Generales */}
            {currentStep === 1 && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Datos del Cliente</h4>
                  <div>
                    <Label htmlFor="clientName">Nombre completo</Label>
                    <Input
                      id="clientName"
                      value={quote.client.name}
                      onChange={(e) => updateQuote({ client: { ...quote.client, name: e.target.value } })}
                      placeholder="María García"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone">Teléfono</Label>
                    <Input
                      id="clientPhone"
                      value={quote.client.phone}
                      onChange={(e) => updateQuote({ client: { ...quote.client, phone: e.target.value } })}
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={quote.client.email}
                      onChange={(e) => updateQuote({ client: { ...quote.client, email: e.target.value } })}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Datos del Viaje</h4>
                  <div>
                    <Label htmlFor="destination">Destino</Label>
                    <Input
                      id="destination"
                      value={quote.trip.destination}
                      onChange={(e) => updateQuote({ trip: { ...quote.trip, destination: e.target.value } })}
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
                        onChange={(e) => updateQuote({ trip: { ...quote.trip, startDate: e.target.value } })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Fecha fin</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={quote.trip.endDate}
                        onChange={(e) => updateQuote({ trip: { ...quote.trip, endDate: e.target.value } })}
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
                        onChange={(e) => updateQuote({ trip: { ...quote.trip, travelers: parseInt(e.target.value) || 1 } })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Moneda</Label>
                      <Input
                        id="currency"
                        value={quote.trip.currency}
                        onChange={(e) => updateQuote({ trip: { ...quote.trip, currency: e.target.value } })}
                        placeholder="USD"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Portada */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Selector de plantilla (editable) */}
                <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
                  <Label className="mb-2 flex items-center gap-2">
                    <Palette className="h-4 w-4 text-gold" />
                    Plantilla de diseño
                  </Label>
                  <Select
                    value={quote.templateId}
                    onValueChange={(value) => updateQuote({ templateId: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona una plantilla" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div 
                                className="h-3 w-3 rounded-full border"
                                style={{ backgroundColor: template.colors.primary }}
                              />
                              <div 
                                className="h-3 w-3 rounded-full border"
                                style={{ backgroundColor: template.colors.accent }}
                              />
                            </div>
                            <span>{template.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Puedes cambiar la plantilla en cualquier momento
                  </p>
                </div>

                <div>
                  <Label htmlFor="coverTitle">Título</Label>
                  <Input
                    id="coverTitle"
                    value={quote.cover.title}
                    onChange={(e) => updateQuote({ cover: { ...quote.cover, title: e.target.value } })}
                    placeholder="PRESUPUESTO DE VIAJE"
                  />
                </div>
                <div>
                  <Label htmlFor="coverSubtitle">Subtítulo</Label>
                  <Textarea
                    id="coverSubtitle"
                    value={quote.cover.subtitle}
                    onChange={(e) => updateQuote({ cover: { ...quote.cover, subtitle: e.target.value } })}
                    placeholder="Una experiencia inolvidable..."
                    rows={2}
                  />
                </div>
                
                <ImageUpload
                  label="Imagen de portada"
                  value={quote.cover.imageUrl}
                  onChange={(value) => updateQuote({ cover: { ...quote.cover, imageUrl: value } })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>
            )}

            {/* Vuelos */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {quote.flights.map((flight, idx) => (
                  <Card key={flight.id} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 text-destructive"
                      onClick={() => removeFlight(flight.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardContent className="pt-6">
                      <p className="mb-4 font-medium text-muted-foreground">Tramo {idx + 1}</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Origen</Label>
                          <Input
                            value={flight.origin}
                            onChange={(e) => updateFlight(flight.id, { origin: e.target.value })}
                            placeholder="Buenos Aires (EZE)"
                          />
                        </div>
                        <div>
                          <Label>Destino</Label>
                          <Input
                            value={flight.destination}
                            onChange={(e) => updateFlight(flight.id, { destination: e.target.value })}
                            placeholder="Cancún (CUN)"
                          />
                        </div>
                        <div>
                          <Label>Fecha</Label>
                          <Input
                            type="date"
                            value={flight.date}
                            onChange={(e) => updateFlight(flight.id, { date: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label>Salida</Label>
                            <Input
                              type="time"
                              value={flight.departureTime}
                              onChange={(e) => updateFlight(flight.id, { departureTime: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Llegada</Label>
                            <Input
                              value={flight.arrivalTime}
                              onChange={(e) => updateFlight(flight.id, { arrivalTime: e.target.value })}
                              placeholder="16:45"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Aerolínea</Label>
                          <Input
                            value={flight.airline}
                            onChange={(e) => updateFlight(flight.id, { airline: e.target.value })}
                            placeholder="Aeromexico"
                          />
                        </div>
                        <div>
                          <Label>Número de vuelo</Label>
                          <Input
                            value={flight.flightNumber}
                            onChange={(e) => updateFlight(flight.id, { flightNumber: e.target.value })}
                            placeholder="AM456"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Equipaje</Label>
                          <Input
                            value={flight.luggage}
                            onChange={(e) => updateFlight(flight.id, { luggage: e.target.value })}
                            placeholder="2 valijas de 23kg + carry-on"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Notas</Label>
                          <Textarea
                            value={flight.notes}
                            onChange={(e) => updateFlight(flight.id, { notes: e.target.value })}
                            placeholder="Escala, observaciones..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={addFlight} className="flex-1">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar vuelo
                  </Button>
                  <PNRParserDialog onFlightsParsed={handleFlightsParsed} />
                </div>
              </div>
            )}

            {/* Alojamiento - Múltiples hoteles */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="mb-4 rounded-lg border border-gold/30 bg-gold/5 p-3">
                  <p className="text-sm text-muted-foreground">
                    <Building2 className="mr-2 inline h-4 w-4" />
                    Puedes agregar múltiples alojamientos para viajes con varios destinos (ej: tour por Europa, viaje por Asia).
                  </p>
                </div>
                
                {(quote.lodgings || []).map((lodging, idx) => (
                  <Card key={lodging.id} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 text-destructive"
                      onClick={() => removeLodging(lodging.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Alojamiento {idx + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Destino (ciudad)</Label>
                          <Input
                            value={lodging.destination || ''}
                            onChange={(e) => updateLodging(lodging.id, { destination: e.target.value })}
                            placeholder="París, Roma, Barcelona..."
                          />
                        </div>
                        <div>
                          <Label>Nombre del hotel</Label>
                          <Input
                            value={lodging.name}
                            onChange={(e) => updateLodging(lodging.id, { name: e.target.value })}
                            placeholder="Grand Fiesta Americana"
                          />
                        </div>
                        <div>
                          <Label>Categoría</Label>
                          <Input
                            value={lodging.category}
                            onChange={(e) => updateLodging(lodging.id, { category: e.target.value })}
                            placeholder="5 Estrellas"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Dirección</Label>
                          <Input
                            value={lodging.address}
                            onChange={(e) => updateLodging(lodging.id, { address: e.target.value })}
                            placeholder="Boulevard Kukulcán Km 9.5, Zona Hotelera..."
                          />
                        </div>
                        <div>
                          <Label>Check-in</Label>
                          <Input
                            type="date"
                            value={lodging.checkIn}
                            onChange={(e) => updateLodging(lodging.id, { checkIn: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Check-out</Label>
                          <Input
                            type="date"
                            value={lodging.checkOut}
                            onChange={(e) => updateLodging(lodging.id, { checkOut: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Régimen</Label>
                          <Input
                            value={lodging.regime}
                            onChange={(e) => updateLodging(lodging.id, { regime: e.target.value })}
                            placeholder="All Inclusive"
                          />
                        </div>
                        <div>
                          <Label>Tipo de habitación</Label>
                          <Input
                            value={lodging.roomType}
                            onChange={(e) => updateLodging(lodging.id, { roomType: e.target.value })}
                            placeholder="Suite Ocean View"
                          />
                        </div>
                        <div>
                          <Label>Noches</Label>
                          <Input
                            type="number"
                            min={0}
                            value={lodging.nights}
                            onChange={(e) => updateLodging(lodging.id, { nights: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Notas</Label>
                          <Textarea
                            value={lodging.notes}
                            onChange={(e) => updateLodging(lodging.id, { notes: e.target.value })}
                            placeholder="Vista al mar, amenities..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Button variant="outline" onClick={addLodging} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar alojamiento
                </Button>
              </div>
            )}

            {/* Crucero */}
            {currentStep === 5 && (
              <div className="space-y-6">
                {/* Toggle para activar crucero */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Ship className="h-5 w-5 text-gold" />
                    <div>
                      <Label className="text-base font-medium">¿Este viaje incluye un crucero?</Label>
                      <p className="text-sm text-muted-foreground">Activa esta opción para agregar información del crucero</p>
                    </div>
                  </div>
                  <Switch
                    checked={quote.cruise?.enabled || false}
                    onCheckedChange={(checked) => updateCruise({ enabled: checked })}
                  />
                </div>

                {quote.cruise?.enabled && (
                  <>
                    {/* Información general del crucero */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Ship className="h-4 w-4" />
                          Información del Crucero
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Línea de crucero</Label>
                            <Input
                              value={quote.cruise.cruiseLine}
                              onChange={(e) => updateCruise({ cruiseLine: e.target.value })}
                              placeholder="MSC, Royal Caribbean, Norwegian..."
                            />
                          </div>
                          <div>
                            <Label>Nombre del barco</Label>
                            <Input
                              value={quote.cruise.shipName}
                              onChange={(e) => updateCruise({ shipName: e.target.value })}
                              placeholder="MSC Grandiosa, Symphony of the Seas..."
                            />
                          </div>
                          <div>
                            <Label>Tipo de cabina</Label>
                            <Select
                              value={quote.cruise.cabinType}
                              onValueChange={(value) => updateCruise({ cabinType: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="interior">Interior</SelectItem>
                                <SelectItem value="exterior">Exterior con vista</SelectItem>
                                <SelectItem value="balcony">Balcón</SelectItem>
                                <SelectItem value="suite">Suite</SelectItem>
                                <SelectItem value="yacht-club">Yacht Club / Haven</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Número de cabina</Label>
                            <Input
                              value={quote.cruise.cabinNumber}
                              onChange={(e) => updateCruise({ cabinNumber: e.target.value })}
                              placeholder="10245"
                            />
                          </div>
                          <div>
                            <Label>Cubierta (Deck)</Label>
                            <Input
                              value={quote.cruise.deck}
                              onChange={(e) => updateCruise({ deck: e.target.value })}
                              placeholder="Deck 10"
                            />
                          </div>
                          <div>
                            <Label>Noches de crucero</Label>
                            <Input
                              type="number"
                              min={0}
                              value={quote.cruise.nights}
                              onChange={(e) => updateCruise({ nights: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Embarque y desembarque */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Anchor className="h-4 w-4" />
                          Embarque y Desembarque
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Puerto de embarque</Label>
                            <Input
                              value={quote.cruise.embarkationPort}
                              onChange={(e) => updateCruise({ embarkationPort: e.target.value })}
                              placeholder="Barcelona, Miami, Southampton..."
                            />
                          </div>
                          <div>
                            <Label>Fecha de embarque</Label>
                            <Input
                              type="date"
                              value={quote.cruise.embarkationDate}
                              onChange={(e) => updateCruise({ embarkationDate: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Puerto de desembarque</Label>
                            <Input
                              value={quote.cruise.disembarkationPort}
                              onChange={(e) => updateCruise({ disembarkationPort: e.target.value })}
                              placeholder="Roma, Miami, Southampton..."
                            />
                          </div>
                          <div>
                            <Label>Fecha de desembarque</Label>
                            <Input
                              type="date"
                              value={quote.cruise.disembarkationDate}
                              onChange={(e) => updateCruise({ disembarkationDate: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Itinerario de puertos */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <MapPin className="h-4 w-4" />
                          Itinerario de Puertos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(quote.cruise.itinerary || []).map((port, idx) => (
                          <div key={port.id} className="relative rounded-lg border p-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2 h-7 w-7 text-destructive"
                              onClick={() => removeCruisePort(port.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="mb-2 text-sm font-medium text-muted-foreground">
                              Día {port.day}
                            </div>
                            <div className="grid gap-3 md:grid-cols-4">
                              <div>
                                <Label className="text-xs">Puerto</Label>
                                <Input
                                  value={port.port}
                                  onChange={(e) => updateCruisePort(port.id, { port: e.target.value })}
                                  placeholder="Marsella"
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">País</Label>
                                <Input
                                  value={port.country}
                                  onChange={(e) => updateCruisePort(port.id, { country: e.target.value })}
                                  placeholder="Francia"
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Llegada</Label>
                                <Input
                                  value={port.arrival}
                                  onChange={(e) => updateCruisePort(port.id, { arrival: e.target.value })}
                                  placeholder="08:00"
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Salida</Label>
                                <Input
                                  value={port.departure}
                                  onChange={(e) => updateCruisePort(port.id, { departure: e.target.value })}
                                  placeholder="18:00"
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" onClick={addCruisePort} className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar puerto
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Extras y paquetes */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <DollarSign className="h-4 w-4" />
                          Extras y Paquetes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <Label>Propinas incluidas</Label>
                              <p className="text-xs text-muted-foreground">Gratuities prepagadas</p>
                            </div>
                            <Switch
                              checked={quote.cruise.tipsIncluded}
                              onCheckedChange={(checked) => updateCruise({ tipsIncluded: checked })}
                            />
                          </div>
                          {quote.cruise.tipsIncluded && (
                            <div>
                              <Label>Monto propinas (USD/día)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={quote.cruise.tipsAmount}
                                onChange={(e) => updateCruise({ tipsAmount: parseFloat(e.target.value) || 0 })}
                                placeholder="18"
                              />
                            </div>
                          )}
                          <div>
                            <Label>Paquete de bebidas</Label>
                            <Select
                              value={quote.cruise.beveragePackage}
                              onValueChange={(value) => updateCruise({ beveragePackage: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No incluido</SelectItem>
                                <SelectItem value="soft">Solo soft drinks</SelectItem>
                                <SelectItem value="classic">Clásico (alcoholic + soft)</SelectItem>
                                <SelectItem value="premium">Premium (todo incluido)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Paquete de WiFi</Label>
                            <Select
                              value={quote.cruise.wifiPackage}
                              onValueChange={(value) => updateCruise({ wifiPackage: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No incluido</SelectItem>
                                <SelectItem value="basic">Básico (social media)</SelectItem>
                                <SelectItem value="standard">Estándar (streaming)</SelectItem>
                                <SelectItem value="premium">Premium (ilimitado)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Paquete gastronómico</Label>
                            <Select
                              value={quote.cruise.diningPackage}
                              onValueChange={(value) => updateCruise({ diningPackage: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No incluido</SelectItem>
                                <SelectItem value="specialty">Restaurantes de especialidad</SelectItem>
                                <SelectItem value="unlimited">Ilimitado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <Label>Excursiones incluidas</Label>
                              <p className="text-xs text-muted-foreground">Shore excursions prepagadas</p>
                            </div>
                            <Switch
                              checked={quote.cruise.excursionsIncluded}
                              onCheckedChange={(checked) => updateCruise({ excursionsIncluded: checked })}
                            />
                          </div>
                        </div>
                        {quote.cruise.excursionsIncluded && (
                          <div className="mt-4">
                            <Label>Detalle de excursiones</Label>
                            <Textarea
                              value={quote.cruise.excursionsNotes}
                              onChange={(e) => updateCruise({ excursionsNotes: e.target.value })}
                              placeholder="Listar las excursiones incluidas..."
                              rows={3}
                            />
                          </div>
                        )}
                        <div className="mt-4">
                          <Label>Notas adicionales del crucero</Label>
                          <Textarea
                            value={quote.cruise.notes}
                            onChange={(e) => updateCruise({ notes: e.target.value })}
                            placeholder="Información adicional, dress code, horarios especiales..."
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* Traslados */}
            {currentStep === 6 && (
              <div className="space-y-4">
                {quote.transfers.map((transfer, idx) => (
                  <Card key={transfer.id} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 text-destructive"
                      onClick={() => removeTransfer(transfer.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardContent className="pt-6">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label>Tipo</Label>
                          <Input
                            value={transfer.type}
                            onChange={(e) => updateTransfer(transfer.id, { type: e.target.value })}
                            placeholder="Privado"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Descripción</Label>
                          <Input
                            value={transfer.description}
                            onChange={(e) => updateTransfer(transfer.id, { description: e.target.value })}
                            placeholder="Aeropuerto → Hotel"
                          />
                        </div>
                        <div>
                          <Label>Fecha y hora</Label>
                          <Input
                            type="datetime-local"
                            value={transfer.dateTime}
                            onChange={(e) => updateTransfer(transfer.id, { dateTime: e.target.value })}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={transfer.included}
                              onChange={(e) => updateTransfer(transfer.id, { included: e.target.checked })}
                              className="h-4 w-4 rounded border-border"
                            />
                            Incluido en el paquete
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addTransfer} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar traslado
                </Button>
              </div>
            )}

            {/* Asistencia */}
            {currentStep === 7 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Compañía</Label>
                  <Input
                    value={quote.insurance.company}
                    onChange={(e) => updateQuote({ insurance: { ...quote.insurance, company: e.target.value } })}
                    placeholder="Assist Card"
                  />
                </div>
                <div>
                  <Label>Plan</Label>
                  <Input
                    value={quote.insurance.plan}
                    onChange={(e) => updateQuote({ insurance: { ...quote.insurance, plan: e.target.value } })}
                    placeholder="Premium"
                  />
                </div>
                <div>
                  <Label>Cobertura</Label>
                  <Input
                    value={quote.insurance.coverage}
                    onChange={(e) => updateQuote({ insurance: { ...quote.insurance, coverage: e.target.value } })}
                    placeholder="USD 150.000"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={quote.insurance.notes}
                    onChange={(e) => updateQuote({ insurance: { ...quote.insurance, notes: e.target.value } })}
                    placeholder="Cobertura COVID-19 incluida..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Precio */}
            {currentStep === 8 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Precio total</Label>
                  <Input
                    type="number"
                    min={0}
                    value={quote.pricing.totalPrice}
                    onChange={(e) => updateQuote({ pricing: { ...quote.pricing, totalPrice: parseFloat(e.target.value) || 0 } })}
                  />
                </div>
                <div>
                  <Label>Precio por persona</Label>
                  <Input
                    type="number"
                    min={0}
                    value={quote.pricing.pricePerPerson}
                    onChange={(e) => updateQuote({ pricing: { ...quote.pricing, pricePerPerson: parseFloat(e.target.value) || 0 } })}
                  />
                </div>
                <div>
                  <Label>Impuestos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={quote.pricing.taxes}
                    onChange={(e) => updateQuote({ pricing: { ...quote.pricing, taxes: parseFloat(e.target.value) || 0 } })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Forma de pago</Label>
                  <Input
                    value={quote.pricing.paymentMethod}
                    onChange={(e) => updateQuote({ pricing: { ...quote.pricing, paymentMethod: e.target.value } })}
                    placeholder="Transferencia bancaria o tarjeta de crédito"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Condiciones</Label>
                  <Textarea
                    value={quote.pricing.conditions}
                    onChange={(e) => updateQuote({ pricing: { ...quote.pricing, conditions: e.target.value } })}
                    placeholder="Seña del 30% al confirmar..."
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Observaciones</Label>
                  <Textarea
                    value={quote.pricing.observations}
                    onChange={(e) => updateQuote({ pricing: { ...quote.pricing, observations: e.target.value } })}
                    placeholder="Precio sujeto a disponibilidad..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Itinerario */}
            {currentStep === 9 && (
              <div className="space-y-4">
                {quote.itineraryDays.map((day) => (
                  <Card key={day.id} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 text-destructive"
                      onClick={() => removeItineraryDay(day.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardContent className="pt-6">
                      <p className="mb-4 font-medium text-gold">Día {day.dayNumber}</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Fecha (opcional)</Label>
                          <Input
                            type="date"
                            value={day.date}
                            onChange={(e) => updateItineraryDay(day.id, { date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Título</Label>
                          <Input
                            value={day.title}
                            onChange={(e) => updateItineraryDay(day.id, { title: e.target.value })}
                            placeholder="Llegada a Cancún"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Descripción</Label>
                          <Textarea
                            value={day.description}
                            onChange={(e) => updateItineraryDay(day.id, { description: e.target.value })}
                            placeholder="Arribo al aeropuerto..."
                            rows={2}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Actividades (una por línea)</Label>
                          <Textarea
                            value={day.activities.join('\n')}
                            onChange={(e) => updateItineraryDay(day.id, { activities: e.target.value.split('\n').filter(Boolean) })}
                            placeholder="Recepción en el aeropuerto&#10;Traslado al hotel&#10;Check-in"
                            rows={4}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addItineraryDay} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar día
                </Button>
              </div>
            )}

            {/* Vista Previa */}
            {currentStep === 10 && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <PDFPreview quote={quote} template={currentTemplate} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={goPrev}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button onClick={goNext} className="bg-primary">
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} className="bg-gold text-navy hover:bg-gold/90">
                Guardar Presupuesto
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
