import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { QuoteWizard } from '@/components/quotes/QuoteWizard';
import { useQuotes } from '@/contexts/QuotesContext';

const QuoteEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { quotes, templates, addQuote, updateQuote } = useQuotes();

  const existingQuote = id !== 'new' ? quotes.find(q => q.id === id) : undefined;

  const handleSave = (quote: typeof quotes[0]) => {
    if (existingQuote) {
      updateQuote(quote);
    } else {
      addQuote(quote);
    }
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
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

        <QuoteWizard
          initialQuote={existingQuote}
          templates={templates}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </main>
    </div>
  );
};

export default QuoteEditor;
