import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plane,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Calendar,
  Pencil,
  Tag,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  useReservationDetails,
  useToggleCheckin,
  useDeleteFlightSegment,
  useDeleteReservation,
  useResolveChange,
} from '@/hooks/useFlightReservations';
import { EditReservationModal } from '@/components/reservations/EditReservationModal';
import { ReimportPNRDialog } from '@/components/reservations/ReimportPNRDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: reservation, isLoading } = useReservationDetails(id);
  const toggleCheckin = useToggleCheckin();
  const deleteFlightSegment = useDeleteFlightSegment();
  const deleteReservation = useDeleteReservation();
  const resolveChange = useResolveChange();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReimportOpen, setIsReimportOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Cargando vuelo...</p>
        </main>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-muted-foreground mb-4">Vuelo no encontrado</p>
          <Button asChild><Link to="/reservations">Volver</Link></Button>
        </main>
      </div>
    );
  }

  const handleCheckin = async (segmentId: string, isCheckedIn: boolean) => {
    try {
      await toggleCheckin.mutateAsync({ segmentId, isCheckedIn });
      toast.success(isCheckedIn ? 'Check-in removido' : '¡Check-in marcado!');
    } catch {
      toast.error('No se pudo actualizar el check-in');
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    try {
      await deleteFlightSegment.mutateAsync(segmentId);
      toast.success('Vuelo eliminado');
    } catch {
      toast.error('No se pudo eliminar el vuelo');
    }
  };

  const handleDeleteReservation = async () => {
    try {
      await deleteReservation.mutateAsync(reservation.id);
      toast.success('Vuelo eliminado');
      navigate('/reservations');
    } catch {
      toast.error('No se pudo eliminar el vuelo');
    }
  };

  const handleResolveChange = async (changeId: string) => {
    try {
      await resolveChange.mutateAsync(changeId);
      toast.success('Cambio marcado como resuelto');
    } catch {
      toast.error('No se pudo resolver el cambio');
    }
  };

  const handleResolveAll = async () => {
    try {
      await Promise.all(pendingChanges.map(c => resolveChange.mutateAsync(c.id)));
      toast.success('Todos los cambios resueltos');
    } catch {
      toast.error('Error al resolver cambios');
    }
  };

  const copyForWhatsApp = () => {
    const paxList = reservation.passengers
      .map(p => `• ${p.last_name}/${p.first_name || ''}${p.title ? ` ${p.title}` : ''}`)
      .join('\n');

    const flightsByLocator = new Map<string, typeof reservation.flight_segments>();
    reservation.flight_segments.forEach(s => {
      const loc = s.airline_locator || 'SIN_LOCALIZADOR';
      if (!flightsByLocator.has(loc)) flightsByLocator.set(loc, []);
      flightsByLocator.get(loc)!.push(s);
    });

    let flightsText = '';
    flightsByLocator.forEach((segs, airlineLocator) => {
      if (airlineLocator !== 'SIN_LOCALIZADOR') {
        flightsText += `\n📌 *Localizador ${segs[0]?.airline_code || ''}: ${airlineLocator}*\n`;
      }
      segs.forEach(s => {
        const dep = s.dep_datetime_local ? format(new Date(s.dep_datetime_local), "d MMM HH:mm", { locale: es }) : 'Sin fecha';
        flightsText += `✈️ ${s.airline_code} ${s.flight_number} | ${s.origin_iata}→${s.destination_iata} | ${dep}\n`;
      });
    });

    const text = `📋 *Reserva${reservation.locator ? ` (PNR: ${reservation.locator})` : ''}*\n\n👥 *Pasajeros:*\n${paxList}\n\n🛫 *Vuelos:*${flightsText}`;
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const exportICS = () => {
    const events = reservation.flight_segments
      .filter(s => s.dep_datetime_local)
      .map(s => {
        const start = new Date(s.dep_datetime_local!);
        const end = s.arr_datetime_local ? new Date(s.arr_datetime_local) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
        const formatICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        return `BEGIN:VEVENT\nUID:${s.id}@axontur.app\nDTSTAMP:${formatICSDate(new Date())}\nDTSTART:${formatICSDate(start)}\nDTEND:${formatICSDate(end)}\nSUMMARY:${s.airline_code} ${s.flight_number} ${s.origin_iata}→${s.destination_iata}\nLOCATION:Aeropuerto ${s.origin_iata}\nBEGIN:VALARM\nTRIGGER:-P1D\nACTION:DISPLAY\nDESCRIPTION:Check-in ${s.airline_code} ${s.flight_number}\nEND:VALARM\nEND:VEVENT`;
      });

    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AxonTur//Reservas//ES\nCALSCALE:GREGORIAN\n${events.join('\n')}\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vuelos-${reservation.locator || reservation.id.slice(0, 8)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Calendario exportado');
  };

  const pendingChanges = reservation.changes.filter(c => c.status === 'pending');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-3 sm:p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Button variant="ghost" size="icon" asChild className="shrink-0">
                <Link to="/reservations"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold truncate">
                    {reservation.locator ? `Vuelo ${reservation.locator}` : 'Vuelo'}
                  </h1>
                  {pendingChanges.length > 0 && (
                    <Badge variant="outline" className="text-destructive border-destructive/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />{pendingChanges.length} cambio(s)
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Importada el {format(new Date(reservation.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                  {reservation.gds && ` • ${reservation.gds.toUpperCase()}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={copyForWhatsApp} className="flex-1 sm:flex-none">
                <Copy className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">WhatsApp</span>
              </Button>
              <Button variant="outline" size="sm" onClick={exportICS} className="flex-1 sm:flex-none">
                <Calendar className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">ICS</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsReimportOpen(true)} className="flex-1 sm:flex-none">
                <AlertTriangle className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Re-importar PNR</span><span className="sm:hidden">Re-importar</span>
              </Button>
              <Button size="sm" onClick={() => setIsEditModalOpen(true)} className="flex-1 sm:flex-none">
                <Pencil className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Editar</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex-1 sm:flex-none"><Trash2 className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Eliminar</span></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar vuelo?</AlertDialogTitle>
                    <AlertDialogDescription>Se eliminarán todos los segmentos, pasajeros y datos asociados.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteReservation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Passengers */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Pasajeros ({reservation.passengers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {reservation.passengers.length === 0 ? (
                <p className="text-muted-foreground">Sin pasajeros registrados</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {reservation.passengers.map((pax, index) => (
                    <div key={pax.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">{index + 1}.</span>
                      <div>
                        <span className="font-medium">{pax.last_name}/{pax.first_name || ''}</span>
                        {pax.title && <span className="text-muted-foreground ml-2">{pax.title}</span>}
                        {pax.document && <div className="text-xs text-muted-foreground mt-0.5">Doc: {pax.document}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flight Segments */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Vuelos ({reservation.flight_segments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {reservation.flight_segments.length === 0 ? (
                <p className="text-muted-foreground">Sin vuelos registrados</p>
              ) : (
                <div className="space-y-4">
                  {reservation.flight_segments.map((seg, index) => {
                    const isCheckedIn = seg.checkins.length > 0;
                    const depDate = seg.dep_datetime_local ? new Date(seg.dep_datetime_local) : null;
                    const arrDate = seg.arr_datetime_local ? new Date(seg.arr_datetime_local) : null;

                    return (
                      <div key={seg.id} className="relative">
                        {index > 0 && <Separator className="my-4" />}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={cn(
                              'flex h-12 w-12 items-center justify-center rounded-xl shrink-0',
                              seg.has_changes ? 'bg-destructive/10' : isCheckedIn ? 'bg-green-500/10' : 'bg-primary/10'
                            )}>
                              <Plane className={cn(
                                'h-6 w-6',
                                seg.has_changes ? 'text-destructive' : isCheckedIn ? 'text-green-500' : 'text-primary'
                              )} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base sm:text-lg font-semibold">{seg.airline_code} {seg.flight_number}</span>
                                <span className="text-muted-foreground text-sm sm:text-base">{seg.origin_iata} → {seg.destination_iata}</span>
                                {seg.booking_class && <Badge variant="outline" className="text-xs">Clase {seg.booking_class}</Badge>}
                                {seg.segment_status && <Badge variant="outline" className="text-xs">{seg.segment_status}</Badge>}
                                {seg.is_incomplete && <Badge variant="outline" className="text-xs text-yellow-600">Incompleto</Badge>}
                                {seg.has_changes && <Badge variant="outline" className="text-xs text-destructive border-destructive/30">Con cambios</Badge>}
                              </div>

                              {seg.airline_locator && (
                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20 max-w-full flex-wrap">
                                  <Tag className="h-4 w-4 text-primary shrink-0" />
                                  <span className="text-xs sm:text-sm font-medium text-primary">Loc. {seg.airline_code}:</span>
                                  <span className="font-mono text-sm sm:text-base font-bold text-primary break-all">{seg.airline_locator}</span>
                                </div>
                              )}

                              <div className="mt-2 text-xs sm:text-sm text-muted-foreground">
                                {depDate ? (
                                  <>
                                    <span className="font-medium text-foreground">{format(depDate, "EEEE d 'de' MMMM", { locale: es })}</span>
                                    <span className="mx-2">•</span>
                                    <span>Salida: {format(depDate, 'HH:mm')}{arrDate && ` → Llegada: ${format(arrDate, 'HH:mm')}`}</span>
                                  </>
                                ) : (
                                  <span className="text-yellow-600">Sin fecha/hora definida</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 sm:shrink-0 ml-15 sm:ml-0">
                            <Button
                              variant={isCheckedIn ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleCheckin(seg.id, isCheckedIn)}
                              disabled={toggleCheckin.isPending}
                              className={cn('flex-1 sm:flex-none', isCheckedIn && 'bg-green-500 hover:bg-green-600')}
                            >
                              {isCheckedIn ? (
                                <><CheckCircle2 className="h-4 w-4 mr-1" />Check-in</>
                              ) : (
                                <><Clock className="h-4 w-4 mr-1" />Check-in</>
                              )}
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar vuelo?</AlertDialogTitle>
                                  <AlertDialogDescription>Se eliminará {seg.airline_code} {seg.flight_number} ({seg.origin_iata} → {seg.destination_iata}).</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteSegment(seg.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Changes */}
          {reservation.changes.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-lg">Cambios Detectados ({reservation.changes.length})</CardTitle>
                </div>
                {pendingChanges.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleResolveAll} disabled={resolveChange.isPending}>
                    Resolver todos
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reservation.changes.map(change => (
                    <div
                      key={change.id}
                      className={cn(
                        'p-3 rounded-lg border',
                        change.status === 'pending' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-medium capitalize">{change.change_type.replace('_', ' ')}</span>
                          <span className="text-muted-foreground mx-2">•</span>
                          <span className="text-sm">{change.field_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={change.status === 'pending' ? 'destructive' : 'secondary'}>
                            {change.status === 'pending' ? 'Pendiente' : 'Resuelto'}
                          </Badge>
                          {change.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolveChange(change.id)}
                              disabled={resolveChange.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />Resolver
                            </Button>
                          )}
                        </div>
                      </div>
                      {(change.before_value || change.after_value) && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {change.before_value && <span>Antes: <span className="font-mono">{change.before_value}</span></span>}
                          {change.before_value && change.after_value && <span className="mx-2">→</span>}
                          {change.after_value && <span>Ahora: <span className="font-mono">{change.after_value}</span></span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <EditReservationModal
        reservation={reservation}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
      <ReimportPNRDialog
        reservationId={reservation.id}
        currentLocator={reservation.locator}
        currentGds={reservation.gds}
        open={isReimportOpen}
        onOpenChange={setIsReimportOpen}
      />
    </div>
  );
}
