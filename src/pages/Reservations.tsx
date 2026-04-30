import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Plus, Search, Trash2, AlertTriangle, Download, FileText } from 'lucide-react';
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

  const reservationIds = reservations?.map(r => r.id) || [];
  const { data: allPassengers } = useQuery({
    queryKey: ['all-reservation-passengers', reservationIds],
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
    queryKey: ['all-flight-segments', reservationIds],
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
    queryKey: ['all-reservation-changes', reservationIds],
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
    queryKey: ['reservation-linked-files', fileIds],
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
        const ta = earliestDepByRes.get(a.id);
        const tb = earliestDepByRes.get(b.id);
        // Reservations with dep date come first, sorted ascending
        if (ta !== undefined && tb !== undefined) return ta - tb;
        if (ta !== undefined) return -1;
        if (tb !== undefined) return 1;
        // Fallback to created_at desc
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [reservations, search, airlineFilter, dateFilter, onlyChanges, segmentsByRes, passengersByRes, pendingChangesByRes, earliestDepByRes]);

  const handleDelete = async (id: string) => {
    try {
      await deleteReservation.mutateAsync(id);
      toast.success('Vuelo eliminado');
    } catch {
      toast.error('Error al eliminar el vuelo');
    }
  };

  const handleExportPassengers = () => {
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
    exportPassengersToExcel(rows, 'pasajeros-vuelos.xlsx');
    toast.success(`${rows.length} pasajeros exportados`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Vuelos</h1>
            <p className="text-muted-foreground">Gestión de PNR, pasajeros y segmentos de vuelo</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportPassengers} disabled={!allPassengers?.length}>
              <Download className="h-4 w-4 mr-2" /> Exportar pasajeros
            </Button>
            <Button asChild>
              <Link to="/reservations/import">
                <Plus className="h-4 w-4 mr-2" />
                Importar Vuelo
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por localizador, pasajero o vuelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={airlineFilter} onValueChange={setAirlineFilter}>
            <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Aerolínea" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las aerolíneas</SelectItem>
              {airlineOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-full lg:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fechas</SelectItem>
              <SelectItem value="upcoming">Próximos</SelectItem>
              <SelectItem value="past">Pasados</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={onlyChanges ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOnlyChanges(v => !v)}
            className="lg:w-auto"
          >
            <AlertTriangle className="h-4 w-4 mr-2" /> Con cambios
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Plane className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">
              {search || airlineFilter !== 'all' || dateFilter !== 'all' || onlyChanges
                ? 'No se encontraron vuelos con los filtros aplicados'
                : 'No hay vuelos cargados'}
            </p>
            {!search && airlineFilter === 'all' && dateFilter === 'all' && !onlyChanges && (
              <Button asChild>
                <Link to="/reservations/import">
                  <Plus className="h-4 w-4 mr-2" />
                  Importar tu primer vuelo
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const pax = passengersByRes.get(r.id) || [];
              const segs = segmentsByRes.get(r.id) || [];
              const hasChanges = segs.some(s => s.has_changes);
              const pendingCount = pendingChangesByRes.get(r.id) || 0;
              const firstSeg = segs[0];
              const firstDep = earliestDepByRes.get(r.id);
              const linkedFile = r.file_id ? fileById.get(r.file_id) : null;

              return (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${hasChanges || pendingCount > 0 ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                        <Plane className={`h-5 w-5 ${hasChanges || pendingCount > 0 ? 'text-destructive' : 'text-primary'}`} />
                      </div>

                      <Link to={`/reservations/${r.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {r.locator && (
                            <span className="font-mono font-semibold text-sm sm:text-base">{r.locator}</span>
                          )}
                          {firstSeg && (
                            <span className="text-muted-foreground text-xs sm:text-sm">
                              {firstSeg.airline_code} {firstSeg.flight_number} {firstSeg.origin_iata}→{firstSeg.destination_iata}
                            </span>
                          )}
                          {segs.length > 1 && (
                            <Badge variant="secondary" className="text-xs">+{segs.length - 1} vuelo(s)</Badge>
                          )}
                          {pendingCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />{pendingCount} cambio(s)
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mt-1 flex-wrap">
                          <span className="truncate max-w-full">
                            {pax.length > 0
                              ? pax.map(p => `${p.last_name}/${p.first_name || ''}`).join(', ')
                              : 'Sin pasajeros'}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="whitespace-nowrap">
                            {firstDep
                              ? `Sale ${format(new Date(firstDep), "d MMM yyyy", { locale: es })}`
                              : format(new Date(r.created_at), "d MMM yyyy", { locale: es })}
                          </span>
                          {r.gds && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="uppercase">{r.gds}</span>
                            </>
                          )}
                        </div>
                      </Link>

                      {linkedFile && (
                        <Link
                          to={`/files/${linkedFile.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-xs font-mono shrink-0"
                          title="Ver expediente vinculado"
                        >
                          <FileText className="h-3 w-3" />
                          FILE-{String(linkedFile.file_number).padStart(3, '0')}
                        </Link>
                      )}

                      <AdminOnly>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar vuelo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminarán todos los vuelos, pasajeros y datos asociados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(r.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </AdminOnly>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
