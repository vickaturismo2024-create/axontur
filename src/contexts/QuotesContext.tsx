import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Quote, Template } from '@/types/quote';
import { demoQuotes, demoTemplates } from '@/data/demoData';

interface QuotesContextType {
  quotes: Quote[];
  templates: Template[];
  currentQuote: Quote | null;
  currentTemplate: Template | null;
  setCurrentQuote: (quote: Quote | null) => void;
  setCurrentTemplate: (template: Template | null) => void;
  addQuote: (quote: Quote) => void;
  updateQuote: (quote: Quote) => void;
  deleteQuote: (id: string) => void;
  duplicateQuote: (id: string) => Quote;
  addTemplate: (template: Template) => void;
  updateTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
}

const QuotesContext = createContext<QuotesContextType | undefined>(undefined);

export function QuotesProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>(demoQuotes);
  const [templates, setTemplates] = useState<Template[]>(demoTemplates);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);

  const addQuote = (quote: Quote) => {
    setQuotes((prev) => [...prev, quote]);
  };

  const updateQuote = (quote: Quote) => {
    setQuotes((prev) => prev.map((q) => (q.id === quote.id ? quote : q)));
  };

  const deleteQuote = (id: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  };

  const duplicateQuote = (id: string): Quote => {
    const original = quotes.find((q) => q.id === id);
    if (!original) throw new Error('Quote not found');
    
    const newQuote: Quote = {
      ...original,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      client: { ...original.client, name: `${original.client.name} (copia)` },
    };
    addQuote(newQuote);
    return newQuote;
  };

  const addTemplate = (template: Template) => {
    setTemplates((prev) => [...prev, template]);
  };

  const updateTemplate = (template: Template) => {
    setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <QuotesContext.Provider
      value={{
        quotes,
        templates,
        currentQuote,
        currentTemplate,
        setCurrentQuote,
        setCurrentTemplate,
        addQuote,
        updateQuote,
        deleteQuote,
        duplicateQuote,
        addTemplate,
        updateTemplate,
        deleteTemplate,
      }}
    >
      {children}
    </QuotesContext.Provider>
  );
}

export function useQuotes() {
  const context = useContext(QuotesContext);
  if (context === undefined) {
    throw new Error('useQuotes must be used within a QuotesProvider');
  }
  return context;
}
