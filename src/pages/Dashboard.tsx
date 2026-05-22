import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotes } from '@/contexts/QuotesContext';
import { Header } from '@/components/layout/Header';
import { FileText, DollarSign, TrendingUp, CalendarDays, CheckCircle } from 'lucide-react';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { CurrencyRatesWidget } from '@/components/dashboard/CurrencyRatesWidget';
import { RemindersPanel } from '@/components/reminders/RemindersPanel';
import { OperationalAlertsWidget } from '@/components/dashboard/OperationalAlertsWidget';
import { UpcomingFlightsWidget } from '@/components/dashboard/UpcomingFlightsWidget';
import { BirthdayWidget } from '@/components/dashboard/BirthdayWidget';

const Dashboard = () => {
  const { user } = useAuth();
  const { quotes } = useQuotes();

  const activeQuotes = useMemo(() => quotes.filter(q => !q.archived), [quotes]);

  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = activeQuotes.filter(q => {
      const d = new Date(q.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const marginByCurrency: Record<string, number> = {};
    activeQuotes
      .filter(q => q.status === 'approved' && (q.pricing.totalCost || 0) > 0 && (q.pricing.totalPrice || 0) > 0)
      .forEach(q => {
        const currency = (q.trip as any).currency || 'USD';
        const margin = (q.pricing.totalPrice || 0) - (q.pricing.totalCost || 0);
        marginByCurrency[currency] = (marginByCurrency[currency] || 0) + margin;
      });
    const quotesWithMargin = activeQuotes.filter(q => (q.pricing.totalCost || 0) > 0 && (q.pricing.totalPrice || 0) > 0);
    const avgMargin = quotesWithMargin.length > 0
      ? quotesWithMargin.reduce((sum, q) => {
          const cost = q.pricing.totalCost || 0;
          const price = q.pricing.totalPrice || 0;
          return sum + ((price - cost) / cost) * 100;
        }, 0) / quotesWithMargin.length
      : 0;
    const approved = activeQuotes.filter(q => q.status === 'approved').length;
    const approvalRate = activeQuotes.length > 0 ? (approved / activeQuotes.length) * 100 : 0;
    return { total: activeQuotes.length, marginByCurrency, avgMargin, thisMonth: thisMonth.length, approvalRate };
  }, [activeQuotes]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">

        {/* Hero */}
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary via-navy-light to-primary p-5 sm:p-8 text-primary-foreground shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-serif text-2xl font-bold sm:text-3xl md:text-4xl">AxonTur</h1>
            <span className="text-sm text-primary-foreground/70">
              Bienvenido, {user?.email?.split('@')[0]}
            </span>
          </div>

          {/* Métricas */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gold" />
                <span className="text-xl font-bold">{metrics.total}</span>
              </div>
              <p className="mt-1 text-xs text-primary-foreground/70">Presupuestos</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gold" />
                <div className="flex flex-col">
                  {Object.entries(metrics.marginByCurrency).length > 0
                    ? Object.entries(metrics.marginByCurrency).map(([currency, value]) => (
                        <span key={currency} className="text-base font-bold leading-tight">
                          {currency} ${value.toLocaleString()}
                        </span>
                      ))
                    : <span className="text-xl font-bold">-</span>
                  }
                </div>
              </div>
              <p className="mt-1 text-xs text-primary-foreground/70">Ganancia aprobados</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gold" />
                <span className="text-xl font-bold">{metrics.avgMargin.toFixed(1)}%</span>
              </div>
              <p className="mt-1 text-xs text-primary-foreground/70">Margen prom.</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gold" />
                <span className="text-xl font-bold">{metrics.thisMonth}</span>
              </div>
              <p className="mt-1 text-xs text-primary-foreground/70">Este mes</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-gold" />
                <span className="text-xl font-bold">{metrics.approvalRate.toFixed(0)}%</span>
              </div>
              <p className="mt-1 text-xs text-primary-foreground/70">Aprobados</p>
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Acciones rápidas</p>
          <QuickActions />
        </div>

        {/* Widget de cotizaciones */}
        <div className="mb-4">
          <CurrencyRatesWidget />
        </div>

        {/* Widgets minimizables */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <RemindersPanel />
          <OperationalAlertsWidget />
          <UpcomingFlightsWidget />
          <BirthdayWidget />
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
