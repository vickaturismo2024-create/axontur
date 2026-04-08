import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Quote, Template } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { validateQuote, validateTemplate, logError, getSafeErrorMessage } from '@/lib/validations';
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
  agencyName: row.agency_name || '',
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
  agency_name: template.agencyName || '',
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
  lodgings: row.lodgings || [],
  transfers: row.transfers || [],
  trains: row.trains || [],
  ferries: row.ferries || [],
  rentalCars: row.rental_cars || [],
  activities: row.activities || [],
  cruise: row.cruise || undefined,
  insurance: row.insurance || {},
  pricing: row.pricing || {},
  itineraryDays: row.itinerary_days || [],
  status: row.status || 'draft',
  internalNotes: row.pricing?.internalNotes || '',
  publicLinkExpiry: row.pricing?.publicLinkExpiry || undefined,
  archived: row.archived || false,
  favorited: row.favorited || false,
  approvedAt: row.approved_at || undefined,
  approvedByName: row.approved_by_name || undefined,
  approvedIp: row.approved_ip || undefined,
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
  lodgings: quote.lodgings || [],
  transfers: quote.transfers,
  trains: quote.trains || [],
  ferries: quote.ferries || [],
  rental_cars: quote.rentalCars || [],
  activities: quote.activities || [],
  cruise: quote.cruise || null,
  insurance: quote.insurance,
  pricing: { ...quote.pricing, internalNotes: quote.internalNotes || '', publicLinkExpiry: quote.publicLinkExpiry || null },
  itinerary_days: quote.itineraryDays,
  status: quote.status || 'draft',
  archived: quote.archived || false,
  favorited: quote.favorited || false,
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
  
  // Track if data has been loaded to prevent unnecessary refetches
  const hasLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
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

      // Fetch view counts
      const quoteIds = (quotesData || []).map((q: any) => q.id);
      let viewCounts: Record<string, number> = {};
      if (quoteIds.length > 0) {
        const { data: viewsData } = await supabase
          .from('quote_views' as any)
          .select('quote_id')
          .in('quote_id', quoteIds);
        if (viewsData) {
          (viewsData as any[]).forEach((v: any) => {
            viewCounts[v.quote_id] = (viewCounts[v.quote_id] || 0) + 1;
          });
        }
      }

      setQuotes((quotesData || []).map((row: any) => ({
        ...dbToQuote(row),
        viewCount: viewCounts[row.id] || 0,
      })));
      hasLoadedRef.current = true;
    } catch (error) {
      logError('fetchData', error);
      toast.error('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch data only when user changes (not on every re-render)
  useEffect(() => {
    if (user) {
      // Only fetch if user changed or data hasn't been loaded yet
      if (lastUserIdRef.current !== user.id || !hasLoadedRef.current) {
        lastUserIdRef.current = user.id;
        fetchData();
      }
    } else {
      // User logged out
      setQuotes([]);
      setTemplates([]);
      setIsLoading(false);
      hasLoadedRef.current = false;
      lastUserIdRef.current = null;
    }
  }, [user, fetchData]);

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const addQuote = async (quote: Quote) => {
    if (!user) {
      toast.error('Debés iniciar sesión para crear presupuestos');
      return;
    }

    try {
      // Validate input before database operation
      const validatedQuote = validateQuote(quote);
      const dbQuote = quoteToDb(validatedQuote as Quote, user.id);
      const { error } = await supabase
        .from('quotes')
        .insert([dbQuote] as any);

      if (error) throw error;

      setQuotes((prev) => [validatedQuote as Quote, ...prev]);
      toast.success('Presupuesto creado');
    } catch (error) {
      logError('addQuote', error);
      toast.error(getSafeErrorMessage(error));
      throw error;
    }
  };

  const updateQuote = async (quote: Quote) => {
    if (!user) {
      toast.error('Debés iniciar sesión para actualizar presupuestos');
      return;
    }

    try {
      // Validate input before database operation
      const validatedQuote = validateQuote(quote);
      const dbQuote = quoteToDb(validatedQuote as Quote, user.id);
      const { error } = await supabase
        .from('quotes')
        .update(dbQuote as any)
        .eq('id', quote.id);

      if (error) throw error;

      setQuotes((prev) => prev.map((q) => (q.id === quote.id ? validatedQuote as Quote : q)));
      toast.success('Presupuesto actualizado');
    } catch (error) {
      logError('updateQuote', error);
      toast.error(getSafeErrorMessage(error));
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
      logError('deleteQuote', error);
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
      // Validate input before database operation
      const validatedTemplate = validateTemplate(template);
      const dbTemplate = templateToDb(validatedTemplate as Template, user.id, false);
      const { error } = await supabase
        .from('templates')
        .insert([dbTemplate] as any);

      if (error) throw error;

      setTemplates((prev) => [...prev, validatedTemplate as Template]);
      toast.success('Plantilla creada');
    } catch (error) {
      logError('addTemplate', error);
      toast.error(getSafeErrorMessage(error));
      throw error;
    }
  };

  const updateTemplate = async (template: Template) => {
    if (!user) {
      toast.error('Debés iniciar sesión para actualizar plantillas');
      return;
    }

    try {
      // Validate input before database operation
      const validatedTemplate = validateTemplate(template);
      const isDefault = defaultTemplateId === template.id;
      const dbTemplate = templateToDb(validatedTemplate as Template, user.id, isDefault);
      const { error } = await supabase
        .from('templates')
        .update(dbTemplate as any)
        .eq('id', template.id);

      if (error) throw error;

      setTemplates((prev) => prev.map((t) => (t.id === template.id ? validatedTemplate as Template : t)));
      toast.success('Plantilla actualizada');
    } catch (error) {
      logError('updateTemplate', error);
      toast.error(getSafeErrorMessage(error));
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
      logError('deleteTemplate', error);
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
      logError('setDefaultTemplate', error);
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

export function useQuotesSafe() {
  return useContext(QuotesContext);
}
