import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { exportExchangeRatesReport } from '@/lib/exportReports';

interface RateLogRow {
  id: string;
  rate_date: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source: string;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
}

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Manual',
  system: 'Sistema',
  historical: 'Histórico',
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  receipt_item: 'Recibo',
  supplier_payment: 'Pago proveedor',
  movement: 'Movimiento',
};

export function ExchangeRatesReport() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RateLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pair, setPair] = useState<string>('all');
  const [showDetail, setShowDetail] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('exchange_rate_log' as any)
      .select('*')
      .eq('user_id', user.id)
      .gte('rate_date', from)
      .lte('rate_date', to)
      .order('rate_date', { ascending: false });
    if (error) {
      toast.error('Error al cargar el log de cotizaciones');
      setRows([]);
    } else {
      setRows((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user, from, to]);

  const availablePairs = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(`${r.from_currency}→${r.to_currency}`));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (pair === 'all') return rows;
    const [f, t] = pair.split('→');
    return rows.filter((r) => r.from_currency === f && r.to_currency === t);
  }, [rows, pair]);

  // Resumen mensual: período | par | promedio | mín | máx | operaciones
  const monthlySummary = useMemo(() => {
    const map = new Map<string, { period: string; pair: string; rates: number[] }>();
    filtered.forEach((r) => {
      const period = r.rate_date.slice(0, 7); // YYYY-MM
      const pairKey = `${r.from_currency}→${r.to_currency}`;
      const key = `${period}__${pairKey}`;
      if (!map.has(key)) map.set(key, { period, pair: pairKey, rates: [] });
      map.get(key)!.rates.push(Number(r.rate));
    });
    return Array.from(map.values())
      .map((v) => {
        const avg = v.rates.reduce((s, x) => s + x, 0) / v.rates.length;
        const min = Math.min(...v.rates);
        const max = Math.max(...v.rates);
        return { period: v.period, pair: v.pair, avg, min, max, count: v.rates.length };
      })
      .sort((a, b) => (b.period === a.period ? a.pair.localeCompare(b.pair) : b.period.localeCompare(a.period)));
  }, [filtered]);

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    await exportExchangeRatesReport(filtered as any, monthlySummary, { from, to });
    toast.success('Reporte exportado');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Desde</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Hasta</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Par de monedas</label>
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los pares</SelectItem>
                  {availablePairs.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExport} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" /> Exportar Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumen mensual</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-muted-foreground text-sm">Cargando...</p>
          ) : monthlySummary.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground text-sm">
              Sin operaciones multi-moneda en el período seleccionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm stack-table">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Período</th>
                    <th className="py-2 pr-4">Par</th>
                    <th className="py-2 pr-4 text-right">Promedio</th>
                    <th className="py-2 pr-4 text-right">Mínimo</th>
                    <th className="py-2 pr-4 text-right">Máximo</th>
                    <th className="py-2 text-right">Operaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map((m, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td data-label="Período" className="py-2 pr-4 font-medium">
                        {format(parseISO(`${m.period}-01`), 'MMM yyyy', { locale: es })}
                      </td>
                      <td data-label="Par" className="py-2 pr-4">
                        <Badge variant="outline" className="font-mono text-xs">
                          {m.pair}
                        </Badge>
                      </td>
                      <td data-label="Promedio" className="py-2 pr-4 text-right font-mono">{m.avg.toFixed(2)}</td>
                      <td data-label="Mínimo" className="py-2 pr-4 text-right font-mono text-muted-foreground">{m.min.toFixed(2)}</td>
                      <td data-label="Máximo" className="py-2 pr-4 text-right font-mono text-muted-foreground">{m.max.toFixed(2)}</td>
                      <td data-label="Operaciones" className="py-2 text-right">{m.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <button
            onClick={() => setShowDetail((v) => !v)}
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            {showDetail ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Detalle por operación ({filtered.length})
          </button>
        </CardHeader>
        {showDetail && (
          <CardContent>
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground text-sm">Sin operaciones.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm stack-table">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Fecha</th>
                      <th className="py-2 pr-4">Par</th>
                      <th className="py-2 pr-4 text-right">Cotización</th>
                      <th className="py-2 pr-4">Origen</th>
                      <th className="py-2">Tipo de operación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td data-label="Fecha" className="py-2 pr-4 whitespace-nowrap">
                          {format(parseISO(r.rate_date), 'dd/MM/yyyy')}
                        </td>
                        <td data-label="Par" className="py-2 pr-4 font-mono text-xs">
                          {r.from_currency}→{r.to_currency}
                        </td>
                        <td data-label="Cotización" className="py-2 pr-4 text-right font-mono">{Number(r.rate).toFixed(4)}</td>
                        <td data-label="Origen" className="py-2 pr-4">
                          <Badge variant={r.source === 'manual' ? 'default' : 'secondary'} className="text-[10px]">
                            {SOURCE_LABEL[r.source] || r.source}
                          </Badge>
                        </td>
                        <td data-label="Tipo" className="py-2 text-muted-foreground text-xs">
                          {SOURCE_TYPE_LABEL[r.source_type || ''] || r.source_type || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
