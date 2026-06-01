import { useState } from 'react';
import { AlertTriangle, Plane, Cake, ArrowRight, CheckSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUpcomingFlights } from '@/hooks/useFlightReservations';
import { BirthdayWidget } from '@/components/dashboard/BirthdayWidget';
import { UpcomingFlightsWidget } from '@/components/dashboard/UpcomingFlightsWidget';
import { OperationalAlertsWidget } from '@/components/dashboard/OperationalAlertsWidget';
import { RemindersPanel } from '@/components/reminders/RemindersPanel';
import { getDocStatus } from '@/components/clients/DocumentAlertBadge';
import { differenceInDays, parseISO } from 'date-fns';

export function OperationsConsole() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'alerts' | 'reminders' | 'flights' | 'birthdays'>('alerts');

  // --- Counts Queries (for Tab Badges) ---
  
  // 1. Flights Count
  const { data: flightsData } = useUpcomingFlights(20);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const flightsCount = (flightsData || []).filter(f => {
    if (!f.segment.dep_datetime_local) return false;
    return new Date(f.segment.dep_datetime_local) <= sevenDaysFromNow;
  }).length;

  // 2. Birthdays Count
  const { data: bdaysData } = useQuery({
    queryKey: ['console-bdays-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from('clients')
        .select('birth_date')
        .not('birth_date', 'is', null);
      if (!data) return 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const items = data.filter((c: any) => {
        if (!c.birth_date) return false;
        const [_, mStr, dStr] = c.birth_date.split('-');
        const month = parseInt(mStr, 10) - 1;
        const day = parseInt(dStr, 10);
        if (Number.isNaN(month) || Number.isNaN(day)) return false;

        let next = new Date(today.getFullYear(), month, day);
        next.setHours(0, 0, 0, 0);
        if (next.getTime() < today.getTime()) {
          next = new Date(today.getFullYear() + 1, month, day);
        }
        const days = Math.round((next.getTime() - today.getTime()) / 86400000);
        return days <= 31;
      });
      return items.length;
    },
    enabled: !!user,
  });

  // 3. Alerts Count
  const { data: alertsCount } = useQuery({
    queryKey: ['console-alerts-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      let count = 0;
      const today = new Date();
      const todayIso = today.toISOString().split('T')[0];

      // 1) Payments due
      const in3 = new Date();
      in3.setDate(in3.getDate() + 3);
      const { data: services } = await supabase
        .from('file_services')
        .select('id')
        .not('payment_due_date', 'is', null)
        .neq('status', 'paid')
        .lte('payment_due_date', in3.toISOString().split('T')[0]);
      count += services?.length || 0;

      // 2) Documents expiring
      const { data: clients } = await supabase
        .from('clients')
        .select('dni_expiry, passport_expiry');
      if (clients) {
        clients.forEach((c: any) => {
          const dni = getDocStatus(c.dni_expiry);
          const pas = getDocStatus(c.passport_expiry);
          if (dni === 'expired' || dni === 'expiring') count++;
          if (pas === 'expired' || pas === 'expiring') count++;
        });
      }

      // 3) Files to close
      const { data: files } = await supabase
        .from('files')
        .select('id')
        .lt('end_date', todayIso)
        .in('status', ['confirmed', 'in_progress']);
      count += files?.length || 0;

      // 4) Receipt drafts
      const sevenAgo = new Date();
      sevenAgo.setDate(sevenAgo.getDate() - 7);
      const { data: receipts } = await supabase
        .from('file_receipts')
        .select('id')
        .eq('status', 'draft')
        .lt('created_at', sevenAgo.toISOString());
      count += receipts?.length || 0;

      // 5) Quotes approved
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id')
        .eq('status', 'approved')
        .gte('approved_at', sevenAgo.toISOString());
      count += quotes?.length || 0;

      return count;
    },
    enabled: !!user,
  });

  // 4. Reminders Count
  const { data: remindersCount } = useQuery({
    queryKey: ['console-reminders-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      let count = 0;

      // 1) Reminders
      const { data: rems } = await supabase
        .from('reminders')
        .select('id')
        .eq('completed', false);
      count += rems?.length || 0;

      // 2) Service due dates
      const { data: svcData } = await supabase
        .from('file_services')
        .select('id, payment_due_date, status')
        .not('payment_due_date', 'is', null)
        .neq('status', 'cancelled');
      if (svcData) {
        const dues = (svcData as any[]).filter(s => {
          const days = differenceInDays(new Date(s.payment_due_date), new Date());
          return days <= 3;
        });
        count += dues.length;
      }

      return count;
    },
    enabled: !!user,
  });

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-premium overflow-hidden transition-all duration-200">
      {/* Console Header & Tabs Navigation */}
      <div className="border-b border-border bg-muted/20 px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Consola de Operaciones</h2>
            <p className="text-xs text-muted-foreground">Monitoreo y alertas operativas en tiempo real</p>
          </div>

          {/* Segmented Pill Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted dark:bg-muted/40 border border-border/40 rounded-xl max-w-fit">
            {/* Alerts Tab */}
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 shrink-0 ${
                activeTab === 'alerts'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/20'
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas
              {alertsCount !== undefined && alertsCount > 0 && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1 animate-pulse">
                  {alertsCount}
                </span>
              )}
            </button>

            {/* Reminders Tab */}
            <button
              onClick={() => setActiveTab('reminders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 shrink-0 ${
                activeTab === 'reminders'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/20'
              }`}
            >
              <CheckSquare className="h-4 w-4 text-[hsl(var(--gold))]" />
              Tareas
              {remindersCount !== undefined && remindersCount > 0 && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1 animate-pulse">
                  {remindersCount}
                </span>
              )}
            </button>

            {/* Flights Tab */}
            <button
              onClick={() => setActiveTab('flights')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 shrink-0 ${
                activeTab === 'flights'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/20'
              }`}
            >
              <Plane className="h-4 w-4 text-primary dark:text-gold" />
              Vuelos
              {flightsCount > 0 && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary/10 text-primary dark:text-gold dark:bg-gold/15 text-[9px] font-bold px-1">
                  {flightsCount}
                </span>
              )}
            </button>

            {/* Birthdays Tab */}
            <button
              onClick={() => setActiveTab('birthdays')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 shrink-0 ${
                activeTab === 'birthdays'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/20'
              }`}
            >
              <Cake className="h-4 w-4 text-pink-500" />
              Cumpleaños
              {bdaysData !== undefined && bdaysData > 0 && (
                <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[9px] font-bold px-1">
                  {bdaysData}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Contents Frame */}
      <div className="p-5 max-h-[500px] overflow-y-auto scrollbar-thin">
        {activeTab === 'alerts' && <OperationalAlertsWidget defaultOpen={true} raw />}
        {activeTab === 'reminders' && <RemindersPanel defaultOpen={true} raw />}
        {activeTab === 'flights' && <UpcomingFlightsWidget defaultOpen={true} raw />}
        {activeTab === 'birthdays' && <BirthdayWidget defaultOpen={true} raw />}
      </div>
    </div>
  );
}
