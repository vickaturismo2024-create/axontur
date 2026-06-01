import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotes } from '@/contexts/QuotesContext';
import { Header } from '@/components/layout/Header';
import { FileText, DollarSign, TrendingUp, CalendarDays, CheckCircle } from 'lucide-react';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { FinancialCenter } from '@/components/dashboard/FinancialCenter';
import { OperationsConsole } from '@/components/dashboard/OperationsConsole';


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
    <div className="min-h-screen bg-background animate-fadeInUp">
      <Header />
      <main className="container mx-auto px-3 py-6 sm:px-4 sm:py-8">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="mb-6 overflow-hidden rounded-2xl shadow-xl relative animate-fadeInUp">
          {/* Fondo con gradiente navy + overlay sutil */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy))] via-[hsl(var(--navy-light))] to-[hsl(var(--navy-dark))]" />
          {/* Decoración geométrica top-right */}
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/5" />
          <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-white/5" />

          <div className="relative p-5 sm:p-8">
            {/* Título + bienvenida */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl tracking-tight animate-fadeIn">
                  AxonTur
                </h1>
                <p className="text-sm text-white/70 mt-0.5 font-light">
                  Bienvenido, <span className="text-white font-medium capitalize">{user?.email?.split('@')[0]}</span>
                </p>
              </div>
              {/* Badge de fecha */}
              <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-white/80 w-fit backdrop-blur-sm">
                <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
                {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-5">
              {/* Total presupuestos */}
              <div className="group rounded-xl bg-white/10 hover:bg-white/15 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-default border border-white/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--gold))]/20 border border-[hsl(var(--gold))]/30 transition-transform duration-300 group-hover:rotate-6">
                    <FileText className="h-4 w-4 text-[hsl(var(--gold))]" />
                  </div>
                  <span className="text-xl font-bold text-white tracking-tight">{metrics.total}</span>
                </div>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">Presupuestos</p>
              </div>

              {/* Ganancia */}
              <div className="group rounded-xl bg-white/10 hover:bg-white/15 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-default border border-white/5">
                <div className="flex items-start gap-2 mb-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--gold))]/20 border border-[hsl(var(--gold))]/30 shrink-0 mt-0.5 transition-transform duration-300 group-hover:rotate-6">
                    <DollarSign className="h-4 w-4 text-[hsl(var(--gold))]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    {Object.entries(metrics.marginByCurrency).length > 0
                      ? Object.entries(metrics.marginByCurrency).map(([currency, value]) => (
                          <span key={currency} className="text-base font-bold text-white leading-tight truncate tracking-tight">
                            {currency} {value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          </span>
                        ))
                      : <span className="text-xl font-bold text-white">—</span>
                    }
                  </div>
                </div>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">Ganancia</p>
              </div>

              {/* Margen promedio */}
              <div className="group rounded-xl bg-white/10 hover:bg-white/15 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-default border border-white/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--gold))]/20 border border-[hsl(var(--gold))]/30 transition-transform duration-300 group-hover:rotate-6">
                    <TrendingUp className="h-4 w-4 text-[hsl(var(--gold))]" />
                  </div>
                  <span className="text-xl font-bold text-white tracking-tight">{metrics.avgMargin.toFixed(1)}%</span>
                </div>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">Margen prom.</p>
              </div>

              {/* Este mes */}
              <div className="group rounded-xl bg-white/10 hover:bg-white/15 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-default border border-white/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--gold))]/20 border border-[hsl(var(--gold))]/30 transition-transform duration-300 group-hover:rotate-6">
                    <CalendarDays className="h-4 w-4 text-[hsl(var(--gold))]" />
                  </div>
                  <span className="text-xl font-bold text-white tracking-tight">{metrics.thisMonth}</span>
                </div>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">Este mes</p>
              </div>

              {/* Tasa aprobación */}
              <div className="group rounded-xl bg-white/10 hover:bg-white/15 p-3 sm:p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-default border border-white/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--gold))]/20 border border-[hsl(var(--gold))]/30 transition-transform duration-300 group-hover:rotate-6">
                    <CheckCircle className="h-4 w-4 text-[hsl(var(--gold))]" />
                  </div>
                  <span className="text-xl font-bold text-white tracking-tight">{metrics.approvalRate.toFixed(0)}%</span>
                </div>
                <p className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">Aprobados</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Acciones rápidas ──────────────────────────────────── */}
        <div className="mb-5">
          <p className="section-title">Acciones rápidas</p>
          <QuickActions />
        </div>

        {/* ── Centro Financiero ─────────────────────────────────── */}
        <div className="mb-6 animate-fadeInUp">
          <p className="section-title">Centro Financiero</p>
          <FinancialCenter />
        </div>

        {/* ── Consola de Operaciones ────────────────────────────── */}
        <div className="mb-6 animate-fadeInUp">
          <p className="section-title">Operaciones</p>
          <OperationsConsole />
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
