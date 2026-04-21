import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
    queryKey: ['files', user?.id],
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Expedientes</h1>
            <p className="text-muted-foreground">Gestión de reservas operativas</p>
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)} className="w-full sm:w-auto">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
        </div>

        <ImportFilesExcelDialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) refetch(); }} />

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por cliente, destino o número..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-48">
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

        {isLoading ? (
          <div className="grid gap-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="mb-4 h-16 w-16 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No hay expedientes</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Los expedientes se crean automáticamente desde presupuestos aprobados
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {paginated.map(file => {
                const st = STATUS_MAP[file.status] || STATUS_MAP.confirmed;
                return (
                  <Card key={file.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/files/${file.id}`)}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FolderOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-primary">
                            FILE-{String(file.file_number).padStart(3, '0')}
                          </span>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                        <p className="mt-1 truncate font-medium">{file.client_name || 'Sin cliente'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {file.destination && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{file.destination}</span>
                          )}
                          {file.start_date && (
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(file.start_date).toLocaleDateString('es-AR')}</span>
                          )}
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{file.travelers} pax</span>
                        </div>
                      </div>
                      <div className="hidden flex-shrink-0 text-right sm:block">
                        <p className="text-lg font-bold">{file.currency} {file.total_price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground">Costo: {file.currency} {file.total_cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <span className="text-sm">{currentPage + 1} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}>
                    Siguiente <ChevronRight className="h-4 w-4" />
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
