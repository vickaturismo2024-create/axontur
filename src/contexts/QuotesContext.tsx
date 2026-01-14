import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Quote, Template } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuotesContextType {
  quotes: Quote[];
  templates: Template[];
  currentQuote: Quote | null;
  currentTemplate: Template | null;
  defaultTemplateId: string | null;
  isLoading: boolean;
  setCurrentQuote: (quote: Quote | null) => void;
  setCurrentTemplate: (template: Template | null) => void;
  addQuote: (quote: Quote) => Promise<void>;
  updateQuote: (quote: Quote) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  duplicateQuote: (id: string) => Promise<Quote>;
  addTemplate: (template: Template) => Promise<void>;
  updateTemplate: (template: Template) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  setDefaultTemplate: (id: string) => Promise<void>;
  getDefaultTemplate: () => Template | null;
  refreshData: () => Promise<void>;
}

const QuotesContext = createContext<QuotesContextType | undefined>(undefined);

// Helper to convert DB row to Template
const dbToTemplate = (row: any): Template => ({
  id: row.id,
  name: row.name,
  logoUrl: row.logo_url || '',
  colors: row.colors || { primary: '#1e3a5f', secondary: '#d4c4a8', accent: '#c9a227' },
  fonts: row.fonts || { heading: 'Playfair Display', body: 'Inter' },
  styles: row.styles || { borderRadius: '12px', cardShadow: true, separatorStyle: 'line', borderStyle: 'none', borderWidth: '1px', backgroundPattern: 'none', cardStyle: 'elevated' },
  whatsappAgents: row.whatsapp_agents || [],
  footerText: row.footer_text || '',
  sectionsToggles: row.sections_toggles || { flights: true, lodging: true, transfers: true, insurance: true, itinerary: true },
});

// Helper to convert Template to DB row
const templateToDb = (template: Template, userId: string, isDefault?: boolean) => ({
  id: template.id,
  name: template.name,
  logo_url: template.logoUrl,
  colors: template.colors,
  fonts: template.fonts,
  styles: template.styles,
  whatsapp_agents: template.whatsappAgents,
  footer_text: template.footerText,
  sections_toggles: template.sectionsToggles,
  is_default: isDefault,
  user_id: userId,
});

// Helper to convert DB row to Quote
const dbToQuote = (row: any): Quote => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  templateId: row.template_id || 'default',
  client: row.client || { name: '', phone: '', email: '' },
  trip: row.trip || { destination: '', startDate: '', endDate: '', travelers: 1, currency: 'USD' },
  cover: row.cover || { title: 'PRESUPUESTO DE VIAJE', subtitle: '', imageUrl: '' },
  flights: row.flights || [],
  lodging: row.lodging || {},
  transfers: row.transfers || [],
  insurance: row.insurance || {},
  pricing: row.pricing || {},
  itineraryDays: row.itinerary_days || [],
});

// Helper to convert Quote to DB row
const quoteToDb = (quote: Quote, userId: string) => ({
  id: quote.id,
  template_id: quote.templateId,
  client: quote.client,
  trip: quote.trip,
  cover: quote.cover,
  flights: quote.flights,
  lodging: quote.lodging,
  transfers: quote.transfers,
  insurance: quote.insurance,
  pricing: quote.pricing,
  itinerary_days: quote.itineraryDays,
  user_id: userId,
});

export function QuotesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data when user changes
  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setQuotes([]);
      setTemplates([]);
      setIsLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (templatesError) throw templatesError;

      const fetchedTemplates = (templatesData || []).map(dbToTemplate);
      setTemplates(fetchedTemplates);

      // Find default template
      const defaultTemplate = templatesData?.find((t: any) => t.is_default);
      if (defaultTemplate) {
        setDefaultTemplateId(defaultTemplate.id);
      }

      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      setQuotes((quotesData || []).map(dbToQuote));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchData();
  };

  const addQuote = async (quote: Quote) => {
    if (!user) {
      toast.error('Debés iniciar sesión para crear presupuestos');
      return;
    }

    try {
      const dbQuote = quoteToDb(quote, user.id);
      const { error } = await supabase
        .from('quotes')
        .insert([dbQuote] as any);

      if (error) throw error;

      setQuotes((prev) => [quote, ...prev]);
      toast.success('Presupuesto creado');
    } catch (error) {
      console.error('Error adding quote:', error);
      toast.error('Error al crear el presupuesto');
      throw error;
    }
  };

  const updateQuote = async (quote: Quote) => {
    if (!user) {
      toast.error('Debés iniciar sesión para actualizar presupuestos');
      return;
    }

    try {
      const dbQuote = quoteToDb(quote, user.id);
      const { error } = await supabase
        .from('quotes')
        .update(dbQuote as any)
        .eq('id', quote.id);

      if (error) throw error;

      setQuotes((prev) => prev.map((q) => (q.id === quote.id ? quote : q)));
      toast.success('Presupuesto actualizado');
    } catch (error) {
      console.error('Error updating quote:', error);
      toast.error('Error al actualizar el presupuesto');
      throw error;
    }
  };

  const deleteQuote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setQuotes((prev) => prev.filter((q) => q.id !== id));
      toast.success('Presupuesto eliminado');
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Error al eliminar el presupuesto');
      throw error;
    }
  };

  const duplicateQuote = async (id: string): Promise<Quote> => {
    const original = quotes.find((q) => q.id === id);
    if (!original) throw new Error('Quote not found');
    
    const newQuote: Quote = {
      ...original,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      client: { ...original.client, name: `${original.client.name} (copia)` },
    };
    
    await addQuote(newQuote);
    return newQuote;
  };

  const addTemplate = async (template: Template) => {
    if (!user) {
      toast.error('Debés iniciar sesión para crear plantillas');
      return;
    }

    try {
      const dbTemplate = templateToDb(template, user.id, false);
      const { error } = await supabase
        .from('templates')
        .insert([dbTemplate] as any);

      if (error) throw error;

      setTemplates((prev) => [...prev, template]);
      toast.success('Plantilla creada');
    } catch (error) {
      console.error('Error adding template:', error);
      toast.error('Error al crear la plantilla');
      throw error;
    }
  };

  const updateTemplate = async (template: Template) => {
    if (!user) {
      toast.error('Debés iniciar sesión para actualizar plantillas');
      return;
    }

    try {
      const isDefault = defaultTemplateId === template.id;
      const dbTemplate = templateToDb(template, user.id, isDefault);
      const { error } = await supabase
        .from('templates')
        .update(dbTemplate as any)
        .eq('id', template.id);

      if (error) throw error;

      setTemplates((prev) => prev.map((t) => (t.id === template.id ? template : t)));
      toast.success('Plantilla actualizada');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Error al actualizar la plantilla');
      throw error;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (defaultTemplateId === id) {
        setDefaultTemplateId(null);
      }
      toast.success('Plantilla eliminada');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar la plantilla');
      throw error;
    }
  };

  const setDefaultTemplate = async (id: string) => {
    try {
      // First, unset all templates as default
      const { error: unsetError } = await supabase
        .from('templates')
        .update({ is_default: false } as any)
        .neq('id', id);

      if (unsetError) throw unsetError;

      // Then set the selected one as default
      const { error: setError } = await supabase
        .from('templates')
        .update({ is_default: true } as any)
        .eq('id', id);

      if (setError) throw setError;

      setDefaultTemplateId(id);
      toast.success('Plantilla predeterminada actualizada');
    } catch (error) {
      console.error('Error setting default template:', error);
      toast.error('Error al establecer plantilla predeterminada');
      throw error;
    }
  };

  const getDefaultTemplate = (): Template | null => {
    if (defaultTemplateId) {
      return templates.find(t => t.id === defaultTemplateId) || templates[0] || null;
    }
    return templates[0] || null;
  };

  return (
    <QuotesContext.Provider
      value={{
        quotes,
        templates,
        currentQuote,
        currentTemplate,
        defaultTemplateId,
        isLoading,
        setCurrentQuote,
        setCurrentTemplate,
        addQuote,
        updateQuote,
        deleteQuote,
        duplicateQuote,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        setDefaultTemplate,
        getDefaultTemplate,
        refreshData,
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
