import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Quote, Template } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Eye, User, Image, Plane, Building2, Car, Shield, DollarSign, Calendar, Anchor, Compass, Palette, StickyNote, Check, Loader2 } from 'lucide-react';
import { PDFPreview } from '@/components/pdf/PDFPreview';
import { PricingSection } from '@/components/quotes/PricingSection';
import { useOccupancyPricingCalculator, applyOccupancyPricing } from '@/hooks/useOccupancyPricingCalculator';
import { useQuotes } from '@/contexts/QuotesContext';

import { TemplateStep } from './steps/TemplateStep';
import { GeneralStep } from './steps/GeneralStep';
import { CoverStep } from './steps/CoverStep';
import { FlightsStep } from './steps/FlightsStep';
import { LodgingStep } from './steps/LodgingStep';
import { TransportStep } from './steps/TransportStep';
import { CruiseStep } from './steps/CruiseStep';
import { ActivitiesStep } from './steps/ActivitiesStep';
import { InsuranceStep } from './steps/InsuranceStep';
import { ItineraryStep } from './steps/ItineraryStep';

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
  { id: 'notes', label: 'Notas', icon: StickyNote },
  { id: 'preview', label: 'Vista Previa', icon: Eye },
];

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
  status: 'draft',
  internalNotes: '',
});

export function QuoteWizard({ initialQuote, templates, defaultTemplate, onSave, onCancel }: QuoteWizardProps) {
  const { autoSaveQuote } = useQuotes();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ tabIndex: number }>;
      if (customEvent.detail?.tabIndex !== undefined) setCurrentStep(customEvent.detail.tabIndex);
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
        itineraryDays: initialQuote.itineraryDays || [],
        trip: { ...initialQuote.trip, type: initialQuote.trip.type || 'standard' },
        status: initialQuote.status || 'draft',
        internalNotes: initialQuote.internalNotes || '',
      };
    }
    return createEmptyQuote(defaultTemplate?.id);
  });

  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [itineraryVisible, setItineraryVisible] = useState(() => {
    const tpl = templates.find(t => t.id === (initialQuote?.templateId || defaultTemplate?.id)) || defaultTemplate || (templates[0] ?? null);
    return tpl?.sectionsToggles?.itinerary ?? true;
  });

  const occupancyCalculation = useOccupancyPricingCalculator(quote);
  const currentTemplate = templates.find(t => t.id === quote.templateId) || defaultTemplate || (templates[0] ?? null);

  const previewTemplate = useMemo(() => {
    if (!currentTemplate) return null;
    return { ...currentTemplate, sectionsToggles: { ...currentTemplate.sectionsToggles, itinerary: itineraryVisible } };
  }, [currentTemplate, itineraryVisible]);

  const previewQuote = useMemo(() => {
    const allLodgings = (quote.lodgings && quote.lodgings.length > 0) ? quote.lodgings : (quote.lodging?.name ? [quote.lodging] : []);
    const hasOccupancies = allLodgings.some(l => l.useOccupancies && l.occupancies?.length);
    if (quote.flights.length > 0 || hasOccupancies) {
      const pricingUpdates = applyOccupancyPricing(occupancyCalculation);
      return { ...quote, pricing: { ...quote.pricing, ...pricingUpdates } };
    }
    return quote;
  }, [quote, occupancyCalculation]);

  const updateQuote = (updates: Partial<Quote>) => {
    setQuote(prev => ({ ...prev, ...updates, updatedAt: new Date().toISOString() }));
  };

  // Auto-save with 3s debounce
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const allLodgings = (quote.lodgings && quote.lodgings.length > 0) ? quote.lodgings : (quote.lodging?.name ? [quote.lodging] : []);
        const hasOccupancies = allLodgings.some(l => l.useOccupancies && l.occupancies?.length);
        let quoteToSave = quote;
        if (quote.flights.length > 0 || hasOccupancies) {
          const pricingUpdates = applyOccupancyPricing(occupancyCalculation);
          quoteToSave = { ...quote, pricing: { ...quote.pricing, ...pricingUpdates } };
        }
        await autoSaveQuote(quoteToSave);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 3000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [quote, autoSaveQuote]);

  const handleSave = () => {
    const allLodgings = (quote.lodgings && quote.lodgings.length > 0) ? quote.lodgings : (quote.lodging?.name ? [quote.lodging] : []);
    const hasOccupancies = allLodgings.some(l => l.useOccupancies && l.occupancies?.length);
    if (quote.flights.length > 0 || hasOccupancies) {
      const pricingUpdates = applyOccupancyPricing(occupancyCalculation);
      onSave({ ...quote, pricing: { ...quote.pricing, ...pricingUpdates } });
    } else {
      onSave(quote);
    }
  };

  const goNext = () => { if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1); };
  const goPrev = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return <TemplateStep quote={quote} templates={templates} onUpdate={updateQuote} />;
      case 1: return <GeneralStep quote={quote} onUpdate={updateQuote} />;
      case 2: return <CoverStep quote={quote} templates={templates} onUpdate={updateQuote} />;
      case 3: return <FlightsStep quote={quote} onUpdate={updateQuote} />;
      case 4: return <LodgingStep quote={quote} onUpdate={updateQuote} />;
      case 5: return <TransportStep quote={quote} onUpdate={updateQuote} />;
      case 6: return <CruiseStep quote={quote} onUpdate={updateQuote} />;
      case 7: return <ActivitiesStep quote={quote} onUpdate={updateQuote} />;
      case 8: return <InsuranceStep quote={quote} onUpdate={updateQuote} />;
      case 9: return <PricingSection quote={quote} onUpdatePricing={(pricingUpdates) => updateQuote({ pricing: { ...quote.pricing, ...pricingUpdates } })} />;
      case 10: return <ItineraryStep quote={quote} onUpdate={updateQuote} itineraryVisible={itineraryVisible} onItineraryVisibleChange={setItineraryVisible} />;
      case 11: return (
        <div className="space-y-4">
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Notas internas:</strong> Estas notas son solo para uso interno y no se mostrarán en el PDF ni al cliente.
            </p>
          </div>
          <div>
            <Label htmlFor="internalNotes">Notas internas</Label>
            <Textarea
              id="internalNotes"
              value={quote.internalNotes || ''}
              onChange={(e) => updateQuote({ internalNotes: e.target.value })}
              placeholder="Recordatorios, seguimiento, notas para el equipo..."
              rows={6}
            />
          </div>
        </div>
      );
      case 12: return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2">
            <Switch id="itinerary-visible-preview" checked={itineraryVisible} onCheckedChange={setItineraryVisible} />
            <Label htmlFor="itinerary-visible-preview" className="text-sm">Mostrar itinerario en el PDF</Label>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2 sm:p-4">
            {previewTemplate ? (
              <PDFPreview quote={previewQuote} template={previewTemplate} />
            ) : (
              <div className="text-center text-muted-foreground"><p>No hay plantilla seleccionada</p></div>
            )}
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] gap-6">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Steps Navigation - desktop tabs */}
        <div data-tour="step-tabs" className="mb-4 hidden md:flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-all ${
                  index === currentStep ? 'bg-primary text-primary-foreground shadow-md'
                    : index < currentStep ? 'bg-gold/20 text-gold-dark'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Steps Navigation - mobile compact */}
        <div className="mb-4 md:hidden flex items-center gap-2 rounded-lg border bg-muted/30 px-2 py-2">
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={goPrev} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <select
            value={currentStep}
            onChange={(e) => setCurrentStep(Number(e.target.value))}
            className="flex-1 bg-transparent text-sm font-medium outline-none"
          >
            {steps.map((s, i) => (
              <option key={s.id} value={i}>{i + 1}. {s.label}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground shrink-0">{currentStep + 1}/{steps.length}</span>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={goNext} disabled={currentStep === steps.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Step Content */}
        <Card className="mb-6 flex flex-1 flex-col overflow-hidden">
          <CardHeader className="shrink-0 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
              {(() => { const Icon = steps[currentStep].icon; return <Icon className="h-5 w-5 text-gold" />; })()}
              {steps[currentStep].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation - sticky on mobile */}
        <div className="sticky bottom-0 -mx-3 sm:mx-0 flex items-center justify-between gap-2 border-t bg-background/95 backdrop-blur px-3 py-3 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:py-0">
          <Button variant="outline" size="sm" onClick={currentStep === 0 ? onCancel : goPrev}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">{currentStep === 0 ? 'Cancelar' : 'Anterior'}</span>
            <span className="sm:hidden">{currentStep === 0 ? 'Salir' : 'Atrás'}</span>
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            {saveStatus === 'saving' && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Guardando...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" /> Guardado
              </span>
            )}
            {saveStatus !== 'idle' && (
              <span className="sm:hidden">
                {saveStatus === 'saving' ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Check className="h-4 w-4 text-emerald-600" />}
              </span>
            )}
            <Button variant="outline" onClick={() => setShowPreviewPanel(!showPreviewPanel)} className="hidden lg:flex">
              <Eye className="mr-2 h-4 w-4" />
              {showPreviewPanel ? 'Ocultar' : 'Vista previa'}
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button data-tour="save-button" size="sm" onClick={handleSave} className="bg-gold text-gold-foreground hover:bg-gold/90">
                Guardar
              </Button>
            ) : (
              <Button size="sm" onClick={goNext}>Siguiente<ChevronRight className="ml-1 h-4 w-4" /></Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreviewPanel && previewTemplate && (
        <div className="hidden w-[400px] shrink-0 lg:block">
          <div className="sticky top-4 rounded-lg border bg-card p-4">
            <h3 className="mb-4 font-semibold">Vista previa</h3>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <PDFPreview quote={previewQuote} template={previewTemplate} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
