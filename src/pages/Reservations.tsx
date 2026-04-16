import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Plus, Search, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import type { ReservationPassenger, FlightSegment, ReservationChange } from '@/types/reservation';

export default function Reservations() {
  const { user } = useAuth();
  const { data: reservations, isLoading } = useReservationsList();
  const deleteReservation = useDeleteReservation();
  const [search, setSearch] = useState('');

  // Fetch passengers and segments for all reservations
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

  const filtered = (reservations || []).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    const pax = passengersByRes.get(r.id) || [];
    const segs = segmentsByRes.get(r.id) || [];
    return (
      r.locator?.toLowerCase().includes(q) ||
      pax.some(p => `${p.last_name} ${p.first_name}`.toLowerCase().includes(q)) ||
      segs.some(s => `${s.airline_code}${s.flight_number} ${s.origin_iata} ${s.destination_iata}`.toLowerCase().includes(q))
    );
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteReservation.mutateAsync(id);
      toast.success('Reserva eliminada');
    } catch {
      toast.error('Error al eliminar la reserva');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reservas de Vuelo</h1>
            <p className="text-muted-foreground">Gestión de PNR, pasajeros y segmentos</p>
          </div>
          <Button asChild>
            <Link to="/reservations/import">
              <Plus className="h-4 w-4 mr-2" />
              Importar Reserva
            </Link>
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por localizador, pasajero o vuelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando reservas...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Plane className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-4">
              {search ? 'No se encontraron reservas' : 'No hay reservas cargadas'}
            </p>
            {!search && (
              <Button asChild>
                <Link to="/reservas/importar">
                  <Plus className="h-4 w-4 mr-2" />
                  Importar tu primera reserva
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
              const firstSeg = segs[0];

              return (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${hasChanges ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                        <Plane className={`h-5 w-5 ${hasChanges ? 'text-destructive' : 'text-primary'}`} />
                      </div>

                      <Link to={`/reservas/${r.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.locator && (
                            <span className="font-mono font-semibold">{r.locator}</span>
                          )}
                          {firstSeg && (
                            <span className="text-muted-foreground">
                              {firstSeg.airline_code} {firstSeg.flight_number} {firstSeg.origin_iata}→{firstSeg.destination_iata}
                            </span>
                          )}
                          {segs.length > 1 && (
                            <Badge variant="secondary" className="text-xs">+{segs.length - 1} vuelo(s)</Badge>
                          )}
                          {hasChanges && (
                            <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />Cambios
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>
                            {pax.length > 0
                              ? pax.map(p => `${p.last_name}/${p.first_name || ''}`).join(', ')
                              : 'Sin pasajeros'}
                          </span>
                          <span>•</span>
                          <span>{format(new Date(r.created_at), "d MMM yyyy", { locale: es })}</span>
                          {r.gds && (
                            <>
                              <span>•</span>
                              <span className="uppercase">{r.gds}</span>
                            </>
                          )}
                        </div>
                      </Link>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
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
