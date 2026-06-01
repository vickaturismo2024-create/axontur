import { Link } from 'react-router-dom';
import { Plane, ChevronRight, ArrowRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CollapsibleWidget } from '@/components/dashboard/CollapsibleWidget';
import { useUpcomingFlights } from '@/hooks/useFlightReservations';

export function UpcomingFlightsWidget({ defaultOpen, raw }: { defaultOpen?: boolean; raw?: boolean }) {
  const { data, isLoading } = useUpcomingFlights(20);

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const upcoming = (data || []).filter(f => {
    if (!f.segment.dep_datetime_local) return false;
    return new Date(f.segment.dep_datetime_local) <= sevenDaysFromNow;
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2.5">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      );
    }

    if (upcoming.length === 0) {
      return (
        <div className="py-8 text-center">
          <Plane className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2 rotate-45" />
          <p className="text-xs text-muted-foreground">No hay vuelos programados para los próximos 7 días</p>
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cronograma de Despegues</span>
          <Link to="/reservations" className="text-[10px] font-bold text-primary dark:text-gold hover:underline">
            Ver todos los vuelos →
          </Link>
        </div>

        <div className="space-y-2">
          {upcoming.slice(0, 5).map(f => {
            const dep = f.segment.dep_datetime_local
              ? new Date(f.segment.dep_datetime_local)
              : null;
            const days = dep ? differenceInDays(dep, new Date()) : 0;
            const paxNames = f.passengers
              .slice(0, 2)
              .map(p => `${p.last_name}${p.first_name ? ' ' + p.first_name.charAt(0) + '.' : ''}`)
              .join(', ');
            const moreCount = f.passengers.length > 2 ? ` +${f.passengers.length - 2}` : '';

            return (
              <Link
                key={f.segment.id}
                to={`/reservations/${f.reservation.id}`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 hover:bg-accent/5 p-3.5 hover:border-primary/20 dark:hover:border-gold/30 hover:scale-[1.01] hover:shadow-sm transition-all duration-300"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-gold/10 dark:text-gold shrink-0">
                    <Plane className="h-4 w-4 rotate-45" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {f.segment.airline_code} {f.segment.flight_number}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">
                        {f.segment.origin_iata}
                        <ArrowRight className="h-2.5 w-2.5" />
                        {f.segment.destination_iata}
                      </span>
                      {days <= 1 && (
                        <Badge variant="destructive" className="text-[9px] font-bold h-4 px-1.5 leading-none">
                          {days === 0 ? 'HOY' : 'MAÑANA'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-medium flex flex-wrap items-center gap-1.5">
                      <span>{dep && format(dep, "EEE d MMM 'a las' HH:mm", { locale: es })}</span>
                      {paxNames && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{paxNames}{moreCount}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  if (raw) {
    return renderContent();
  }

  return (
    <CollapsibleWidget
      widgetKey="upcoming-flights"
      icon={<Plane className="h-4 w-4 text-primary" />}
      title="Vuelos próximos (7 días)"
      count={upcoming.length}
      badgeVariant={upcoming.some(f => {
        const dep = f.segment.dep_datetime_local ? new Date(f.segment.dep_datetime_local) : null;
        return dep ? differenceInDays(dep, new Date()) <= 1 : false;
      }) ? 'destructive' : 'secondary'}
      defaultOpen={defaultOpen}
    >
      {renderContent()}
    </CollapsibleWidget>
  );
}
