import { useQuery } from '@tanstack/react-query';
import { Wallet, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CollapsibleWidget } from '@/components/dashboard/CollapsibleWidget';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CashBalance {
  incoming: number;
  outgoing: number;
  balance: number;
}

type Balances = Record<string, CashBalance>;

async function fetchCashBalances(): Promise<Balances> {
  // 1. Fetch receipts (incoming items)
  const { data: receiptItems, error: rError } = await supabase
    .from('file_receipt_items')
    .select('amount, currency, receipt_id');

  if (rError) throw rError;

  // 2. Fetch receipts to check status (to filter out cancelled receipts)
  const { data: receipts, error: receiptsError } = await supabase
    .from('file_receipts')
    .select('id, status');

  if (receiptsError) throw receiptsError;

  // 3. Fetch supplier payments (outgoing)
  const { data: supplierPayments, error: pError } = await supabase
    .from('file_supplier_payments' as any)
    .select('amount, currency');

  if (pError) throw pError;

  // 4. Fetch incident payments (outgoing costs)
  const { data: incidents, error: iError } = await supabase
    .from('file_incidencias' as any)
    .select('monto, moneda')
    .eq('impacto_caja', true);

  const incidentsList = incidents || [];

  const balances: Balances = {
    ARS: { incoming: 0, outgoing: 0, balance: 0 },
    USD: { incoming: 0, outgoing: 0, balance: 0 },
    EUR: { incoming: 0, outgoing: 0, balance: 0 },
  };

  // Map receipt status in memory
  const statusMap = new Map((receipts || []).map((r: any) => [r.id, r.status]));

  // Add receipts (filter out cancelled)
  (receiptItems || []).forEach((item: any) => {
    const status = statusMap.get(item.receipt_id);
    if (status !== 'cancelled') {
      const cur = item.currency || 'USD';
      if (!balances[cur]) {
        balances[cur] = { incoming: 0, outgoing: 0, balance: 0 };
      }
      balances[cur].incoming += Number(item.amount) || 0;
    }
  });

  // Add supplier payments (outgoing)
  (supplierPayments || []).forEach((pay: any) => {
    const cur = pay.currency || 'USD';
    if (!balances[cur]) {
      balances[cur] = { incoming: 0, outgoing: 0, balance: 0 };
    }
    balances[cur].outgoing += Number(pay.amount) || 0;
  });

  // Add incident costs (outgoing)
  incidentsList.forEach((inc: any) => {
    const cur = inc.moneda || 'ARS';
    if (!balances[cur]) {
      balances[cur] = { incoming: 0, outgoing: 0, balance: 0 };
    }
    balances[cur].outgoing += Number(inc.monto) || 0;
  });

  // Calculate final balances
  Object.keys(balances).forEach((cur) => {
    balances[cur].balance = balances[cur].incoming - balances[cur].outgoing;
  });

  return balances;
}

export function QuickCashWidget({ raw }: { raw?: boolean }) {
  const { user } = useAuth();
  
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['quick-cash', user?.id],
    queryFn: fetchCashBalances,
    staleTime: 30 * 1000,
    enabled: !!user,
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Balances actualizados');
    } catch {
      toast.error('Error al actualizar balances');
    }
  };

  const getCardColor = (bal: number) => {
    if (bal > 0) return 'text-emerald-600 dark:text-emerald-400';
    if (bal < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const renderContent = () => (
    <div className={`space-y-4 ${raw ? 'flex flex-col flex-grow h-full' : ''}`}>
      {raw ? (
        <div className="absolute top-5 right-5 z-10">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-7 w-7 p-0 hover:bg-muted"
            title="Actualizar balances"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Saldos netos consolidados de la caja operativa</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-7 w-7 p-0"
            title="Actualizar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
          <p className="text-xs text-destructive font-medium">
            Error de conexión con la base de datos al calcular saldos.
          </p>
          <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={handleRefresh}>
            Reintentar
          </Button>
        </div>
      ) : isLoading ? (
        <div className={raw ? "flex flex-col gap-3.5 flex-grow" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
          <Skeleton className="h-24 w-full rounded-xl animate-pulse flex-1" />
          <Skeleton className="h-24 w-full rounded-xl animate-pulse flex-1" />
        </div>
      ) : (
        <div className={raw ? "flex flex-col gap-3.5 flex-grow" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
          {/* ARS Balance */}
          <div className={`rounded-xl border border-emerald-500/10 bg-gradient-to-br from-emerald-500/[0.04] to-emerald-500/[0.005] hover:bg-emerald-500/[0.06] p-4 transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group flex flex-col justify-between ${raw ? 'flex-1 min-h-[120px]' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Caja ARS</span>
              <span className="flex h-5 items-center justify-center rounded-md bg-emerald-500/10 px-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                ARS ($)
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xs font-bold text-muted-foreground/60 select-none">$</span>
              <span className={`text-2xl font-extrabold tracking-tight ${getCardColor(data?.ARS?.balance ?? 0)}`}>
                {formatMoney(data?.ARS?.balance ?? 0)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] font-medium border-t border-emerald-500/10 pt-2.5">
              <span className="flex items-center text-emerald-600 dark:text-emerald-400" title="Cobros ingresados de clientes">
                <ArrowUpRight className="mr-0.5 h-3 w-3 shrink-0" />
                Ingresos: $ {formatMoney(data?.ARS?.incoming ?? 0)}
              </span>
              <span className="flex items-center text-destructive" title="Pagos a proveedores e incidencias de caja">
                <ArrowDownRight className="mr-0.5 h-3 w-3 shrink-0" />
                Egresos: $ {formatMoney(data?.ARS?.outgoing ?? 0)}
              </span>
            </div>
          </div>
 
          {/* USD Balance */}
          <div className={`rounded-xl border border-amber-500/10 bg-gradient-to-br from-amber-500/[0.04] to-amber-500/[0.005] hover:bg-amber-500/[0.06] p-4 transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group flex flex-col justify-between ${raw ? 'flex-1 min-h-[120px]' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Caja USD</span>
              <span className="flex h-5 items-center justify-center rounded-md bg-amber-500/10 px-1.5 text-[10px] font-bold text-amber-600 dark:text-emerald-400">
                USD (u$s)
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xs font-bold text-muted-foreground/60 select-none">u$s</span>
              <span className={`text-2xl font-extrabold tracking-tight ${getCardColor(data?.USD?.balance ?? 0)}`}>
                {formatMoney(data?.USD?.balance ?? 0)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] font-medium border-t border-amber-500/10 pt-2.5">
              <span className="flex items-center text-emerald-600 dark:text-emerald-400" title="Cobros ingresados de clientes">
                <ArrowUpRight className="mr-0.5 h-3 w-3 shrink-0" />
                Ingresos: u$s {formatMoney(data?.USD?.incoming ?? 0)}
              </span>
              <span className="flex items-center text-destructive" title="Pagos a proveedores e incidencias de caja">
                <ArrowDownRight className="mr-0.5 h-3 w-3 shrink-0" />
                Egresos: u$s {formatMoney(data?.USD?.outgoing ?? 0)}
              </span>
            </div>
          </div>

          {/* EUR Balance (show only if balance is non-zero) */}
          {data?.EUR && (data.EUR.incoming > 0 || data.EUR.outgoing > 0) && (
            <div className="col-span-1 sm:col-span-2 rounded-xl border border-border bg-muted/40 p-2.5 text-xs flex justify-between items-center px-4 shrink-0">
              <span className="text-muted-foreground font-sans font-medium text-[11px] uppercase tracking-wider">Caja EUR:</span>
              <span className={`font-bold ${getCardColor(data.EUR.balance)}`}>
                € {formatMoney(data.EUR.balance)}
              </span>
              <div className="flex items-center gap-3 text-[10px] font-medium">
                <span className="text-emerald-600">+{formatMoney(data.EUR.incoming)}</span>
                <span className="text-destructive">-{formatMoney(data.EUR.outgoing)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (raw) {
    return renderContent();
  }

  return (
    <CollapsibleWidget
      widgetKey="quick-cash"
      icon={<Wallet className="h-4 w-4 text-[hsl(var(--gold))]" />}
      title="Caja Rápida de la Agencia"
      count={0}
    >
      {renderContent()}
    </CollapsibleWidget>
  );
}
