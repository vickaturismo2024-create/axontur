import { useFileReservations, useDeleteReservation, useResolveFlightChanges } from '@/hooks/useFlightReservations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Plus, Trash2, ArrowRight, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { LinkFileToReservationDialog } from '@/components/reservations/LinkFileToReservationDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  fileId: string;
}

export function FileFlightsTab({ fileId }: Props) {
  const { data: reservations, isLoading } = useFileReservations(fileId);
  const deleteReservation = useDeleteReservation();
  const resolveFlightChanges = useResolveFlightChanges();
  
  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Cargando vuelos...</div>;
  }

  const handleResolveChange = async (reservationId: string) => {
    try {
      await resolveFlightChanges.mutateAsync({ reservationId });
      toast.success('Cambios marcados como notificados y resueltos');
    } catch {
      toast.error('Error al actualizar el estado de los cambios');
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-medium">Vuelos de la Reserva</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/reservations/import?file_id=${fileId}`}>
              <Plus className="h-4 w-4 mr-2" /> Importar PNR
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Botón para vincular un PNR existente */}
      <div className="bg-muted/30 p-3 rounded-lg border border-dashed flex justify-between items-center flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">
          ¿Ya ingresaste el PNR en el panel global?
        </div>
        <LinkFileToReservationDialog fileId={fileId} />
      </div>

      {!reservations?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Plane className="h-8 w-8 mb-4 opacity-50" />
            <p>No hay vuelos vinculados a este expediente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reservations.map(res => {
            const segments = res.flight_segments || [];
            const passengers = res.reservation_passengers || [];

            return (
              <Card key={res.id} className="relative overflow-hidden group border-border/80 hover:shadow-sm transition-shadow">
                <div className="absolute right-0 top-0 h-full w-1 bg-primary/20" />
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs font-semibold">
                          {res.locator || 'SIN PNR'}
                        </Badge>
                        {res.gds && <Badge variant="secondary" className="text-[10px]">{res.gds}</Badge>}
                        {res.has_changes && (
                          <Badge variant="destructive" className="text-[10px] animate-pulse flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Cambio de Vuelo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Modificado {format(new Date(res.updated_at), 'd MMM HH:mm', { locale: es })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" asChild title="Ver reserva completa">
                        <Link to={`/reservations/${res.id}`}>
                          <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" title="Eliminar reserva">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar vuelo?</AlertDialogTitle>
                            <AlertDialogDescription>Se eliminarán los vuelos y pasajeros asociados a esta reserva.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteReservation.mutate(res.id)}
                              className="bg-destructive text-destructive-foreground"
                            >Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Listado resumido de tramos/segmentos */}
                  {segments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {segments.map((seg) => {
                        const depDate = seg.dep_datetime_local ? new Date(seg.dep_datetime_local) : null;
                        return (
                          <div key={seg.id} className="text-xs bg-muted/40 rounded px-2 py-1.5 flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-foreground">
                              {seg.airline_code} {seg.flight_number}
                            </span>
                            <span className="text-muted-foreground font-medium">
                              {seg.origin_iata} → {seg.destination_iata}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {depDate ? format(depDate, 'd MMM HH:mm', { locale: es }) : 'S/D'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Resumen de pasajeros */}
                  {passengers.length > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                      <Users className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <span className="truncate">
                        {passengers.map(p => `${p.last_name}${p.first_name ? ' ' + p.first_name : ''}`).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Alerta de cambio de vuelo y botón para resolver */}
                  {res.has_changes && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-destructive font-medium">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Cambio de horario/itinerario pendiente</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] border-destructive/30 text-destructive hover:bg-destructive/20"
                        onClick={() => handleResolveChange(res.id)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Notificado
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
