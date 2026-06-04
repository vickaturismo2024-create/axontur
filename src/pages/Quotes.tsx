import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Plus, Search, Plane, Link as LinkIcon, GitCompare, ChevronLeft, ChevronRight, } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PDFPreview } from '@/components/pdf/PDFPreview';
import { ImportURLDialog } from '@/components/quotes/ImportURLDialog';
import { PageLoadingScreen } from '@/components/ui/PageLoadingScreen';
import { DashboardFilters, DashboardFilterValues, defaultFilters } from '@/components/dashboard/DashboardFilters';
import { defaultTemplate } from '@/data/demoData';

interface QuoteTag {
  id: string;
  name: string;
  color: string;
}

const Quotes = () => {
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

  const filteredQuotes = useMemo(() => {
    let result = quotes;
    if (viewFilter === 'archived') result = result.filter(q => q.archived);
    else if (viewFilter === 'favorites') result = result.filter(q => q.favorited && !q.archived);
    else result = result.filter(q => !q.archived);
    if (statusFilter !== 'all') result = result.filter(q => (q.status || 'draft') === statusFilter);
    const query = searchQuery.toLowerCase();
    if (query) {
      result = result.filter(q =>
        q.client.name.toLowerCase().includes(query) ||
        q.trip.destination.toLowerCase().includes(query)
      );
    }
    if (filters.dateFrom) result = result.filter(q => q.createdAt >= filters.dateFrom);
    if (filters.dateTo) result = result.filter(q => q.createdAt <= filters.dateTo + 'T23:59:59');
    if (filters.destination) {
      const dest = filters.destination.toLowerCase();
      result = result.filter(q => q.trip.destination.toLowerCase().includes(dest));
    }
    if (filters.currency !== 'all') result = result.filter(q => (q.trip as any).currency === filters.currency);
    if (filters.priceMin) result = result.filter(q => (q.pricing.totalPrice || 0) >= Number(filters.priceMin));
    if (filters.priceMax) result = result.filter(q => (q.pricing.totalPrice || 0) <= Number(filters.priceMax));
    if (filters.clientName) {
      const cn = filters.clientName.toLowerCase();
      result = result.filter(q => q.client.name.toLowerCase().includes(cn));
    }
    if (tagFilter) result = result.filter(q => tagAssignments[q.id]?.some(t => t.id === tagFilter));
    return [...result].sort((a, b) => {
      const dir = filters.sortOrder === 'asc' ? 1 : -1;
      switch (filters.sortBy) {
        case 'price': return ((a.pricing.totalPrice || 0) - (b.pricing.totalPrice || 0)) * dir;
        case 'client': return a.client.name.localeCompare(b.client.name) * dir;
        case 'destination': return a.trip.destination.localeCompare(b.trip.destination) * dir;
        default: return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });
  }, [quotes, searchQuery, statusFilter, viewFilter, filters, tagFilter, tagAssignments]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, viewFilter, filters, tagFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuotes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedQuotes = useMemo(() => {
    return filteredQuotes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredQuotes, currentPage]);

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
  const getTemplate = (templateId: string) =>
    templates.find(t => t.id === templateId) || getDefaultTemplate() || defaultTemplate;

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
        <main className="container mx-auto px-4 py-16">
        {/* Botón Volver al Dashboard */}
        <Button asChild variant="ghost" className="gap-2 mb-4 hover:bg-muted/50 shrink-0">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
          </Link>
        </Button>

          <PageLoadingScreen message="Cargando presupuestos..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">

        {/* Encabezado */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-sans text-2xl font-bold sm:text-3xl">Presupuestos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filteredQuotes.length} presupuesto{filteredQuotes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm">
              <LinkIcon className="mr-2 h-4 w-4" />Importar URL
            </Button>
            <Button onClick={() => navigate('/quote/new')} size="sm">
              <Plus className="mr-2 h-4 w-4" />Nuevo Presupuesto
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 flex-wrap overflow-x-auto">
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
            <div className="flex gap-2 items-center flex-wrap">
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
              <div className="relative flex-1 min-w-[200px] sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente o destino..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <DashboardFilters filters={filters} onChange={setFilters} />

          {allTags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-xs text-muted-foreground">Etiquetas:</span>
              <button
                onClick={() => setTagFilter(null)}
                className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                  !tagFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >Todas</button>
              {allTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                  className={`text-xs px-2 py-0.5 rounded-full text-white transition-opacity ${
                    tagFilter === tag.id ? 'opacity-100 ring-2 ring-offset-1 ring-foreground/20' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: tag.color }}
                >{tag.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* Grid de presupuestos */}
        {paginatedQuotes.length > 0 ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedQuotes.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onPreview={handlePreview}
                  onExport={handleExport}
                  onStatusChange={handleStatusChange}
                  onToggleArchive={handleToggleArchive}
                  onToggleFavorite={handleToggleFavorite}
                  onDuplicateForClient={handleDuplicateForClient}
                  compareMode={compareMode}
                  isSelectedForCompare={selectedForCompare.includes(quote.id)}
                  onToggleCompare={handleToggleCompare}
                  assignedTags={tagAssignments[quote.id] || []}
                  allTags={allTags}
                  onTagsChanged={fetchTags}
                />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredQuotes.length)} de {filteredQuotes.length}
                </p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-2 sm:px-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Anterior</span>
                  </Button>
                  <span className="text-xs sm:text-sm px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-8 px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline mr-1">Siguiente</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <Plane className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-sans text-xl font-semibold">No hay presupuestos</h3>
            <p className="mt-2 text-muted-foreground">
              {searchQuery
                ? 'No se encontraron resultados'
                : viewFilter === 'archived'
                  ? 'No hay presupuestos archivados'
                  : viewFilter === 'favorites'
                    ? 'No hay favoritos'
                    : 'Creá tu primer presupuesto de viaje'}
            </p>
            {!searchQuery && viewFilter === 'active' && (
              <Button onClick={() => navigate('/quote/new')} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />Crear Presupuesto
              </Button>
            )}
          </div>
        )}
      </main>

      <Dialog open={!!previewQuote} onOpenChange={() => setPreviewQuote(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-sans">Vista Previa — {previewQuote?.trip.destination}</DialogTitle>
          </DialogHeader>
          {previewQuote && <PDFPreview quote={previewQuote} template={getTemplate(previewQuote.templateId)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar presupuesto</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportURLDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={(data) => navigate('/quote/new', { state: { importedData: data } })}
      />

      {compareQuotes && (
        <QuoteComparator
          quotes={compareQuotes}
          open={showComparator}
          onOpenChange={(open) => {
            setShowComparator(open);
            if (!open) { setCompareMode(false); setSelectedForCompare([]); }
          }}
        />
      )}

      <DuplicateForClientDialog
        open={!!duplicateForClientId}
        onOpenChange={(open) => { if (!open) setDuplicateForClientId(null); }}
        onConfirm={handleConfirmDuplicateForClient}
      />
    </div>
  );
};

export default Quotes;
