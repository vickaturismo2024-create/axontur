import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, Search, Calendar, MapPin, Users, ArrowRight, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImportFilesExcelDialog } from '@/components/files/ImportFilesExcelDialog';

interface FileRecord {
  id: string;
  file_number: number;
  status: string;
  client_name: string;
  client_id: string | null;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  travelers: number;
  currency: string;
  total_price: number;
  total_cost: number;
  internal_notes: string;
  quote_id: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  confirmed: { label: 'Confirmado', variant: 'default' },
  in_progress: { label: 'En curso', variant: 'secondary' },
  completed: { label: 'Completado', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

const PAGE_SIZE = 50;

const Files = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(0);

  const { data: files, isLoading, refetch } = useQuery<FileRecord[]>({
    queryKey: queryKeys.files.all(user?.id),
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from('files')
          .select('*')
          .order('file_number', { ascending: false })
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all as FileRecord[];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    return (files || []).filter(f => {
      const matchesSearch = !search ||
        f.client_name.toLowerCase().includes(search.toLowerCase()) ||
        f.destination.toLowerCase().includes(search.toLowerCase()) ||
        `FILE-${String(f.file_number).padStart(3, '0')}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [files, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">

        {/* Encabezado */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
              Expedientes
            </h1>
            <p className="text-sm text-muted-foreground">Gestión de reservas operativas</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="w-full sm:w-auto"
            size="sm"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
        </div>

        <ImportFilesExcelDialog
          open={importOpen}
          onOpenChange={(v) => { setImportOpen(v); if (!v) refetch(); }}
        />

        {/* Filtros */}
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, destino o número..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-10 h-9 sm:h-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full h-9 sm:h-10 sm:w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="in_progress">En curso</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full sm:h-24" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center sm:py-16">
              <FolderOpen className="mb-3 h-12 w-12 text-muted-foreground/50 sm:h-16 sm:w-16" />
              <h3 className="text-base font-semibold sm:text-lg">No hay expedientes</h3>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Los expedientes se crean automáticamente desde presupuestos aprobados
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-2 sm:gap-4">
              {paginated.map(file => {
                const st = STATUS_MAP[file.status] || STATUS_MAP.confirmed;
                return (
                  <Card
                    key={file.id}
                    className="cursor-pointer transition-shadow hover:shadow-md active:scale-[0.99]"
                    onClick={() => navigate(`/files/${file.id}`)}
                  >
                    <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                      {/* Ícono — se oculta en mobile para ganar espacio */}
                      <div className="hidden sm:flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FolderOpen className="h-6 w-6 text-primary" />
                      </div>

                      {/* Contenido principal */}
                      <div className="flex-1 min-w-0">
                        {/* Fila superior: número + badge + precio (mobile) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-primary">
                              FILE-{String(file.file_number).padStart(3, '0')}
                            </span>
                            <Badge variant={st.variant} className="text-xs">
                              {st.label}
                            </Badge>
                          </div>
                          {/* Precio visible solo en mobile, a la derecha del badge */}
                          <p className="sm:hidden text-sm font-bold whitespace-nowrap">
                            {file.currency} {file.total_price.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                          </p>
                        </div>

                        {/* Nombre cliente */}
                        <p className="mt-0.5 truncate text-sm font-medium sm:text-base">
                          {file.client_name || 'Sin cliente'}
                        </p>

                        {/* Metadatos */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {file.destination && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[120px] sm:max-w-none">
                                {file.destination}
                              </span>
                            </span>
                          )}
                          {file.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              {new Date(file.start_date).toLocaleDateString('es-AR')}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            {file.travelers} pax
                          </span>
                        </div>
                      </div>

                      {/* Precio desktop */}
                      <div className="hidden sm:block flex-shrink-0 text-right">
                        <p className="text-lg font-bold">
                          {file.currency} {file.total_price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Costo: {file.currency} {file.total_cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between sm:mt-6">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="h-8 px-2 sm:px-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Anterior</span>
                  </Button>
                  <span className="text-xs sm:text-sm px-1">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="h-8 px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline mr-1">Siguiente</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Files;
