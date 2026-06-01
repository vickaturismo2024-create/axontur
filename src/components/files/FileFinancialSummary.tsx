import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { isPast, differenceInDays } from 'date-fns';

interface Props {
  fileId: string;
}

interface CurrencyData {
  totalPrice: number;
  totalCost: number;
  collected: number;
  paid: number;
  overdueCount: number;
}

export function FileFinancialSummary({ fileId }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<Record<string, CurrencyData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const map: Record<string, CurrencyData> = {};
      const ensure = (c: string) => {
        if (!map[c]) map[c] = { totalPrice: 0, totalCost: 0, collected: 0, paid: 0, overdueCount: 0 };
        return map[c];
      };

      // Services
      const { data: services } = await supabase.from('file_services').select('price, cost, currency, payment_due_date, status').eq('file_id', fileId);
      if (services) {
        services.forEach((s: any) => {
          const d = ensure(s.currency || 'USD');
          d.totalPrice += Number(s.price) || 0;
          d.totalCost += Number(s.cost) || 0;
          if (s.payment_due_date && s.status !== 'cancelled') {
            const due = new Date(s.payment_due_date);
            if (isPast(due) || differenceInDays(due, new Date()) <= 3) {
              d.overdueCount += 1;
            }
          }
        });
      }

      // Receipt items (collected from client) — excluye anulados y borradores
      const { data: receipts } = await supabase
        .from('file_receipts')
        .select('id, status')
        .eq('file_id', fileId);
      const validReceiptIds = (receipts || [])
        .filter((r: any) => r.status === 'issued' || r.status === 'paid' || !r.status)
        .map((r: any) => r.id);
      if (validReceiptIds.length > 0) {
        const { data: items } = await supabase
          .from('file_receipt_items')
          .select('amount, currency, service_currency, exchange_rate')
          .in('receipt_id', validReceiptIds);
        if (items) {
          items.forEach((i: any) => {
            const amt = Number(i.amount) || 0;
            const rate = Number(i.exchange_rate) || 0;
            if (i.service_currency && rate > 0) {
              const d = ensure(i.service_currency);
              d.collected += amt / rate;
            } else {
              const d = ensure(i.currency || 'USD');
              d.collected += amt;
            }
          });
        }
      }

      // Supplier payments
      const { data: payments } = await supabase.from('file_supplier_payments').select('amount, currency').eq('file_id', fileId);
      if (payments) {
        payments.forEach((p: any) => {
          const d = ensure(p.currency || 'USD');
          d.paid += Number(p.amount) || 0;
        });
      }

      setData(map);
      setLoading(false);
    };
    load();
  }, [user, fileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const currencies = Object.keys(data).sort();

  if (currencies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No hay datos financieros para este expediente. Agregá servicios para ver el resumen.
        </CardContent>
      </Card>
    );
  }

  const fmt = (v: number, c: string) => `${c} ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {currencies.map(currency => {
        const d = data[currency];
        const pendingCollection = d.totalPrice - d.collected;
        const pendingPayment = d.totalCost - d.paid;
        const grossMargin = d.totalPrice - d.totalCost;
        const grossMarginPct = d.totalPrice > 0 ? (grossMargin / d.totalPrice) * 100 : 0;
        const netResult = d.collected - d.paid;

        return (
          <Card key={currency}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif flex items-center gap-2 text-lg font-bold text-primary">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Balance en {currency}
                </CardTitle>
                {d.overdueCount > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {d.overdueCount} vencimiento{d.overdueCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Ingresos */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <ArrowDownCircle className="h-4 w-4 text-green-600" /> Ingresos
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Precio de venta</span>
                      <span className="font-medium">{fmt(d.totalPrice, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cobrado</span>
                      <span className="font-medium text-green-600">{fmt(d.collected, currency)}</span>
                    </div>
                    <div className="border-t pt-1 flex justify-between text-sm font-semibold">
                      <span>Pendiente cobro</span>
                      <span className={pendingCollection > 0 ? 'text-amber-600' : 'text-green-600'}>
                        {fmt(pendingCollection, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Egresos */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <ArrowUpCircle className="h-4 w-4 text-red-600" /> Egresos
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Costo total</span>
                      <span className="font-medium">{fmt(d.totalCost, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pagado</span>
                      <span className="font-medium text-red-600">{fmt(d.paid, currency)}</span>
                    </div>
                    <div className="border-t pt-1 flex justify-between text-sm font-semibold">
                      <span>Pendiente pago</span>
                      <span className={pendingPayment > 0 ? 'text-amber-600' : 'text-green-600'}>
                        {fmt(pendingPayment, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Margen */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-primary" /> Margen bruto
                  </h4>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">
                      <span className={grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {fmt(grossMargin, currency)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {grossMarginPct.toFixed(1)}% sobre venta
                    </div>
                  </div>
                </div>

                {/* Resultado neto */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    {netResult >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                    Resultado neto
                  </h4>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">
                      <span className={netResult >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {fmt(netResult, currency)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Cobrado − Pagado
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
