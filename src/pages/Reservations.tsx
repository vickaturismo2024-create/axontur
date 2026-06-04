import { useState, useMemo, useEffect } from 'react';
import { AdminOnly } from '@/components/auth/AdminOnly';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plane, Plus, Search, Trash2, AlertTriangle, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Header } from '@/components/layout/Header';
import { useReservationsList, useDeleteReservation } from '@/hooks/useFlightReservations';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { exportPassengersToExcel } from '@/lib/exportPassengersExcel';
import type { ReservationPassenger, FlightSegment, ReservationChange } from '@/types/reservation';

type DateFilter = 'all' | 'upcoming' | 'past';

export default function Reservations() {
  const { user } = useAuth();
  const { data: reservations, isLoading } = useReservationsList();
  const deleteReservation = useDeleteReservation();
  const [search, setSearch] = useState('');
  const [airlineFilter, setAirlineFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  useEffect(() => {
    setPage(1);
  }, [search, airlineFilter, dateFilter, onlyChanges]);

  const reservationIds = reservations?.map(r => r.id) || [];
  const { data: allPassengers } = useQuery({
    queryKey: queryKeys.reservations.allPassengers(reservationIds),
    queryFn: async () => {
      if (!reservationIds.length) return [];
      const { data } = await supabase
        .from('reservation_passengers')
        .select('*')
        .in('reservation_id', reservationIds);
      return (data || []) as unknown as ReservationPassenger[];
    },
    enabled: reservationIds.length > 0,
  });

  const { data: allSegments } = useQuery({
    queryKey: queryKeys.reservations.allSegments(reservationIds),
    queryFn: async () => {
      if (!reservationIds.length) return [];
      const { data } = await supabase
        .from('flight_segments')
        .select('*')
        .in('reservation_id', reservationIds)
        .order('seq');
      return (data || []) as unknown as FlightSegment[];
    },
    enabled: reservationIds.length > 0,
  });

  const { data: allChanges } = useQuery({
    queryKey: queryKeys.reservations.allChanges(reservationIds),
    queryFn: async () => {
      if (!reservationIds.length) return [];
      const { data } = await supabase
        .from('reservation_changes')
        .select('*')
        .in('reservation_id', reservationIds)
        .eq('status', 'pending');
      return (data || []) as unknown as ReservationChange[];
    },
    enabled: reservationIds.length > 0,
  });

  // Fetch linked file numbers
  const fileIds = (reservations || []).map(r => r.file_id).filter(Boolean) as string[];
  const { data: linkedFiles } = useQuery({
    queryKey: queryKeys.reservations.linkedFiles(fileIds),
    queryFn: async () => {
      if (!fileIds.length) return [];
      const { data } = await supabase.from('files').select('id, file_number').in('id', fileIds);
      return (data || []) as { id: string; file_number: number }[];
    },
    enabled: fileIds.length > 0,
  });
  const fileById = new Map((linkedFiles || []).map(f => [f.id, f]));

  const passengersByRes = new Map<string, ReservationPassenger[]>();
  (allPassengers || []).forEach(p => {
    if (!passengersByRes.has(p.reservation_id)) passengersByRes.set(p.reservation_id, []);
    passengersByRes.get(p.reservation_id)!.push(p);
  });

  const segmentsByRes = new Map<string, FlightSegment[]>();
  (allSegments || []).forEach(s => {
    if (!segmentsByRes.has(s.reservation_id)) segmentsByRes.set(s.reservation_id, []);
    segmentsByRes.get(s.reservation_id)!.push(s);
  });

  const pendingChangesByRes = new Map<string, number>();
  (allChanges || []).forEach(c => {
    pendingChangesByRes.set(c.reservation_id, (pendingChangesByRes.get(c.reservation_id) || 0) + 1);
  });

  const airlineOptions = useMemo(() => {
    const set = new Set<string>();
    (allSegments || []).forEach(s => s.airline_code && set.add(s.airline_code.toUpperCase()));
    return Array.from(set).sort();
  }, [allSegments]);

  // Earliest dep date per reservation (for sort & date filter)
  const earliestDepByRes = useMemo(() => {
    const map = new Map<string, number>();
    (allSegments || []).forEach(s => {
      if (!s.dep_datetime_local) return;
      const t = new Date(s.dep_datetime_local).getTime();
      const cur = map.get(s.reservation_id);
      if (cur === undefined || t < cur) map.set(s.reservation_id, t);
    });
    return map;
  }, [allSegments]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return (reservations || [])
      .filter(r => {
        const segs = segmentsByRes.get(r.id) || [];
        const pax = passengersByRes.get(r.id) || [];
        const pendingCount = pendingChangesByRes.get(r.id) || 0;

        // Search
        if (search) {
          const q = search.toLowerCase();
          const matches =
            r.locator?.toLowerCase().includes(q) ||
            pax.some(p => `${p.last_name} ${p.first_name}`.toLowerCase().includes(q)) ||
            segs.some(s => `${s.airline_code}${s.flight_number} ${s.origin_iata} ${s.destination_iata}`.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Airline filter
        if (airlineFilter !== 'all') {
          if (!segs.some(s => s.airline_code?.toUpperCase() === airlineFilter)) return false;
        }

        // Date filter
        if (dateFilter !== 'all') {
          const earliest = earliestDepByRes.get(r.id);
          if (earliest === undefined) return false;
          if (dateFilter === 'upcoming' && earliest < now) return false;
          if (dateFilter === 'past' && earliest >= now) return false;
        }

        // Pending changes filter
        if (onlyChanges && pendingCount === 0) return false;

        return true;
      })
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [reservations, search, airlineFilter, dateFilter, onlyChanges, segmentsByRes, passengersByRes, pendingChangesByRes, earliestDepByRes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleDelete = async (id: string) => {
    try {
      await deleteReservation.mutateAsync(id);
      toast.success('Vuelo eliminado');
    } catch {
      toast.error('Error al eliminar el vuelo');
    }
  };

  const handleExportPassengers = async () => {
    const rows = (allPassengers || []).map(p => ({
      name: `${p.last_name || ''} ${p.first_name || ''}`.trim(),
      dni: p.document || '',
      passport: '',
      passport_expiry: '',
      birth_date: '',
      nationality: '',
      notes: '',
    }));
    if (rows.length === 0) { toast.error('No hay pasajeros para exportar'); return; }
    await exportPassengersToExcel(rows, 'pasajeros-vuelos.xlsx');
    toast.success(`${rows.length} pasajeros exportados`);
  };

  return (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8 max-w-7xl">
        {/* Botón Volver al Dashboard */}
        <Button asChild variant="ghost" className="gap-2 mb-4 hover:bg-muted/50 shrink-0">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
          </Link>
        </Button>

      {/* Encabezado */}
      <div className="mb-4 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-sans text-xl font-bold text-foreground flex items-center gap-2 sm:text-3xl">
              <Plane className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
              Vuelos
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground sm:mt-1">
              Gestión de PNR, pasajeros y segmentos de vuelo
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPassengers} disabled={!allPassengers?.length} className="gap-1.5 flex-1 sm:flex-none">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button asChild size="sm" className="gap-1.5 flex-1 sm:flex-none">
              <Link to="/reservations/import">
                <Plus className="h-4 w-4" /> Nuevo Vuelo
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por localizador, pasajero o vuelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 sm:h-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={airlineFilter} onValueChange={setAirlineFilter}>
            <SelectTrigger className="h-9 sm:h-10 w-[120px] sm:w-[160px]">
              <SelectValue placeholder="Aerolínea" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {airlineOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="h-9 sm:h-10 w-[110px] sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="upcoming">Próximos</SelectItem>
              <SelectItem value="past">Pasados</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={onlyChanges ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOnlyChanges(v => !v)}
            className="h-9 sm:h-10 px-2 sm:px-3"
            title="Solo con cambios"
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center border-dashed sm:p-12">
          <Plane className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-3 sm:h-12 sm:w-12 sm:mb-4" />
          <h3 className="text-base font-medium text-foreground sm:text-lg">
            {search || airlineFilter !== 'all' || dateFilter !== 'all' || onlyChanges
              ? 'No se encontraron vuelos con los filtros aplicados'
              : 'No hay vuelos cargados'}
          </h3>
          {!search && airlineFilter === 'all' && dateFilter === 'all' && !onlyChanges && (
            <Button asChild variant="link" className="mt-2">
              <Link to="/reservations/import">Importar tu primer vuelo</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map(r => {
              const pax = passengersByRes.get(r.id) || [];
              const segs = segmentsByRes.get(r.id) || [];
              const hasChanges = segs.some(s => s.has_changes);
              const pendingCount = pendingChangesByRes.get(r.id) || 0;
              const firstSeg = segs[0];
              const firstDep = earliestDepByRes.get(r.id);
              const linkedFile = r.file_id ? fileById.get(r.file_id) : null;

              return (
                <Card key={r.id} className="overflow-hidden flex flex-col group hover:shadow-md transition-all duration-200 hover:border-primary/30">
                  <div className="flex-1 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        {firstSeg && (
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5 truncate">
                            {firstSeg.airline_code} {firstSeg.flight_number}
                          </p>
                        )}
                        <h3 className="text-lg font-bold font-mono tracking-tight sm:text-xl">
                          {r.locator || 'SIN LOC'}
                        </h3>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {(hasChanges || pendingCount > 0) && (
                          <Badge variant="destructive" className="text-[10px] px-1.5">
                            <AlertTriangle className="h-3 w-3 mr-1" /> {pendingCount || 1}
                          </Badge>
                        )}
                        {linkedFile && (
                          <Badge variant="outline" className="text-[10px] bg-primary/5">
                            FILE-{String(linkedFile.file_number).padStart(3, '0')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {firstSeg && (
                      <div className="flex items-center justify-between mb-4 relative bg-muted/20 p-2 rounded-md border border-border/50">
                        <div className="text-center flex-1">
                          <p className="font-bold text-base">{firstSeg.origin_iata}</p>
                        </div>
                        <div className="flex-1 flex justify-center">
                          <Plane className="h-4 w-4 text-muted-foreground/60 rotate-45" />
                        </div>
                        <div className="text-center flex-1">
                          <p className="font-bold text-base">{firstSeg.destination_iata}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-foreground w-12 shrink-0">Sale:</span>
                        <span>
                          {firstDep ? format(new Date(firstDep), "d MMM yyyy", { locale: es }) : format(new Date(r.created_at), "d MMM yyyy", { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-foreground w-12 shrink-0">Pax:</span>
                        <span className="truncate">
                          {pax.length > 0 ? pax.map(p => `${p.last_name}/${p.first_name || ''}`).join(', ') : 'Sin pasajeros'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center border-t bg-muted/10 p-0">
                    <Link to={`/reservations/${r.id}`} className="flex-1">
                      <Button variant="ghost" className="w-full h-9 rounded-none text-xs sm:h-10 sm:text-sm hover:bg-primary/5 hover:text-primary">
                        Ver detalles
                      </Button>
                    </Link>
                    <AdminOnly>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" className="h-9 sm:h-10 rounded-none border-l text-destructive hover:bg-destructive/10" title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="mx-3 sm:mx-auto">
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar vuelo?</AlertDialogTitle>
                            <AlertDialogDescription>Se eliminarán todos los vuelos y pasajeros.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
                            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(r.id)} className="w-full sm:w-auto bg-destructive text-destructive-foreground">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </AdminOnly>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
              <p className="text-xs text-muted-foreground sm:text-sm">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
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
      )}
    </main>
  </div>
);
}
