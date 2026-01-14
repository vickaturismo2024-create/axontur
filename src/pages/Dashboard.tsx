import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { QuoteCard } from '@/components/quotes/QuoteCard';
import { useQuotes } from '@/contexts/QuotesContext';
import { Quote } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Plane,
  FileText,
  Users
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { PDFPreview } from '@/components/pdf/PDFPreview';
import { defaultTemplate } from '@/data/demoData';

const Dashboard = () => {
  const navigate = useNavigate();
  const { quotes, templates, duplicateQuote, deleteQuote } = useQuotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);

  const filteredQuotes = quotes.filter(quote => {
    const query = searchQuery.toLowerCase();
    return (
      quote.client.name.toLowerCase().includes(query) ||
      quote.trip.destination.toLowerCase().includes(query)
    );
  });

  const handleEdit = (quote: Quote) => {
    navigate(`/quote/${quote.id}`);
  };

  const handleDuplicate = (id: string) => {
    const newQuote = duplicateQuote(id);
    navigate(`/quote/${newQuote.id}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este presupuesto?')) {
      deleteQuote(id);
    }
  };

  const handlePreview = (quote: Quote) => {
    setPreviewQuote(quote);
  };

  const handleExport = (quote: Quote) => {
    // Por ahora, abrir en una nueva ventana para imprimir
    navigate(`/export/${quote.id}`);
  };

  const getTemplate = (templateId: string) => {
    return templates.find(t => t.id === templateId) || defaultTemplate;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-primary via-navy-light to-primary p-8 text-primary-foreground shadow-xl">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h1 className="font-serif text-3xl font-bold md:text-4xl">
                Generador de Presupuestos
              </h1>
              <p className="mt-2 text-primary-foreground/80">
                Crea presupuestos de viaje profesionales en minutos
              </p>
            </div>
            <Button 
              onClick={() => navigate('/quote/new')}
              className="bg-gold text-navy hover:bg-gold/90 shadow-gold"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Nuevo Presupuesto
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gold" />
                <span className="text-2xl font-bold">{quotes.length}</span>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/70">Presupuestos</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gold" />
                <span className="text-2xl font-bold">{new Set(quotes.map(q => q.client.name)).size}</span>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/70">Clientes</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-gold" />
                <span className="text-2xl font-bold">{new Set(quotes.map(q => q.trip.destination)).size}</span>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/70">Destinos</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente o destino..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quotes Grid */}
        {filteredQuotes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onPreview={handlePreview}
                onExport={handleExport}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <Plane className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-serif text-xl font-semibold">No hay presupuestos</h3>
            <p className="mt-2 text-muted-foreground">
              {searchQuery 
                ? 'No se encontraron resultados para tu búsqueda'
                : 'Crea tu primer presupuesto de viaje'}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => navigate('/quote/new')}
                className="mt-4 bg-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Presupuesto
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewQuote} onOpenChange={() => setPreviewQuote(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-serif">
              Vista Previa - {previewQuote?.trip.destination}
            </DialogTitle>
          </DialogHeader>
          {previewQuote && (
            <PDFPreview 
              quote={previewQuote} 
              template={getTemplate(previewQuote.templateId)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
