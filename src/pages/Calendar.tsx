import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useQuotes } from '@/contexts/QuotesContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = [
  'bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300',
  'bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  'bg-amber-200 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
  'bg-purple-200 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
  'bg-rose-200 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300',
  'bg-teal-200 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300',
];

const Calendar = () => {
  const navigate = useNavigate();
  const { quotes } = useQuotes();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const activeQuotes = useMemo(() => quotes.filter(q => !q.archived && q.status === 'approved' && q.trip.startDate && q.trip.endDate), [quotes]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0=Sun

  const tripsInMonth = useMemo(() => {
    return activeQuotes.filter(q => {
      try {
        const start = parseISO(q.trip.startDate);
        const end = parseISO(q.trip.endDate);
        return (start <= monthEnd && end >= monthStart);
      } catch { return false; }
    });
  }, [activeQuotes, monthStart, monthEnd]);

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
            <p className="mt-1 text-muted-foreground">Vista mensual de los viajes aprobados</p>
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
              {dayNames.map(d => (
                <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-card min-h-[80px] p-1" />
              ))}
              {days.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const tripsOnDay = tripsInMonth.filter(q => {
                  try {
                    return isWithinInterval(day, { start: parseISO(q.trip.startDate), end: parseISO(q.trip.endDate) });
                  } catch { return false; }
                });
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                return (
                  <div key={dayStr} className={`bg-card min-h-[80px] p-1 ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}>
                    <span className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {tripsOnDay.slice(0, 3).map((q, i) => (
                        <button
                          key={q.id}
                          onClick={() => navigate(`/quote/${q.id}`)}
                          className={`w-full truncate rounded px-1 py-0.5 text-[10px] font-medium text-left ${COLORS[activeQuotes.indexOf(q) % COLORS.length]}`}
                          title={`${q.client.name} - ${q.trip.destination}`}
                        >
                          {q.trip.destination || q.client.name}
                        </button>
                      ))}
                      {tripsOnDay.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{tripsOnDay.length - 3} más</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            {tripsInMonth.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tripsInMonth.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => navigate(`/quote/${q.id}`)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${COLORS[activeQuotes.indexOf(q) % COLORS.length]}`}
                  >
                    {q.trip.destination} — {q.client.name}
                  </button>
                ))}
              </div>
            )}

            {tripsInMonth.length === 0 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">No hay viajes programados este mes</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Calendar;
