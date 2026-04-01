import { useState, useMemo, useEffect } from 'react';
import { Quote, Template, Flight, Transfer, ItineraryDay, Lodging, Train, Ferry, RentalCar, Activity, Cruise, CruisePort, CruiseExtras, Pricing, LuggageType, LUGGAGE_LABELS } from '@/types/quote';
import { SupplierSelect } from '@/components/quotes/SupplierSelect';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  Train as TrainIcon,
  Ship,
  Compass,
  Anchor,
  Sparkles,
  Loader2
} from 'lucide-react';
import { PDFPreview } from '@/components/pdf/PDFPreview';
import { defaultTemplate } from '@/data/demoData';
import { PNRParserDialog } from '@/components/quotes/PNRParserDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PricingSection } from '@/components/quotes/PricingSection';
import { OccupancyConfig } from '@/components/quotes/OccupancyConfig';
import { useOccupancyPricingCalculator, applyOccupancyPricing } from '@/hooks/useOccupancyPricingCalculator';

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
  { id: 'transport', label: 'Transporte', icon: Car },
  { id: 'cruise', label: 'Crucero', icon: Anchor },
  { id: 'activities', label: 'Excursiones', icon: Compass },
  { id: 'insurance', label: 'Asistencia', icon: Shield },
  { id: 'pricing', label: 'Precio', icon: DollarSign },
  { id: 'itinerary', label: 'Itinerario', icon: Calendar },
  { id: 'preview', label: 'Vista Previa', icon: Eye },
];

const createEmptyLodging = (isOption: boolean = false, optionLabel: string = ''): Lodging => ({
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
  isOption,
  optionLabel,
  pricePerNight: undefined,
});

const createEmptyTrain = (): Train => ({
  id: crypto.randomUUID(),
  origin: '',
  destination: '',
  date: '',
  departureTime: '',
  arrivalTime: '',
  company: '',
  trainNumber: '',
  class: '',
  seat: '',
  notes: '',
});

const createEmptyFerry = (): Ferry => ({
  id: crypto.randomUUID(),
  origin: '',
  destination: '',
  date: '',
  departureTime: '',
  arrivalTime: '',
  company: '',
  vessel: '',
  cabinType: '',
  notes: '',
});

const createEmptyRentalCar = (): RentalCar => ({
  id: crypto.randomUUID(),
  company: '',
  pickupLocation: '',
  dropoffLocation: '',
  pickupDate: '',
  pickupTime: '',
  dropoffDate: '',
  dropoffTime: '',
  carType: '',
  extras: '',
  notes: '',
});

const createEmptyActivity = (): Activity => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  date: '',
  time: '',
  duration: '',
  location: '',
  included: false,
  notes: '',
});

const createEmptyCruisePort = (): CruisePort => ({
  id: crypto.randomUUID(),
  day: 1,
  port: '',
  country: '',
  arrivalTime: '',
  departureTime: '',
  notes: '',
});

const createEmptyCruise = (): Cruise => ({
  id: crypto.randomUUID(),
  shipName: '',
  company: '',
  cabinType: '',
  cabinNumber: '',
  deck: '',
  embarkationPort: '',
  embarkationDate: '',
  disembarkationPort: '',
  disembarkationDate: '',
  nights: 0,
  regime: '',
  itinerary: [],
  extras: {
    tips: '',
    beverages: '',
    wifi: '',
    excursions: '',
    specialDining: '',
    spa: '',
    other: '',
  },
  notes: '',
});

const createEmptyQuote = (defaultTemplateId?: string): Quote => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  templateId: defaultTemplateId || 'default',
  client: { name: '', phone: '', email: '' },
  trip: { destination: '', startDate: '', endDate: '', travelers: 1, currency: 'USD', type: 'standard' },
  cover: { title: 'PRESUPUESTO DE VIAJE', subtitle: '', imageUrl: '' },
  flights: [],
  lodging: { name: '', category: '', address: '', checkIn: '', checkOut: '', regime: '', roomType: '', nights: 0, notes: '' },
  lodgings: [],
  transfers: [],
  trains: [],
  ferries: [],
  rentalCars: [],
  activities: [],
  insurance: { company: '', plan: '', coverage: '', notes: '' },
  pricing: { totalPrice: 0, pricePerPerson: 0, taxes: 0, paymentMethod: '', conditions: '', observations: '' },
  itineraryDays: [],
});

export function QuoteWizard({ initialQuote, templates, defaultTemplate, onSave, onCancel }: QuoteWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Listen for tour tab changes
  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ tabIndex: number }>;
      if (customEvent.detail?.tabIndex !== undefined) {
        setCurrentStep(customEvent.detail.tabIndex);
      }
    };
    window.addEventListener('tour-change-tab', handleTabChange);
    return () => window.removeEventListener('tour-change-tab', handleTabChange);
  }, []);
  const [quote, setQuote] = useState<Quote>(() => {
    if (initialQuote) {
      return {
        ...initialQuote,
        lodgings: initialQuote.lodgings || [],
        trains: initialQuote.trains || [],
        ferries: initialQuote.ferries || [],
        rentalCars: initialQuote.rentalCars || [],
        activities: initialQuote.activities || [],
        trip: { ...initialQuote.trip, type: initialQuote.trip.type || 'standard' },
      };
    }
    return createEmptyQuote(defaultTemplate?.id);
  });
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [transportTab, setTransportTab] = useState('transfers');
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const [itineraryVisible, setItineraryVisible] = useState(() => {
    const tpl = templates.find(t => t.id === (initialQuote?.templateId || defaultTemplate?.id)) || defaultTemplate || (templates[0] ?? null);
    return tpl?.sectionsToggles?.itinerary ?? true;
  });
  
  // Hook para calcular precios automáticamente (debe estar aquí con los otros hooks)
  const occupancyCalculation = useOccupancyPricingCalculator(quote);

  const currentTemplate = templates.find(t => t.id === quote.templateId) || defaultTemplate || (templates[0] ?? null);

  // Template con override de visibilidad del itinerario para preview
  const previewTemplate = useMemo(() => {
    if (!currentTemplate) return null;
    return {
      ...currentTemplate,
      sectionsToggles: {
        ...currentTemplate.sectionsToggles,
        itinerary: itineraryVisible,
      },
    };
  }, [currentTemplate, itineraryVisible]);

  // Generar quote con pricing en vivo para la vista previa del PDF
  const previewQuote = useMemo(() => {
    const allLodgings = (quote.lodgings && quote.lodgings.length > 0)
      ? quote.lodgings
      : (quote.lodging?.name ? [quote.lodging] : []);
    const hasOccupancies = allLodgings.some(l => l.useOccupancies && l.occupancies?.length);
    if (quote.flights.length > 0 || hasOccupancies) {
      const pricingUpdates = applyOccupancyPricing(occupancyCalculation);
      return {
        ...quote,
        pricing: { ...quote.pricing, ...pricingUpdates },
      };
    }
    return quote;
  }, [quote, occupancyCalculation]);

  const updateQuote = (updates: Partial<Quote>) => {
    setQuote(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  };

  // Flights
  const addFlight = (isOption: boolean = false) => {
    const optionCount = quote.flights.filter(f => f.isOption).length;
    const label = isOption ? `Opción ${optionCount + 1}` : '';
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
      isOption,
      optionLabel: label,
      flightType: 'direct',
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

  // Lodgings
  const addLodging = (isOption: boolean = false) => {
    const optionCount = (quote.lodgings || []).filter(l => l.isOption).length;
    const label = isOption ? `Opción ${optionCount + 1}` : '';
    updateQuote({ lodgings: [...(quote.lodgings || []), createEmptyLodging(isOption, label)] });
  };

  const updateLodging = (id: string, updates: Partial<Lodging>) => {
    updateQuote({
      lodgings: (quote.lodgings || []).map(l => l.id === id ? { ...l, ...updates } : l),
    });
  };

  const removeLodging = (id: string) => {
    updateQuote({ lodgings: (quote.lodgings || []).filter(l => l.id !== id) });
  };

  // Transfers
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

  // Trains
  const addTrain = () => {
    updateQuote({ trains: [...(quote.trains || []), createEmptyTrain()] });
  };

  const updateTrain = (id: string, updates: Partial<Train>) => {
    updateQuote({
      trains: (quote.trains || []).map(t => t.id === id ? { ...t, ...updates } : t),
    });
  };

  const removeTrain = (id: string) => {
    updateQuote({ trains: (quote.trains || []).filter(t => t.id !== id) });
  };

  // Ferries
  const addFerry = () => {
    updateQuote({ ferries: [...(quote.ferries || []), createEmptyFerry()] });
  };

  const updateFerry = (id: string, updates: Partial<Ferry>) => {
    updateQuote({
      ferries: (quote.ferries || []).map(f => f.id === id ? { ...f, ...updates } : f),
    });
  };

  const removeFerry = (id: string) => {
    updateQuote({ ferries: (quote.ferries || []).filter(f => f.id !== id) });
  };

  // Rental Cars
  const addRentalCar = () => {
    updateQuote({ rentalCars: [...(quote.rentalCars || []), createEmptyRentalCar()] });
  };

  const updateRentalCar = (id: string, updates: Partial<RentalCar>) => {
    updateQuote({
      rentalCars: (quote.rentalCars || []).map(r => r.id === id ? { ...r, ...updates } : r),
    });
  };

  const removeRentalCar = (id: string) => {
    updateQuote({ rentalCars: (quote.rentalCars || []).filter(r => r.id !== id) });
  };

  // Activities
  const addActivity = () => {
    updateQuote({ activities: [...(quote.activities || []), createEmptyActivity()] });
  };

  const updateActivity = (id: string, updates: Partial<Activity>) => {
    updateQuote({
      activities: (quote.activities || []).map(a => a.id === id ? { ...a, ...updates } : a),
    });
  };

  const removeActivity = (id: string) => {
    updateQuote({ activities: (quote.activities || []).filter(a => a.id !== id) });
  };

  // Cruise
  const initCruise = () => {
    if (!quote.cruise) {
      updateQuote({ cruise: createEmptyCruise() });
    }
  };

  const updateCruise = (updates: Partial<Cruise>) => {
    if (quote.cruise) {
      updateQuote({ cruise: { ...quote.cruise, ...updates } });
    }
  };

  const addCruisePort = () => {
    if (quote.cruise) {
      const newPort = createEmptyCruisePort();
      newPort.day = quote.cruise.itinerary.length + 1;
      updateQuote({
        cruise: {
          ...quote.cruise,
          itinerary: [...quote.cruise.itinerary, newPort],
        },
      });
    }
  };

  const updateCruisePort = (id: string, updates: Partial<CruisePort>) => {
    if (quote.cruise) {
      updateQuote({
        cruise: {
          ...quote.cruise,
          itinerary: quote.cruise.itinerary.map(p => p.id === id ? { ...p, ...updates } : p),
        },
      });
    }
  };

  const removeCruisePort = (id: string) => {
    if (quote.cruise) {
      updateQuote({
        cruise: {
          ...quote.cruise,
          itinerary: quote.cruise.itinerary.filter(p => p.id !== id).map((p, idx) => ({ ...p, day: idx + 1 })),
        },
      });
    }
  };

  const updateCruiseExtras = (updates: Partial<CruiseExtras>) => {
    if (quote.cruise) {
      updateQuote({
        cruise: {
          ...quote.cruise,
          extras: { ...quote.cruise.extras, ...updates },
        },
      });
    }
  };

  // Itinerary
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


  const generateItineraryWithAI = async () => {
    if (quote.itineraryDays.length > 0) {
      const confirmed = window.confirm('Ya tenés días cargados. ¿Querés reemplazarlos con el itinerario generado por IA?');
      if (!confirmed) return;
    }
    if (!quote.trip.startDate || !quote.trip.endDate) {
      toast.error('Necesitás cargar las fechas del viaje para generar el itinerario.');
      return;
    }
    setGeneratingItinerary(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: {
          trip: quote.trip,
          flights: quote.flights,
          lodgings: quote.lodgings || [],
          transfers: quote.transfers,
          activities: quote.activities || [],
          trains: quote.trains || [],
          ferries: quote.ferries || [],
          cruise: quote.cruise || null,
        },
      });
      if (error) throw new Error(error.message || 'Error al generar el itinerario');
      if (data?.error) { toast.error(data.error); return; }
      const days: ItineraryDay[] = (data.days || []).map((day: any, idx: number) => ({
        id: crypto.randomUUID(),
        dayNumber: day.dayNumber || idx + 1,
        date: day.date || '',
        title: day.title || '',
        description: day.description || '',
        activities: day.activities || [],
      }));
      updateQuote({ itineraryDays: days });
      toast.success(`Se generaron ${days.length} días de itinerario`);
    } catch (err: any) {
      console.error('Error generating itinerary:', err);
      toast.error(err.message || 'Error al generar el itinerario con IA');
    } finally {
      setGeneratingItinerary(false);
    }
  };

  const handleSave = () => {
    // Calcular alojamientos para determinar si hay ocupaciones

    const allLodgings = (quote.lodgings && quote.lodgings.length > 0)
      ? quote.lodgings
      : (quote.lodging?.name ? [quote.lodging] : []);
    const hasOccupancies = allLodgings.some(l => l.useOccupancies && l.occupancies?.length);
    
    if (quote.flights.length > 0 || hasOccupancies) {
      // Aplicar cálculos automáticos antes de guardar
      const pricingUpdates = applyOccupancyPricing(occupancyCalculation);
      const updatedQuote: Quote = {
        ...quote,
        pricing: {
          ...quote.pricing,
          ...pricingUpdates,
        },
      };
      onSave(updatedQuote);
    } else {
      onSave(quote);
    }
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] gap-6">
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Steps Navigation */}
        <div data-tour="step-tabs" className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
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
        <Card className="mb-6 flex flex-1 flex-col overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle className="flex items-center gap-2 font-serif">
              {(() => { const Icon = steps[currentStep].icon; return <Icon className="h-5 w-5 text-gold" />; })()}
              {steps[currentStep].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
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
                      data-tour="client-name"
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
                    <Label htmlFor="tripType">Tipo de viaje</Label>
                    <Select
                      value={quote.trip.type || 'standard'}
                      onValueChange={(value) => updateQuote({ trip: { ...quote.trip, type: value as any } })}
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
                {/* Instrucciones */}
                <div data-tour="flight-instructions" className="rounded-lg border border-gold/30 bg-gold/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Consejo:</strong> Puedes agregar múltiples opciones de vuelo (directo, con escala, distintos equipajes) para que el pasajero elija.
                  </p>
                </div>

                {quote.flights.map((flight, idx) => (
                  <Card key={flight.id} className={`relative ${flight.isOption ? 'border-dashed border-accent' : ''}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 text-destructive"
                      onClick={() => removeFlight(flight.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardContent className="pt-6">
                      <div className="mb-4 flex items-center gap-4">
                        <p className="font-medium text-gold">
                          {flight.isOption ? `🏷️ ${flight.optionLabel || `Opción ${idx + 1}`}` : `Tramo ${idx + 1}`}
                        </p>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={flight.isOption || false}
                            onChange={(e) => updateFlight(flight.id, { 
                              isOption: e.target.checked,
                              optionLabel: e.target.checked ? `Opción ${idx + 1}` : ''
                            })}
                            className="rounded border-gray-300"
                          />
                          Es una opción alternativa
                        </label>
                      </div>

                      {flight.isOption && (
                        <div className="mb-4">
                          <Label>Etiqueta de la opción</Label>
                          <Input
                            value={flight.optionLabel || ''}
                            onChange={(e) => updateFlight(flight.id, { optionLabel: e.target.value })}
                            placeholder="Vuelo directo con equipaje completo"
                          />
                        </div>
                      )}

                      {/* Tipo de vuelo - siempre visible */}
                      <div className="mb-4">
                        <Label className="mb-2 block">Tipo de vuelo</Label>
                        <RadioGroup 
                          value={flight.flightType || 'direct'} 
                          onValueChange={(value: 'direct' | 'stopover' | 'charter') => updateFlight(flight.id, { flightType: value })}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="direct" id={`flight-type-direct-${flight.id}`} />
                            <Label htmlFor={`flight-type-direct-${flight.id}`} className="cursor-pointer font-normal">
                              ✈️ Directo
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="stopover" id={`flight-type-stopover-${flight.id}`} />
                            <Label htmlFor={`flight-type-stopover-${flight.id}`} className="cursor-pointer font-normal">
                              ✈️ Con escala
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="charter" id={`flight-type-charter-${flight.id}`} />
                            <Label htmlFor={`flight-type-charter-${flight.id}`} className="cursor-pointer font-normal">
                              ✈️ Charter
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

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
                        {/* Equipaje con opciones predefinidas */}
                        <div className="md:col-span-2">
                          <Label>Equipaje</Label>
                          <div className="flex gap-2">
                            <Select
                              value={flight.luggageType || 'custom'}
                              onValueChange={(value: LuggageType) => {
                                if (value === 'custom') {
                                  updateFlight(flight.id, { luggageType: 'custom' });
                                } else {
                                  updateFlight(flight.id, { 
                                    luggageType: value,
                                    luggage: LUGGAGE_LABELS[value]
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="w-1/2">
                                <SelectValue placeholder="Selecciona tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="personal">🎒 Artículo Personal</SelectItem>
                                <SelectItem value="personal_carryon">🎒 + 🧳 Art. Personal + Carry On</SelectItem>
                                <SelectItem value="personal_carryon_checked">🎒 + 🧳 + 🛄 Art. Personal + Carry On + Bodega</SelectItem>
                                <SelectItem value="custom">✏️ Personalizado...</SelectItem>
                              </SelectContent>
                            </Select>
                            {(flight.luggageType === 'custom' || !flight.luggageType) && (
                              <Input
                                className="flex-1"
                                value={flight.luggage}
                                onChange={(e) => updateFlight(flight.id, { luggage: e.target.value })}
                                placeholder="Ej: 2 valijas de 23kg + carry-on"
                              />
                            )}
                          </div>
                          {flight.luggageType && flight.luggageType !== 'custom' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {LUGGAGE_LABELS[flight.luggageType]}
                            </p>
                          )}
                        </div>

                        {/* Vincular vuelos (escala / ida y vuelta) */}
                        <div className="md:col-span-2">
                          <Label>Vincular vuelos (escala / ida y vuelta)</Label>
                          <Select
                            value={flight.connectionGroupId || 'none'}
                            onValueChange={(value) => {
                              if (value === 'none') {
                                updateFlight(flight.id, { connectionGroupId: undefined });
                              } else if (value === 'new') {
                                // Crear nuevo grupo de vuelos
                                const newGroupId = crypto.randomUUID();
                                updateFlight(flight.id, { 
                                  connectionGroupId: newGroupId,
                                  flightType: 'stopover' 
                                });
                              } else {
                                updateFlight(flight.id, { 
                                  connectionGroupId: value,
                                  flightType: 'stopover'
                                });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sin vincular (vuelo independiente)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">🚀 Sin vincular (vuelo independiente)</SelectItem>
                              <SelectItem value="new">➕ Crear nuevo grupo de vuelos</SelectItem>
                              {/* Mostrar vuelos existentes que podrían ser conexiones */}
                              {quote.flights
                                .filter(f => f.id !== flight.id && f.connectionGroupId)
                                .reduce((groups, f) => {
                                  if (f.connectionGroupId && !groups.includes(f.connectionGroupId)) {
                                    groups.push(f.connectionGroupId);
                                  }
                                  return groups;
                                }, [] as string[])
                                .map((groupId, gIdx) => {
                                  const groupFlights = quote.flights.filter(f => f.connectionGroupId === groupId);
                                  const label = groupFlights.map(f => `${f.origin}→${f.destination}`).join(' + ');
                                  return (
                                    <SelectItem key={groupId} value={groupId}>
                                      🔗 Grupo {gIdx + 1}: {label}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                          {flight.connectionGroupId && (
                            <p className="text-xs text-amber-600 mt-1">
                              ✈️ Este vuelo está vinculado con otros tramos del mismo paquete aéreo
                            </p>
                          )}
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
                        <SupplierSelect
                          value={flight.supplier}
                          onChange={(val) => updateFlight(flight.id, { supplier: val })}
                        />
                        <div className="grid grid-cols-2 gap-2 md:col-span-2">
                          <div>
                            <Label>Costo neto ({quote.trip.currency})</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={flight.cost || ''}
                              onChange={(e) => updateFlight(flight.id, { cost: parseFloat(e.target.value) || undefined })}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Precio venta ({quote.trip.currency})</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={flight.price || ''}
                              onChange={(e) => updateFlight(flight.id, { price: parseFloat(e.target.value) || undefined })}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button data-tour="add-flight" variant="outline" onClick={() => addFlight(false)} className="flex-1">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar vuelo
                  </Button>
                  <Button data-tour="add-flight-option" variant="outline" onClick={() => addFlight(true)} className="flex-1 border-dashed border-accent text-accent hover:bg-accent/10">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar opción de vuelo
                  </Button>
                  <div data-tour="pnr-parser">
                    <PNRParserDialog onFlightsParsed={handleFlightsParsed} />
                  </div>
                </div>
              </div>
            )}

            {/* Alojamiento */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* Instrucciones según tipo de viaje */}
                <div data-tour="lodging-instructions" className="rounded-lg border border-gold/30 bg-gold/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    {quote.trip.type === 'multiDestination' 
                      ? <><strong>Viaje multi-destino:</strong> Agrega un alojamiento por cada destino del tour.</>
                      : <><strong>Consejo:</strong> Puedes agregar múltiples opciones de alojamiento para que el pasajero elija.</>
                    }
                  </p>
                </div>

                {/* Lista de alojamientos */}
                <div className="space-y-4">
                  {(quote.lodgings || []).map((lodging, idx) => (
                    <Card key={lodging.id} className={`relative ${lodging.isOption ? 'border-dashed border-accent' : ''}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 text-destructive"
                        onClick={() => removeLodging(lodging.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <CardContent className="pt-6">
                        <div className="mb-4 flex items-center gap-4">
                          <p className="font-medium text-gold">
                            {lodging.isOption ? `🏷️ ${lodging.optionLabel || `Opción ${idx + 1}`}` : `Alojamiento ${idx + 1}`}
                          </p>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={lodging.isOption || false}
                              onChange={(e) => updateLodging(lodging.id!, { 
                                isOption: e.target.checked,
                                optionLabel: e.target.checked ? `Opción ${idx + 1}` : ''
                              })}
                              className="rounded border-gray-300"
                            />
                            Es una opción alternativa
                          </label>
                        </div>
                        
                        {lodging.isOption && (
                          <div className="mb-4">
                            <div>
                              <Label>Etiqueta de la opción</Label>
                              <Input
                                value={lodging.optionLabel || ''}
                                onChange={(e) => updateLodging(lodging.id!, { optionLabel: e.target.value })}
                                placeholder="Opción económica, Opción premium..."
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <Label>Destino / Ciudad</Label>
                            <Input
                              value={lodging.destination || ''}
                              onChange={(e) => updateLodging(lodging.id!, { destination: e.target.value })}
                              placeholder="París, Francia"
                            />
                          </div>
                          <div>
                            <Label>Nombre del hotel</Label>
                            <Input
                              value={lodging.name}
                              onChange={(e) => updateLodging(lodging.id!, { name: e.target.value })}
                              placeholder="Grand Fiesta Americana"
                            />
                          </div>
                          <div>
                            <Label>Categoría</Label>
                            <Input
                              value={lodging.category}
                              onChange={(e) => updateLodging(lodging.id!, { category: e.target.value })}
                              placeholder="5 Estrellas"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Dirección</Label>
                            <Input
                              value={lodging.address}
                              onChange={(e) => updateLodging(lodging.id!, { address: e.target.value })}
                              placeholder="Boulevard Kukulcán Km 9.5..."
                            />
                          </div>
                          <div>
                            <Label>Check-in</Label>
                            <Input
                              type="date"
                              value={lodging.checkIn}
                              onChange={(e) => updateLodging(lodging.id!, { checkIn: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Check-out</Label>
                            <Input
                              type="date"
                              value={lodging.checkOut}
                              onChange={(e) => updateLodging(lodging.id!, { checkOut: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Régimen</Label>
                            <Input
                              value={lodging.regime}
                              onChange={(e) => updateLodging(lodging.id!, { regime: e.target.value })}
                              placeholder="All Inclusive"
                            />
                          </div>
                          <div>
                            <Label>Tipo de habitación</Label>
                            <Input
                              value={lodging.roomType}
                              onChange={(e) => updateLodging(lodging.id!, { roomType: e.target.value })}
                              placeholder="Suite Ocean View"
                            />
                          </div>
                          <div>
                            <Label>Noches</Label>
                            <Input
                              type="number"
                              min={0}
                              value={lodging.nights}
                              onChange={(e) => updateLodging(lodging.id!, { nights: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Notas</Label>
                            <Textarea
                              value={lodging.notes}
                              onChange={(e) => updateLodging(lodging.id!, { notes: e.target.value })}
                              placeholder="Vista al mar, amenities..."
                              rows={2}
                            />
                          </div>
                          <SupplierSelect
                            value={lodging.supplier}
                            onChange={(val) => updateLodging(lodging.id!, { supplier: val })}
                          />
                          
                          {/* Pricing mode and cost/price fields */}
                          <div className="md:col-span-2 border-t pt-4 mt-2">
                            <div className="mb-4 flex items-center gap-4">
                              <Label className="text-sm font-medium">Modo de precio:</Label>
                              <RadioGroup
                                value={lodging.pricingMode || 'perNight'}
                                onValueChange={(value) => updateLodging(lodging.id!, { 
                                  pricingMode: value as 'perNight' | 'total' 
                                })}
                                className="flex gap-4"
                              >
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
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={lodging.costPerNight || ''}
                                    onChange={(e) => updateLodging(lodging.id!, { costPerNight: parseFloat(e.target.value) || undefined })}
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label>Precio por noche ({quote.trip.currency})</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={lodging.pricePerNight || ''}
                                    onChange={(e) => updateLodging(lodging.id!, { pricePerNight: parseFloat(e.target.value) || undefined })}
                                    placeholder="0.00"
                                  />
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
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={lodging.totalCost || ''}
                                    onChange={(e) => updateLodging(lodging.id!, { totalCost: parseFloat(e.target.value) || undefined })}
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <Label>Precio total ({lodging.nights} noches)</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={lodging.totalPrice || ''}
                                    onChange={(e) => updateLodging(lodging.id!, { totalPrice: parseFloat(e.target.value) || undefined })}
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Occupancy Configuration - available for all lodgings including options */}
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

                {/* Botones para agregar */}
                <div className="flex flex-wrap gap-2">
                  <Button data-tour="add-lodging" variant="outline" onClick={() => addLodging(false)} className="flex-1">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar alojamiento
                  </Button>
                  <Button data-tour="add-lodging-option" variant="outline" onClick={() => addLodging(true)} className="flex-1 border-dashed">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar opción alternativa
                  </Button>
                </div>
              </div>
            )}

            {/* Transporte */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <Tabs value={transportTab} onValueChange={setTransportTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="transfers">Traslados</TabsTrigger>
                    <TabsTrigger value="trains">Trenes</TabsTrigger>
                    <TabsTrigger value="ferries">Ferrys</TabsTrigger>
                    <TabsTrigger value="rentals">Autos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="transfers" className="space-y-4">
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
                              <Select
                                value={transfer.type}
                                onValueChange={(value) => updateTransfer(transfer.id, { type: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Privado">Privado</SelectItem>
                                  <SelectItem value="Regular">Regular</SelectItem>
                                </SelectContent>
                              </Select>
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
                            <SupplierSelect
                              value={transfer.supplier}
                              onChange={(val) => updateTransfer(transfer.id, { supplier: val })}
                            />
                            <div>
                              <Label>Costo neto ({quote.trip.currency})</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={transfer.cost || ''}
                                onChange={(e) => updateTransfer(transfer.id, { cost: parseFloat(e.target.value) || undefined })}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label>Precio venta ({quote.trip.currency})</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={transfer.price || ''}
                                onChange={(e) => updateTransfer(transfer.id, { price: parseFloat(e.target.value) || undefined })}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button variant="outline" onClick={addTransfer} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar traslado
                    </Button>
                  </TabsContent>

                  <TabsContent value="trains" className="space-y-4">
                    {(quote.trains || []).map((train, idx) => (
                      <Card key={train.id} className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 text-destructive"
                          onClick={() => removeTrain(train.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <CardContent className="pt-6">
                          <p className="mb-4 font-medium text-muted-foreground">Tren {idx + 1}</p>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label>Origen</Label>
                              <Input
                                value={train.origin}
                                onChange={(e) => updateTrain(train.id, { origin: e.target.value })}
                                placeholder="París Gare du Nord"
                              />
                            </div>
                            <div>
                              <Label>Destino</Label>
                              <Input
                                value={train.destination}
                                onChange={(e) => updateTrain(train.id, { destination: e.target.value })}
                                placeholder="Londres St Pancras"
                              />
                            </div>
                            <div>
                              <Label>Fecha</Label>
                              <Input
                                type="date"
                                value={train.date}
                                onChange={(e) => updateTrain(train.id, { date: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label>Salida</Label>
                                <Input
                                  type="time"
                                  value={train.departureTime}
                                  onChange={(e) => updateTrain(train.id, { departureTime: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Llegada</Label>
                                <Input
                                  value={train.arrivalTime}
                                  onChange={(e) => updateTrain(train.id, { arrivalTime: e.target.value })}
                                  placeholder="14:30"
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Compañía</Label>
                              <Input
                                value={train.company}
                                onChange={(e) => updateTrain(train.id, { company: e.target.value })}
                                placeholder="Eurostar"
                              />
                            </div>
                            <div>
                              <Label>Número de tren</Label>
                              <Input
                                value={train.trainNumber}
                                onChange={(e) => updateTrain(train.id, { trainNumber: e.target.value })}
                                placeholder="ES9024"
                              />
                            </div>
                            <div>
                              <Label>Clase</Label>
                              <Input
                                value={train.class}
                                onChange={(e) => updateTrain(train.id, { class: e.target.value })}
                                placeholder="Business Premier"
                              />
                            </div>
                            <div>
                              <Label>Asiento</Label>
                              <Input
                                value={train.seat}
                                onChange={(e) => updateTrain(train.id, { seat: e.target.value })}
                                placeholder="12A"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label>Notas</Label>
                              <Textarea
                                value={train.notes}
                                onChange={(e) => updateTrain(train.id, { notes: e.target.value })}
                                placeholder="WiFi incluido, café gratis..."
                                rows={2}
                              />
                            </div>
                            <SupplierSelect
                              value={train.supplier}
                              onChange={(val) => updateTrain(train.id, { supplier: val })}
                            />
                            <div>
                              <Label>Costo neto ({quote.trip.currency})</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={train.cost || ''}
                                onChange={(e) => updateTrain(train.id, { cost: parseFloat(e.target.value) || undefined })}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label>Precio venta ({quote.trip.currency})</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={train.price || ''}
                                onChange={(e) => updateTrain(train.id, { price: parseFloat(e.target.value) || undefined })}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button variant="outline" onClick={addTrain} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar tren
                    </Button>
                  </TabsContent>

                  <TabsContent value="ferries" className="space-y-4">
                    {(quote.ferries || []).map((ferry, idx) => (
                      <Card key={ferry.id} className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 text-destructive"
                          onClick={() => removeFerry(ferry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <CardContent className="pt-6">
                          <p className="mb-4 font-medium text-muted-foreground">Ferry {idx + 1}</p>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label>Origen</Label>
                              <Input
                                value={ferry.origin}
                                onChange={(e) => updateFerry(ferry.id, { origin: e.target.value })}
                                placeholder="Pireo, Grecia"
                              />
                            </div>
                            <div>
                              <Label>Destino</Label>
                              <Input
                                value={ferry.destination}
                                onChange={(e) => updateFerry(ferry.id, { destination: e.target.value })}
                                placeholder="Santorini, Grecia"
                              />
                            </div>
                            <div>
                              <Label>Fecha</Label>
                              <Input
                                type="date"
                                value={ferry.date}
                                onChange={(e) => updateFerry(ferry.id, { date: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label>Salida</Label>
                                <Input
                                  type="time"
                                  value={ferry.departureTime}
                                  onChange={(e) => updateFerry(ferry.id, { departureTime: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Llegada</Label>
                                <Input
                                  value={ferry.arrivalTime}
                                  onChange={(e) => updateFerry(ferry.id, { arrivalTime: e.target.value })}
                                  placeholder="15:30"
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Compañía</Label>
                              <Input
                                value={ferry.company}
                                onChange={(e) => updateFerry(ferry.id, { company: e.target.value })}
                                placeholder="Blue Star Ferries"
                              />
                            </div>
                            <div>
                              <Label>Embarcación</Label>
                              <Input
                                value={ferry.vessel}
                                onChange={(e) => updateFerry(ferry.id, { vessel: e.target.value })}
                                placeholder="Blue Star Delos"
                              />
                            </div>
                            <div>
                              <Label>Tipo de cabina/asiento</Label>
                              <Input
                                value={ferry.cabinType}
                                onChange={(e) => updateFerry(ferry.id, { cabinType: e.target.value })}
                                placeholder="Cabina exterior doble"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label>Notas</Label>
                              <Textarea
                                value={ferry.notes}
                                onChange={(e) => updateFerry(ferry.id, { notes: e.target.value })}
                                placeholder="Vista al mar, restaurante a bordo..."
                                rows={2}
                              />
                            </div>
                            <SupplierSelect
                              value={ferry.supplier}
                              onChange={(val) => updateFerry(ferry.id, { supplier: val })}
                            />
                            <div>
                              <Label>Costo neto ({quote.trip.currency})</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={ferry.cost || ''}
                                onChange={(e) => updateFerry(ferry.id, { cost: parseFloat(e.target.value) || undefined })}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label>Precio venta ({quote.trip.currency})</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={ferry.price || ''}
                                onChange={(e) => updateFerry(ferry.id, { price: parseFloat(e.target.value) || undefined })}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button variant="outline" onClick={addFerry} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar ferry
                    </Button>
                  </TabsContent>

                  <TabsContent value="rentals" className="space-y-4">
                    {(quote.rentalCars || []).map((car, idx) => (
                      <Card key={car.id} className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 text-destructive"
                          onClick={() => removeRentalCar(car.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <CardContent className="pt-6">
                          <p className="mb-4 font-medium text-muted-foreground">Auto {idx + 1}</p>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label>Compañía</Label>
                              <Input
                                value={car.company}
                                onChange={(e) => updateRentalCar(car.id, { company: e.target.value })}
                                placeholder="Hertz"
                              />
                            </div>
                            <div>
                              <Label>Tipo de vehículo</Label>
                              <Input
                                value={car.carType}
                                onChange={(e) => updateRentalCar(car.id, { carType: e.target.value })}
                                placeholder="SUV Compacto"
                              />
                            </div>
                            <div>
                              <Label>Lugar de retiro</Label>
                              <Input
                                value={car.pickupLocation}
                                onChange={(e) => updateRentalCar(car.id, { pickupLocation: e.target.value })}
                                placeholder="Aeropuerto de Roma"
                              />
                            </div>
                            <div>
                              <Label>Lugar de devolución</Label>
                              <Input
                                value={car.dropoffLocation}
                                onChange={(e) => updateRentalCar(car.id, { dropoffLocation: e.target.value })}
                                placeholder="Aeropuerto de Florencia"
                              />
                            </div>
                            <div>
                              <Label>Fecha retiro</Label>
                              <Input
                                type="date"
                                value={car.pickupDate}
                                onChange={(e) => updateRentalCar(car.id, { pickupDate: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Hora retiro</Label>
                              <Input
                                type="time"
                                value={car.pickupTime}
                                onChange={(e) => updateRentalCar(car.id, { pickupTime: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Fecha devolución</Label>
                              <Input
                                type="date"
                                value={car.dropoffDate}
                                onChange={(e) => updateRentalCar(car.id, { dropoffDate: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label>Hora devolución</Label>
                              <Input
                                type="time"
                                value={car.dropoffTime}
                                onChange={(e) => updateRentalCar(car.id, { dropoffTime: e.target.value })}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label>Extras</Label>
                              <Input
                                value={car.extras}
                                onChange={(e) => updateRentalCar(car.id, { extras: e.target.value })}
                                placeholder="GPS, silla de bebé, seguro full coverage"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label>Notas</Label>
                              <Textarea
                                value={car.notes}
                                onChange={(e) => updateRentalCar(car.id, { notes: e.target.value })}
                                placeholder="Conductor adicional incluido..."
                                rows={2}
                              />
                            </div>
                            <SupplierSelect
                              value={car.supplier}
                              onChange={(val) => updateRentalCar(car.id, { supplier: val })}
                            />
                            <div>
                              <Label>Costo neto ({quote.trip.currency})</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={car.cost || ''}
                                onChange={(e) => updateRentalCar(car.id, { cost: parseFloat(e.target.value) || undefined })}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label>Precio venta ({quote.trip.currency})</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={car.price || ''}
                                onChange={(e) => updateRentalCar(car.id, { price: parseFloat(e.target.value) || undefined })}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button variant="outline" onClick={addRentalCar} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar auto de alquiler
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Crucero */}
            {currentStep === 6 && (
              <div className="space-y-6">
                {!quote.cruise ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Ship className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">No hay crucero configurado</p>
                    <Button onClick={initCruise} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar crucero
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Información del barco</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Nombre del barco</Label>
                            <Input
                              value={quote.cruise.shipName}
                              onChange={(e) => updateCruise({ shipName: e.target.value })}
                              placeholder="Norwegian Escape"
                            />
                          </div>
                          <div>
                            <Label>Compañía</Label>
                            <Input
                              value={quote.cruise.company}
                              onChange={(e) => updateCruise({ company: e.target.value })}
                              placeholder="Norwegian Cruise Line"
                            />
                          </div>
                          <div>
                            <Label>Tipo de cabina</Label>
                            <Input
                              value={quote.cruise.cabinType}
                              onChange={(e) => updateCruise({ cabinType: e.target.value })}
                              placeholder="Balcón"
                            />
                          </div>
                          <div>
                            <Label>Número de cabina</Label>
                            <Input
                              value={quote.cruise.cabinNumber}
                              onChange={(e) => updateCruise({ cabinNumber: e.target.value })}
                              placeholder="9124"
                            />
                          </div>
                          <div>
                            <Label>Cubierta</Label>
                            <Input
                              value={quote.cruise.deck}
                              onChange={(e) => updateCruise({ deck: e.target.value })}
                              placeholder="Deck 9"
                            />
                          </div>
                          <div>
                            <Label>Régimen</Label>
                            <Input
                              value={quote.cruise.regime}
                              onChange={(e) => updateCruise({ regime: e.target.value })}
                              placeholder="Full Board"
                            />
                          </div>
                          <div>
                            <Label>Noches</Label>
                            <Input
                              type="number"
                              min={0}
                              value={quote.cruise.nights}
                              onChange={(e) => updateCruise({ nights: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <SupplierSelect
                            value={quote.cruise?.supplier}
                            onChange={(val) => updateCruise({ supplier: val })}
                          />
                          <div>
                            <Label>Costo neto total ({quote.trip.currency})</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={quote.cruise.cost || ''}
                              onChange={(e) => updateCruise({ cost: parseFloat(e.target.value) || undefined })}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Precio venta total ({quote.trip.currency})</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={quote.cruise.price || ''}
                              onChange={(e) => updateCruise({ price: parseFloat(e.target.value) || undefined })}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Embarque y desembarque</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Puerto de embarque</Label>
                            <Input
                              value={quote.cruise.embarkationPort}
                              onChange={(e) => updateCruise({ embarkationPort: e.target.value })}
                              placeholder="Miami, Florida"
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
                              placeholder="Miami, Florida"
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

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Itinerario del crucero</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {quote.cruise.itinerary.map((port) => (
                          <Card key={port.id} className="relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2 h-8 w-8 text-destructive"
                              onClick={() => removeCruisePort(port.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <CardContent className="pt-6">
                              <p className="mb-4 font-medium text-gold">Día {port.day}</p>
                              <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                  <Label>Puerto</Label>
                                  <Input
                                    value={port.port}
                                    onChange={(e) => updateCruisePort(port.id, { port: e.target.value })}
                                    placeholder="Cozumel"
                                  />
                                </div>
                                <div>
                                  <Label>País</Label>
                                  <Input
                                    value={port.country}
                                    onChange={(e) => updateCruisePort(port.id, { country: e.target.value })}
                                    placeholder="México"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label>Llegada</Label>
                                    <Input
                                      type="time"
                                      value={port.arrivalTime}
                                      onChange={(e) => updateCruisePort(port.id, { arrivalTime: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Salida</Label>
                                    <Input
                                      type="time"
                                      value={port.departureTime}
                                      onChange={(e) => updateCruisePort(port.id, { departureTime: e.target.value })}
                                    />
                                  </div>
                                </div>
                                <div className="md:col-span-3">
                                  <Label>Notas</Label>
                                  <Input
                                    value={port.notes}
                                    onChange={(e) => updateCruisePort(port.id, { notes: e.target.value })}
                                    placeholder="Día en el mar, excursión opcional..."
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Button variant="outline" onClick={addCruisePort} className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar puerto
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Extras del crucero</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Propinas</Label>
                            <Input
                              value={quote.cruise.extras.tips}
                              onChange={(e) => updateCruiseExtras({ tips: e.target.value })}
                              placeholder="USD 16 por persona por día"
                            />
                          </div>
                          <div>
                            <Label>Paquete de bebidas</Label>
                            <Input
                              value={quote.cruise.extras.beverages}
                              onChange={(e) => updateCruiseExtras({ beverages: e.target.value })}
                              placeholder="Premium Plus Beverage Package"
                            />
                          </div>
                          <div>
                            <Label>WiFi</Label>
                            <Input
                              value={quote.cruise.extras.wifi}
                              onChange={(e) => updateCruiseExtras({ wifi: e.target.value })}
                              placeholder="Paquete Unlimited WiFi"
                            />
                          </div>
                          <div>
                            <Label>Excursiones</Label>
                            <Input
                              value={quote.cruise.extras.excursions}
                              onChange={(e) => updateCruiseExtras({ excursions: e.target.value })}
                              placeholder="Shore Excursion Credit USD 150"
                            />
                          </div>
                          <div>
                            <Label>Restaurantes especiales</Label>
                            <Input
                              value={quote.cruise.extras.specialDining}
                              onChange={(e) => updateCruiseExtras({ specialDining: e.target.value })}
                              placeholder="Specialty Dining Package 3 cenas"
                            />
                          </div>
                          <div>
                            <Label>Spa</Label>
                            <Input
                              value={quote.cruise.extras.spa}
                              onChange={(e) => updateCruiseExtras({ spa: e.target.value })}
                              placeholder="Thermal Suite Pass"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Otros extras</Label>
                            <Textarea
                              value={quote.cruise.extras.other}
                              onChange={(e) => updateCruiseExtras({ other: e.target.value })}
                              placeholder="Cualquier otro extra o información..."
                              rows={2}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div>
                      <Label>Notas generales del crucero</Label>
                      <Textarea
                        value={quote.cruise.notes}
                        onChange={(e) => updateCruise({ notes: e.target.value })}
                        placeholder="Información adicional..."
                        rows={3}
                      />
                    </div>

                    <Button 
                      variant="destructive" 
                      onClick={() => updateQuote({ cruise: undefined })}
                      className="w-full"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar crucero
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Excursiones/Actividades */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    Agrega excursiones, tours o actividades que formen parte del paquete.
                  </p>
                </div>
                {(quote.activities || []).map((activity, idx) => (
                  <Card key={activity.id} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 text-destructive"
                      onClick={() => removeActivity(activity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <CardContent className="pt-6">
                      <p className="mb-4 font-medium text-gold">Actividad {idx + 1}</p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <Label>Nombre de la actividad</Label>
                          <Input
                            value={activity.name}
                            onChange={(e) => updateActivity(activity.id, { name: e.target.value })}
                            placeholder="Tour a Chichén Itzá"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Descripción</Label>
                          <Textarea
                            value={activity.description}
                            onChange={(e) => updateActivity(activity.id, { description: e.target.value })}
                            placeholder="Visita guiada a las ruinas mayas..."
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Fecha</Label>
                          <Input
                            type="date"
                            value={activity.date}
                            onChange={(e) => updateActivity(activity.id, { date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Hora</Label>
                          <Input
                            type="time"
                            value={activity.time}
                            onChange={(e) => updateActivity(activity.id, { time: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Duración</Label>
                          <Input
                            value={activity.duration}
                            onChange={(e) => updateActivity(activity.id, { duration: e.target.value })}
                            placeholder="8 horas"
                          />
                        </div>
                        <div>
                          <Label>Ubicación</Label>
                          <Input
                            value={activity.location}
                            onChange={(e) => updateActivity(activity.id, { location: e.target.value })}
                            placeholder="Yucatán, México"
                          />
                        </div>
                        <div className="flex items-end gap-4">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={activity.included}
                              onChange={(e) => updateActivity(activity.id, { included: e.target.checked })}
                              className="h-4 w-4 rounded border-border"
                            />
                            Incluida en el paquete
                          </label>
                        </div>
                        <SupplierSelect
                          value={activity.supplier}
                          onChange={(val) => updateActivity(activity.id, { supplier: val })}
                        />
                        <div>
                          <Label>Costo neto ({quote.trip.currency})</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={activity.cost || ''}
                            onChange={(e) => updateActivity(activity.id, { cost: parseFloat(e.target.value) || undefined })}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label>Precio venta ({quote.trip.currency})</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={activity.price || ''}
                            onChange={(e) => updateActivity(activity.id, { price: parseFloat(e.target.value) || undefined })}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Notas</Label>
                          <Textarea
                            value={activity.notes}
                            onChange={(e) => updateActivity(activity.id, { notes: e.target.value })}
                            placeholder="Incluye almuerzo, traslados..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addActivity} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar actividad/excursión
                </Button>
              </div>
            )}

            {/* Asistencia */}
            {currentStep === 8 && (
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
                <SupplierSelect
                  value={quote.insurance.supplier}
                  onChange={(val) => updateQuote({ insurance: { ...quote.insurance, supplier: val } })}
                />
                <div>
                  <Label>Costo neto ({quote.trip.currency})</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={quote.insurance.cost || ''}
                    onChange={(e) => updateQuote({ insurance: { ...quote.insurance, cost: parseFloat(e.target.value) || undefined } })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Precio venta ({quote.trip.currency})</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={quote.insurance.price || ''}
                    onChange={(e) => updateQuote({ insurance: { ...quote.insurance, price: parseFloat(e.target.value) || undefined } })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Precio */}
            {currentStep === 9 && (
              <PricingSection
                quote={quote}
                onUpdatePricing={(pricingUpdates) => updateQuote({ pricing: { ...quote.pricing, ...pricingUpdates } })}
              />
            )}

            {/* Itinerario */}
            {currentStep === 10 && (
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
            {currentStep === 11 && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                {currentTemplate ? (
                  <PDFPreview quote={previewQuote} template={currentTemplate} />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p>No hay plantilla seleccionada</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={currentStep === 0 ? onCancel : goPrev}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {currentStep === 0 ? 'Cancelar' : 'Anterior'}
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreviewPanel(!showPreviewPanel)}
              className="hidden lg:flex"
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreviewPanel ? 'Ocultar' : 'Vista previa'}
            </Button>
            
            {currentStep === steps.length - 1 ? (
              <Button data-tour="save-button" onClick={handleSave} className="bg-gold text-gold-foreground hover:bg-gold/90">
                Guardar presupuesto
              </Button>
            ) : (
              <Button onClick={goNext}>
                Siguiente
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreviewPanel && currentTemplate && (
        <div className="hidden w-[400px] shrink-0 lg:block">
          <div className="sticky top-4 rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-serif font-semibold">Vista previa</h3>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <PDFPreview quote={previewQuote} template={currentTemplate} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
