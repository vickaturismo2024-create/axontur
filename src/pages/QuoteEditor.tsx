import { useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { QuoteWizard } from '@/components/quotes/QuoteWizard';
import { useQuotes } from '@/contexts/QuotesContext';
import { Quote, Flight, Lodging, Transfer, Activity } from '@/types/quote';
import { useQuoteVersions } from '@/hooks/useQuoteVersions';

function buildQuoteFromImport(data: any): Partial<Quote> {
  const flights: Flight[] = (data.flights || []).map((f: any) => ({
    id: crypto.randomUUID(),
    origin: f.origin || '',
    destination: f.destination || '',
    date: f.date || '',
    departureTime: f.departureTime || '',
    arrivalTime: f.arrivalTime || '',
    airline: f.airline || '',
    flightNumber: f.flightNumber || '',
    luggage: f.luggage || '',
    notes: f.notes || '',
    cost: f.cost || 0,
    price: 0,
  }));

  const lodgings: Lodging[] = (data.lodgings || []).map((l: any) => ({
    id: crypto.randomUUID(),
    name: l.name || '',
    category: l.category || '',
    address: l.address || '',
    checkIn: l.checkIn || data.startDate || '',
    checkOut: l.checkOut || data.endDate || '',
    regime: l.regime || '',
    roomType: l.roomType || '',
    nights: l.nights || 0,
    notes: l.notes || '',
    costPerNight: l.costPerNight || 0,
    pricePerNight: 0,
    pricingMode: 'perNight' as const,
    destination: l.destination || data.destination || '',
  }));

  const transfers: Transfer[] = (data.transfers || []).map((t: any) => ({
    id: crypto.randomUUID(),
    type: t.type || '',
    description: t.description || '',
    dateTime: t.dateTime || '',
    included: t.included ?? true,
    cost: t.cost || 0,
    price: 0,
  }));

  const activities: Activity[] = (data.activities || []).map((a: any) => ({
    id: crypto.randomUUID(),
    name: a.name || '',
    description: a.description || '',
    date: a.date || '',
    time: a.time || '',
    duration: a.duration || '',
    location: a.location || '',
    included: a.included ?? true,
    cost: a.cost || 0,
    price: 0,
    notes: a.notes || '',
  }));

  return {
    trip: {
      destination: data.destination || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      travelers: data.travelers || 2,
      currency: data.currency || 'USD',
    },
    cover: {
      title: data.coverTitle || `Viaje a ${data.destination || ''}`,
      subtitle: data.coverSubtitle || '',
      imageUrl: '',
    },
    flights,
    lodgings,
    lodging: lodgings[0] || {
      name: '', category: '', address: '', checkIn: '', checkOut: '',
      regime: '', roomType: '', nights: 0, notes: '',
    },
    transfers,
    activities,
    insurance: data.insurance ? {
      company: data.insurance.company || '',
      plan: data.insurance.plan || '',
      coverage: data.insurance.coverage || '',
      notes: data.insurance.notes || '',
      cost: data.insurance.cost || 0,
      price: 0,
    } : { company: '', plan: '', coverage: '', notes: '', cost: 0, price: 0 },
    pricing: {
      totalPrice: data.finalPrice || 0,
      pricePerPerson: data.travelers ? Math.round((data.finalPrice || 0) / data.travelers * 100) / 100 : 0,
      taxes: 0,
      paymentMethod: '',
      conditions: '',
      observations: data.observations || '',
      calculationMode: 'automatic' as const,
      totalCost: data.finalPrice || 0,
    },
  };
}

const QuoteEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { quotes, templates, addQuote, updateQuote, isLoading, getDefaultTemplate } = useQuotes();

  const existingQuote = id !== 'new' ? quotes.find(q => q.id === id) : undefined;
  const importedData = (location.state as any)?.importedData;
  const { saveVersion } = useQuoteVersions(existingQuote?.id);

  const importedQuote = useMemo(() => {
    if (!importedData || existingQuote) return undefined;
    const partial = buildQuoteFromImport(importedData);
    const defaultTpl = getDefaultTemplate();
    return {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateId: defaultTpl?.id || 'default',
      client: { name: '', phone: '', email: '' },
      itineraryDays: [],
      status: 'draft' as const,
      internalNotes: '',
      ...partial,
    } as Quote;
  }, [importedData, existingQuote]);

  const handleSave = async (quote: Quote) => {
    try {
      if (existingQuote) {
        await updateQuote(quote);
      } else {
        await addQuote(quote);
      }
      navigate('/');
    } catch (error) {
      console.error('Error saving quote:', error);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto flex items-center justify-center px-4 py-16">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground">Cargando...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      
      <main className="container mx-auto flex flex-1 flex-col overflow-hidden px-4 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
            {existingQuote ? 'Editar Presupuesto' : importedQuote ? 'Presupuesto Importado' : 'Nuevo Presupuesto'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {existingQuote 
              ? `Editando presupuesto para ${existingQuote.client.name}`
              : importedQuote
                ? `Paquete importado: ${importedQuote.trip.destination}. Revisá los datos y completá lo que falte.`
                : 'Completa los datos para crear un nuevo presupuesto'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <QuoteWizard
            initialQuote={existingQuote || importedQuote}
            templates={templates}
            defaultTemplate={getDefaultTemplate()}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </main>
    </div>
  );
};

export default QuoteEditor;
