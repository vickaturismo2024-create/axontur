import { useState } from 'react';
import { Quote, Template, Flight, Transfer, ItineraryDay } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Eye
} from 'lucide-react';
import { PDFPreview } from '@/components/pdf/PDFPreview';
import { defaultTemplate } from '@/data/demoData';

interface QuoteWizardProps {
  initialQuote?: Quote;
  templates: Template[];
  onSave: (quote: Quote) => void;
  onCancel: () => void;
}

const steps = [
  { id: 'general', label: 'Datos Generales', icon: User },
  { id: 'cover', label: 'Portada', icon: Image },
  { id: 'flights', label: 'Vuelos', icon: Plane },
  { id: 'lodging', label: 'Alojamiento', icon: Building2 },
  { id: 'transfers', label: 'Traslados', icon: Car },
  { id: 'insurance', label: 'Asistencia', icon: Shield },
  { id: 'pricing', label: 'Precio', icon: DollarSign },
  { id: 'itinerary', label: 'Itinerario', icon: Calendar },
  { id: 'preview', label: 'Vista Previa', icon: Eye },
];

const emptyQuote: Quote = {
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templateId: 'default',
  client: { name: '', phone: '', email: '' },
  trip: { destination: '', startDate: '', endDate: '', travelers: 1, currency: 'USD' },
  cover: { title: 'PRESUPUESTO DE VIAJE', subtitle: '', imageUrl: '' },
  flights: [],
  lodging: { name: '', category: '', address: '', checkIn: '', checkOut: '', regime: '', roomType: '', nights: 0, notes: '' },
  transfers: [],
  insurance: { company: '', plan: '', coverage: '', notes: '' },
  pricing: { totalPrice: 0, pricePerPerson: 0, taxes: 0, paymentMethod: '', conditions: '', observations: '' },
  itineraryDays: [],
};

export function QuoteWizard({ initialQuote, templates, onSave, onCancel }: QuoteWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [quote, setQuote] = useState<Quote>(initialQuote || emptyQuote);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);

  const currentTemplate = templates.find(t => t.id === quote.templateId) || defaultTemplate;

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
            {/* Datos Generales */}
            {currentStep === 0 && (
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
            {currentStep === 1 && (
              <div className="space-y-4">
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
                <div>
                  <Label htmlFor="coverImage">URL de imagen de portada</Label>
                  <Input
                    id="coverImage"
                    value={quote.cover.imageUrl}
                    onChange={(e) => updateQuote({ cover: { ...quote.cover, imageUrl: e.target.value } })}
                    placeholder="https://..."
                  />
                  {quote.cover.imageUrl && (
                    <div className="mt-2 overflow-hidden rounded-lg">
                      <img 
                        src={quote.cover.imageUrl} 
                        alt="Preview" 
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vuelos */}
            {currentStep === 2 && (
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
                <Button variant="outline" onClick={addFlight} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar vuelo
                </Button>
              </div>
            )}

            {/* Alojamiento */}
            {currentStep === 3 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nombre del hotel</Label>
                  <Input
                    value={quote.lodging.name}
                    onChange={(e) => updateQuote({ lodging: { ...quote.lodging, name: e.target.value } })}
                    placeholder="Grand Fiesta Americana"
                  />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input
                    value={quote.lodging.category}
                    onChange={(e) => updateQuote({ lodging: { ...quote.lodging, category: e.target.value } })}
                    placeholder="5 Estrellas"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Dirección</Label>
                  <Input
                    value={quote.lodging.address}
                    onChange={(e) => updateQuote({ lodging: { ...quote.lodging, address: e.target.value } })}
                    placeholder="Boulevard Kukulcán Km 9.5, Zona Hotelera..."
                  />
                </div>
                <div>
                  <Label>Check-in</Label>
                  <Input
                    type="date"
                    value={quote.lodging.checkIn}
                    onChange={(e) => updateQuote({ lodging: { ...quote.lodging, checkIn: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Check-out</Label>
                  <Input
                    type="date"
                    value={quote.lodging.checkOut}
                    onChange={(e) => updateQuote({ lodging: { ...quote.lodging, checkOut: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Régimen</Label>
                  <Input
                    value={quote.lodging.regime}
                    onChange={(e) => updateQuote({ lodging: { ...quote.lodging, regime: e.target.value } })}
                    placeholder="All Inclusive"
                  />
                </div>
                <div>
                  <Label>Tipo de habitación</Label>
                  <Input
                    value={quote.lodging.roomType}
                    onChange={(e) => updateQuote({ lodging: { ...quote.lodging, roomType: e.target.value } })}
                    placeholder="Suite Ocean View"
                  />
                </div>
                <div>
                  <Label>Noches</Label>
                  <Input
                    type="number"
                    min={0}
                    value={quote.lodging.nights}
                    onChange={(e) => updateQuote({ lodging: { ...quote.lodging, nights: parseInt(e.target.value) || 0 } })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={quote.lodging.notes}
                    onChange={(e) => updateQuote({ lodging: { ...quote.lodging, notes: e.target.value } })}
                    placeholder="Vista al mar, amenities..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Traslados */}
            {currentStep === 4 && (
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
            {currentStep === 5 && (
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
            {currentStep === 6 && (
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
            {currentStep === 7 && (
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
            {currentStep === 8 && (
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
