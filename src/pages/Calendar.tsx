import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Header } from '@/components/layout/Header';
import { useQuotes } from '@/contexts/QuotesContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CalendarDays, Plane, AlertTriangle } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
  startOfToday,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = [
  'bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  'bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  'bg-amber-200 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
  'bg-purple-200 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
  'bg-rose-200 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300',
  'bg-teal-200 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300',
];

const FLIGHT_CHIP = 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700';
const FLIGHT_CHIP_ALERT = 'bg-destructive/15 text-destructive border border-destructive/40';

interface CalendarFlight {
  id: string;
  reservation_id: string;
  airline_code: string;
  flight_number: string;
  origin_iata: string;
  destination_iata: string;
  dep_datetime_local: string;
  has_changes: boolean;
}

const Calendar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { quotes } = useQuotes();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const activeQuotes = useMemo(
    () =>
      quotes.filter(
        (q) =>
          !q.archived &&
          q.status === 'approved' &&
          q.trip.startDate &&
          q.trip.endDate &&
          parseISO(q.trip.endDate) >= startOfToday()
      ),
    [quotes]
  );

  const tripsInMonth = useMemo(() => {
    return activeQuotes.filter((q) => {
      try {
        const start = parseISO(q.trip.startDate);
        const end = parseISO(q.trip.endDate);
        return start <= monthEnd && end >= monthStart;
      } catch {
        return false;
      }
    });
  }, [activeQuotes, monthStart, monthEnd]);

  // Fetch flight segments for the month
  const { data: flights = [] } = useQuery({
    queryKey: queryKeys.calendar.flightSegments(user?.id, monthStart.toISOString(), monthEnd.toISOString()),
    queryFn: async () => {
      if (!user) return [] as CalendarFlight[];
      const { data, error } = await supabase
        .from('flight_segments')
        .select('id, reservation_id, airline_code, flight_number, origin_iata, destination_iata, dep_datetime_local, has_changes, reservations!inner(user_id)')
        .gte('dep_datetime_local', monthStart.toISOString())
        .lte('dep_datetime_local', monthEnd.toISOString())
        .eq('reservations.user_id', user.id)
        .order('dep_datetime_local');
      if (error) {
        console.error(error);
        return [] as CalendarFlight[];
      }
      return (data || []) as unknown as CalendarFlight[];
    },
    enabled: !!user,
  });

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
              <CalendarDays className="h-8 w-8" /> Calendario de Viajes
            </h1>
            <p className="mt-1 text-muted-foreground">Vista mensual de viajes aprobados y vuelos</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="font-serif text-xl capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {dayNames.map((d) => (
                <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-card min-h-[90px] p-1" />
              ))}
              {days.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const tripsOnDay = tripsInMonth.filter((q) => {
                  try {
                    return isWithinInterval(day, {
                      start: parseISO(q.trip.startDate),
                      end: parseISO(q.trip.endDate),
                    });
                  } catch {
                    return false;
                  }
                });
                const flightsOnDay = flights.filter((f) => {
                  try {
                    return isSameDay(parseISO(f.dep_datetime_local), day);
                  } catch {
                    return false;
                  }
                });
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                return (
                  <div
                    key={dayStr}
                    className={`bg-card min-h-[90px] p-1 ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {tripsOnDay.slice(0, 2).map((q) => (
                        <button
                          key={q.id}
                          onClick={() => navigate(`/quote/${q.id}`)}
                          className={`w-full truncate rounded px-1 py-0.5 text-[10px] font-medium text-left ${
                            COLORS[activeQuotes.indexOf(q) % COLORS.length]
                          }`}
                          title={`${q.client.name} - ${q.trip.destination}`}
                        >
                          {q.trip.destination || q.client.name}
                        </button>
                      ))}
                      {flightsOnDay.slice(0, 2).map((f) => {
                        const time = f.dep_datetime_local
                          ? format(parseISO(f.dep_datetime_local), 'HH:mm')
                          : '';
                        return (
                          <button
                            key={f.id}
                            onClick={() => navigate(`/reservations/${f.reservation_id}`)}
                            className={`w-full truncate rounded px-1 py-0.5 text-[10px] font-medium text-left flex items-center gap-1 ${
                              f.has_changes ? FLIGHT_CHIP_ALERT : FLIGHT_CHIP
                            }`}
                            title={`${f.airline_code}${f.flight_number} ${f.origin_iata}→${f.destination_iata} ${time}`}
                          >
                            {f.has_changes ? (
                              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <Plane className="h-2.5 w-2.5 shrink-0" />
                            )}
                            <span className="truncate">
                              {f.airline_code}
                              {f.flight_number} {f.origin_iata}→{f.destination_iata}
                            </span>
                          </button>
                        );
                      })}
                      {tripsOnDay.length + flightsOnDay.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{tripsOnDay.length + flightsOnDay.length - 4} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded bg-blue-200 dark:bg-blue-900/40" />
                Viajes aprobados
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`inline-block h-3 w-3 rounded ${FLIGHT_CHIP}`} />
                Vuelos
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`inline-block h-3 w-3 rounded ${FLIGHT_CHIP_ALERT}`} />
                Vuelos con cambios
              </span>
              <span className="ml-auto">
                {tripsInMonth.length} viaje(s) · {flights.length} vuelo(s) este mes
              </span>
            </div>

            {tripsInMonth.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tripsInMonth.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/quote/${q.id}`)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      COLORS[activeQuotes.indexOf(q) % COLORS.length]
                    }`}
                  >
                    {q.trip.destination} — {q.client.name}
                  </button>
                ))}
              </div>
            )}

            {tripsInMonth.length === 0 && flights.length === 0 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                No hay viajes ni vuelos programados este mes
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Calendar;
