import { Link } from 'react-router-dom';
import { Plane, ChevronRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CollapsibleWidget } from '@/components/dashboard/CollapsibleWidget';
import { useUpcomingFlights } from '@/hooks/useFlightReservations';

export function UpcomingFlightsWidget() {
  const { data, isLoading } = useUpcomingFlights(20);

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const upcoming = (data || []).filter(f => {
    if (!f.segment.dep_datetime_local) return false;
    return new Date(f.segment.dep_datetime_local) <= sevenDaysFromNow;
  });

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
    >
      <div className="flex items-center justify-between mb-2">
        <Link to="/reservations" className="text-xs text-muted-foreground hover:text-foreground ml-auto">
          Ver todos →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No hay vuelos en los próximos 7 días.
        </p>
      ) : (
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
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Plane className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {f.segment.airline_code} {f.segment.flight_number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {f.segment.origin_iata} → {f.segment.destination_iata}
                    </span>
                    {days <= 1 && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                        {days === 0 ? 'Hoy' : 'Mañana'}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {dep && format(dep, "EEE d MMM HH:mm", { locale: es })}
                    {paxNames && ` • ${paxNames}${moreCount}`}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </CollapsibleWidget>
  );
}
