import { useState, useMemo, useEffect, useCallback } from 'react';
import { RemindersPanel } from '@/components/reminders/RemindersPanel';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { QuoteCard } from '@/components/quotes/QuoteCard';
import { QuoteComparator } from '@/components/quotes/QuoteComparator';
import { DuplicateForClientDialog } from '@/components/quotes/DuplicateForClientDialog';
import { useQuotes } from '@/contexts/QuotesContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Quote, QuoteStatus } from '@/types/quote';
import { createFileFromQuote } from '@/lib/fileFromQuote';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, Search, Plane, FileText, Users, Link, DollarSign, TrendingUp, CalendarDays, CheckCircle, ShieldAlert, GitCompare
} from 'lucide-react';
import { getDocStatus } from '@/components/clients/DocumentAlertBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDFPreview } from '@/components/pdf/PDFPreview';
import { ImportURLDialog } from '@/components/quotes/ImportURLDialog';
import { DashboardFilters, DashboardFilterValues, defaultFilters } from '@/components/dashboard/DashboardFilters';

import { defaultTemplate } from '@/data/demoData';

interface QuoteTag {
  id: string;
  name: string;
  color: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { quotes, templates, duplicateQuote, deleteQuote, updateQuote, isLoading, getDefaultTemplate } = useQuotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<'active' | 'archived' | 'favorites'>('active');
  const [filters, setFilters] = useState<DashboardFilterValues>(defaultFilters);
  const [docAlertCount, setDocAlertCount] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showComparator, setShowComparator] = useState(false);
  const [duplicateForClientId, setDuplicateForClientId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<QuoteTag[]>([]);
  const [tagAssignments, setTagAssignments] = useState<Record<string, QuoteTag[]>>({});
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    if (!user) return;
    const { data: tags } = await supabase.from('quote_tags' as any).select('*').order('name');
    const fetchedTags = (tags || []) as any as QuoteTag[];
    setAllTags(fetchedTags);

    const { data: assignments } = await supabase.from('quote_tag_assignments' as any).select('quote_id, tag_id');
    const map: Record<string, QuoteTag[]> = {};
    ((assignments || []) as any[]).forEach((a: any) => {
      const tag = fetchedTags.find(t => t.id === a.tag_id);
      if (tag) {
        if (!map[a.quote_id]) map[a.quote_id] = [];
        map[a.quote_id].push(tag);
      }
    });
    setTagAssignments(map);
  }, [user]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const fetchDocAlerts = useCallback(async () => {
    if (!user) return;
    let count = 0;
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await supabase.from('clients').select('dni_expiry,passport_expiry').range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      data.forEach((c: any) => {
        const d = getDocStatus(c.dni_expiry);
        const p = getDocStatus(c.passport_expiry);
        if (d === 'expired' || d === 'expiring' || p === 'expired' || p === 'expiring') count++;
      });
      if (data.length < PAGE) break;
      from += PAGE;
    }
    setDocAlertCount(count);
  }, [user]);

  useEffect(() => { fetchDocAlerts(); }, [fetchDocAlerts]);

  // Metrics (exclude archived)
  const activeQuotes = useMemo(() => quotes.filter(q => !q.archived), [quotes]);

  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = activeQuotes.filter(q => {
      const d = new Date(q.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const marginByCurrency: Record<string, number> = {};
    activeQuotes
      .filter(q => q.status === 'approved' && (q.pricing.totalCost || 0) > 0 && (q.pricing.totalPrice || 0) > 0)
      .forEach(q => {
        const currency = (q.trip as any).currency || 'USD';
        const margin = (q.pricing.totalPrice || 0) - (q.pricing.totalCost || 0);
        marginByCurrency[currency] = (marginByCurrency[currency] || 0) + margin;
      });
    const quotesWithMargin = activeQuotes.filter(q => (q.pricing.totalCost || 0) > 0 && (q.pricing.totalPrice || 0) > 0);
    const avgMargin = quotesWithMargin.length > 0
      ? quotesWithMargin.reduce((sum, q) => {
          const cost = q.pricing.totalCost || 0;
          const price = q.pricing.totalPrice || 0;
          return sum + ((price - cost) / cost) * 100;
        }, 0) / quotesWithMargin.length
      : 0;
    const approved = activeQuotes.filter(q => q.status === 'approved').length;
    const approvalRate = activeQuotes.length > 0 ? (approved / activeQuotes.length) * 100 : 0;
    return { total: activeQuotes.length, marginByCurrency, avgMargin, thisMonth: thisMonth.length, approvalRate };
  }, [activeQuotes]);

  const filteredQuotes = useMemo(() => {
    let result = quotes;

    // View filter (active/archived/favorites)
    if (viewFilter === 'archived') {
      result = result.filter(q => q.archived);
    } else if (viewFilter === 'favorites') {
      result = result.filter(q => q.favorited && !q.archived);
    } else {
      result = result.filter(q => !q.archived);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(q => (q.status || 'draft') === statusFilter);
    }

    // Search
    const query = searchQuery.toLowerCase();
    if (query) {
      result = result.filter(q =>
        q.client.name.toLowerCase().includes(query) || q.trip.destination.toLowerCase().includes(query)
      );
    }

    // Advanced filters
    if (filters.dateFrom) {
      result = result.filter(q => q.createdAt >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter(q => q.createdAt <= filters.dateTo + 'T23:59:59');
    }
    if (filters.destination) {
      const dest = filters.destination.toLowerCase();
      result = result.filter(q => q.trip.destination.toLowerCase().includes(dest));
    }
    if (filters.currency !== 'all') {
      result = result.filter(q => (q.trip as any).currency === filters.currency);
    }
    if (filters.priceMin) {
      result = result.filter(q => (q.pricing.totalPrice || 0) >= Number(filters.priceMin));
    }
    if (filters.priceMax) {
      result = result.filter(q => (q.pricing.totalPrice || 0) <= Number(filters.priceMax));
    }
    if (filters.clientName) {
      const cn = filters.clientName.toLowerCase();
      result = result.filter(q => q.client.name.toLowerCase().includes(cn));
    }

    // Tag filter
    if (tagFilter) {
      result = result.filter(q => tagAssignments[q.id]?.some(t => t.id === tagFilter));
    }

    // Sort
    result = [...result].sort((a, b) => {
      const dir = filters.sortOrder === 'asc' ? 1 : -1;
      switch (filters.sortBy) {
        case 'price': return ((a.pricing.totalPrice || 0) - (b.pricing.totalPrice || 0)) * dir;
        case 'client': return a.client.name.localeCompare(b.client.name) * dir;
        case 'destination': return a.trip.destination.localeCompare(b.trip.destination) * dir;
        default: return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });

    return result;
  }, [quotes, searchQuery, statusFilter, viewFilter, filters, tagFilter, tagAssignments]);

  const handleEdit = (quote: Quote) => navigate(`/quote/${quote.id}`);
  const handleDuplicate = async (id: string) => {
    try { const nq = await duplicateQuote(id); navigate(`/quote/${nq.id}`); } catch (e) { console.error(e); }
  };
  const handleDelete = (id: string) => setDeleteTargetId(id);
  const confirmDelete = async () => {
    if (deleteTargetId) {
      try { await deleteQuote(deleteTargetId); } catch (e) { console.error(e); }
      setDeleteTargetId(null);
    }
  };
  const handleStatusChange = async (id: string, status: QuoteStatus) => {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
      try {
        await updateQuote({ ...quote, status });
        // Auto-create file when approving
        if (status === 'approved' && user) {
          const result = await createFileFromQuote(quote, user.id);
          if (result) {
            toast.success(`Expediente FILE-${String(result.fileNumber).padStart(3, '0')} creado`, {
              action: { label: 'Ver expediente', onClick: () => navigate(`/files/${result.fileId}`) },
            });
          }
        }
      } catch (e) { console.error(e); }
    }
  };
  const handleToggleArchive = async (quote: Quote) => {
    try { await updateQuote({ ...quote, archived: !quote.archived }); } catch (e) { console.error(e); }
  };
  const handleToggleFavorite = async (quote: Quote) => {
    try { await updateQuote({ ...quote, favorited: !quote.favorited }); } catch (e) { console.error(e); }
  };
  const handlePreview = (quote: Quote) => setPreviewQuote(quote);
  const handleExport = (quote: Quote) => navigate(`/export/${quote.id}`);
  const handleDuplicateForClient = (id: string) => setDuplicateForClientId(id);
  const handleConfirmDuplicateForClient = async (client: { name: string; email: string; phone: string }) => {
    if (!duplicateForClientId) return;
    try {
      const nq = await duplicateQuote(duplicateForClientId);
      await updateQuote({ ...nq, client });
      navigate(`/quote/${nq.id}`);
    } catch (e) { console.error(e); }
  };
  const getTemplate = (templateId: string) => templates.find(t => t.id === templateId) || getDefaultTemplate() || defaultTemplate;

  const handleToggleCompare = (id: string) => {
    setSelectedForCompare(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const compareQuotes = useMemo(() => {
    if (selectedForCompare.length !== 2) return null;
    const q1 = quotes.find(q => q.id === selectedForCompare[0]);
    const q2 = quotes.find(q => q.id === selectedForCompare[1]);
    if (!q1 || !q2) return null;
    return [q1, q2] as [Quote, Quote];
  }, [selectedForCompare, quotes]);

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-primary via-navy-light to-primary p-8 text-primary-foreground shadow-xl">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h1 className="font-serif text-3xl font-bold md:text-4xl">Generador de Presupuestos</h1>
              <p className="mt-2 text-primary-foreground/80">Crea presupuestos de viaje profesionales en minutos</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setImportDialogOpen(true)} variant="outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-white/10">
                <Link className="mr-2 h-5 w-5" />Importar desde URL
              </Button>
              <Button onClick={() => navigate('/quote/new')} className="bg-gold text-navy hover:bg-gold/90 shadow-gold" size="lg">
                <Plus className="mr-2 h-5 w-5" />Nuevo Presupuesto
              </Button>
            </div>
          </div>

          {/* Metrics */}
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-6">
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gold" />
                <span className="text-2xl font-bold">{metrics.total}</span>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/70">Presupuestos</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gold" />
                <div className="flex flex-col">
                  {Object.entries(metrics.marginByCurrency).length > 0 ? (
                    Object.entries(metrics.marginByCurrency).map(([currency, value]) => (
                      <span key={currency} className="text-lg font-bold leading-tight">
                        {currency} ${value.toLocaleString()}
                      </span>
                    ))
                  ) : (
                    <span className="text-lg font-bold">-</span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/70">Ganancia aprobados</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-gold" />
                <span className="text-2xl font-bold">{metrics.avgMargin.toFixed(1)}%</span>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/70">Margen prom.</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-gold" />
                <span className="text-2xl font-bold">{metrics.thisMonth}</span>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/70">Este mes</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-gold" />
                <span className="text-2xl font-bold">{metrics.approvalRate.toFixed(0)}%</span>
              </div>
              <p className="mt-1 text-sm text-primary-foreground/70">Aprobados</p>
            </div>
            {docAlertCount > 0 && (
              <button
                onClick={() => navigate('/clients?docs=1')}
                className="rounded-lg bg-white/10 p-4 backdrop-blur-sm text-left hover:bg-white/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-yellow-400" />
                  <span className="text-2xl font-bold">{docAlertCount}</span>
                </div>
                <p className="mt-1 text-sm text-primary-foreground/70">Docs por vencer</p>
              </button>
            )}
          </div>
        </div>

        {/* Reminders */}
        <div className="mb-8">
          <RemindersPanel />
        </div>

        {/* View Tabs (Active/Archived/Favorites) + Status Tabs + Search + Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4 flex-wrap">
              <Tabs value={viewFilter} onValueChange={(v) => setViewFilter(v as any)}>
                <TabsList>
                  <TabsTrigger value="active">Activos</TabsTrigger>
                  <TabsTrigger value="favorites">⭐ Favoritos</TabsTrigger>
                  <TabsTrigger value="archived">📦 Archivados</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="draft">Borrador</TabsTrigger>
                  <TabsTrigger value="sent">Enviados</TabsTrigger>
                  <TabsTrigger value="approved">Aprobados</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
                  <TabsTrigger value="expired">Vencidos</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex gap-2 items-center">
              {compareMode ? (
                <>
                  <span className="text-sm text-muted-foreground">{selectedForCompare.length}/2 seleccionados</span>
                  {compareQuotes && (
                    <Button size="sm" onClick={() => setShowComparator(true)}>
                      <GitCompare className="mr-1.5 h-4 w-4" />Ver comparación
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setCompareMode(false); setSelectedForCompare([]); }}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setCompareMode(true)}>
                  <GitCompare className="mr-1.5 h-4 w-4" />Comparar
                </Button>
              )}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por cliente o destino..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>
          <DashboardFilters filters={filters} onChange={setFilters} />
          {allTags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-xs text-muted-foreground">Etiquetas:</span>
              <button
                onClick={() => setTagFilter(null)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${!tagFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >Todas</button>
              {allTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                  className={`text-xs px-2 py-0.5 rounded-full text-white transition-opacity ${tagFilter === tag.id ? 'opacity-100 ring-2 ring-offset-1 ring-foreground/20' : 'opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: tag.color }}
                >{tag.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* Quotes Grid */}
        {filteredQuotes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuotes.map((quote) => (
              <QuoteCard key={quote.id} quote={quote} onEdit={handleEdit} onDuplicate={handleDuplicate}
                onDelete={handleDelete} onPreview={handlePreview} onExport={handleExport} onStatusChange={handleStatusChange}
                onToggleArchive={handleToggleArchive} onToggleFavorite={handleToggleFavorite}
                onDuplicateForClient={handleDuplicateForClient}
                compareMode={compareMode} isSelectedForCompare={selectedForCompare.includes(quote.id)}
                onToggleCompare={handleToggleCompare}
                assignedTags={tagAssignments[quote.id] || []}
                allTags={allTags}
                onTagsChanged={fetchTags} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-6"><Plane className="h-12 w-12 text-muted-foreground" /></div>
            <h3 className="font-serif text-xl font-semibold">No hay presupuestos</h3>
            <p className="mt-2 text-muted-foreground">
              {searchQuery ? 'No se encontraron resultados para tu búsqueda' : viewFilter === 'archived' ? 'No hay presupuestos archivados' : viewFilter === 'favorites' ? 'No hay favoritos' : 'Crea tu primer presupuesto de viaje'}
            </p>
            {!searchQuery && viewFilter === 'active' && (
              <Button onClick={() => navigate('/quote/new')} className="mt-4 bg-primary">
                <Plus className="mr-2 h-4 w-4" />Crear Presupuesto
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewQuote} onOpenChange={() => setPreviewQuote(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-serif">Vista Previa - {previewQuote?.trip.destination}</DialogTitle>
          </DialogHeader>
          {previewQuote && <PDFPreview quote={previewQuote} template={getTemplate(previewQuote.templateId)} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar presupuesto</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. ¿Estás seguro de que querés eliminar este presupuesto?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import URL Dialog */}
      <ImportURLDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}
        onImport={(data) => navigate('/quote/new', { state: { importedData: data } })} />

      {/* Quote Comparator */}
      {compareQuotes && (
        <QuoteComparator quotes={compareQuotes} open={showComparator} onOpenChange={(open) => {
          setShowComparator(open);
          if (!open) { setCompareMode(false); setSelectedForCompare([]); }
        }} />
      )}

      {/* Duplicate For Client Dialog */}
      <DuplicateForClientDialog
        open={!!duplicateForClientId}
        onOpenChange={(open) => { if (!open) setDuplicateForClientId(null); }}
        onConfirm={handleConfirmDuplicateForClient}
      />
    </div>
  );
};

export default Dashboard;
