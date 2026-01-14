import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { QuoteWizard } from '@/components/quotes/QuoteWizard';
import { useQuotes } from '@/contexts/QuotesContext';

const QuoteEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { quotes, templates, addQuote, updateQuote, isLoading, getDefaultTemplate } = useQuotes();

  const existingQuote = id !== 'new' ? quotes.find(q => q.id === id) : undefined;

  const handleSave = async (quote: typeof quotes[0]) => {
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
            {existingQuote ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {existingQuote 
              ? `Editando presupuesto para ${existingQuote.client.name}`
              : 'Completa los datos para crear un nuevo presupuesto'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <QuoteWizard
            initialQuote={existingQuote}
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
