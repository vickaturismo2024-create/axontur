import { useMemo } from 'react';
import { Quote } from '@/types/quote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { hasCompleteCosts, getQuoteCurrency } from '@/lib/quoteFilters';

interface DashboardChartsProps {
  quotes: Quote[];
  currency?: string;
}

const COLORS = ['hsl(215, 50%, 23%)', 'hsl(38, 70%, 55%)', 'hsl(38, 45%, 85%)', 'hsl(215, 40%, 35%)', 'hsl(0, 72%, 51%)', 'hsl(150, 50%, 40%)'];

export function DashboardCharts({ quotes, currency }: DashboardChartsProps) {
  // Filter by currency if provided
  const filteredQuotes = useMemo(() => {
    if (!currency) return quotes;
    return quotes.filter(q => getQuoteCurrency(q) === currency);
  }, [quotes, currency]);

  // Quotes with complete costs for profitability metrics
  const profitableQuotes = useMemo(() => filteredQuotes.filter(hasCompleteCosts), [filteredQuotes]);

  const currencySymbol = currency === 'ARS' ? 'ARS ' : 'US$';

  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; count: number; revenue: number; cost: number }> = {};
    filteredQuotes.forEach(q => {
      const d = new Date(q.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { month: label, count: 0, revenue: 0, cost: 0 };
      months[key].count++;
    });
    // Revenue/cost only from profitable quotes
    profitableQuotes.forEach(q => {
      const d = new Date(q.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].revenue += q.pricing.totalPrice || 0;
        months[key].cost += q.pricing.totalCost || 0;
      }
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-6);
  }, [filteredQuotes, profitableQuotes]);

  const destinationData = useMemo(() => {
    const dests: Record<string, number> = {};
    filteredQuotes.forEach(q => {
      const dest = q.trip.destination || 'Sin destino';
      dests[dest] = (dests[dest] || 0) + 1;
    });
    return Object.entries(dests)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [filteredQuotes]);

  const marginData = useMemo(() => {
    const months: Record<string, { month: string; margin: number; count: number }> = {};
    profitableQuotes.forEach(q => {
      const cost = q.pricing.totalCost || 0;
      const price = q.pricing.totalPrice || 0;
      const d = new Date(q.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { month: label, margin: 0, count: 0 };
      months[key].margin += ((price - cost) / cost) * 100;
      months[key].count++;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => ({ month: v.month, margin: Math.round(v.margin / v.count) }));
  }, [profitableQuotes]);

  const statusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    filteredQuotes.forEach(q => {
      const s = q.status || 'draft';
      const labels: Record<string, string> = { draft: 'Borrador', sent: 'Enviado', approved: 'Aprobado', expired: 'Vencido' };
      statuses[labels[s] || s] = (statuses[labels[s] || s] || 0) + 1;
    });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [filteredQuotes]);

  const topClients = useMemo(() => {
    const clients: Record<string, number> = {};
    profitableQuotes.forEach(q => {
      const name = q.client.name || 'Sin nombre';
      clients[name] = (clients[name] || 0) + (q.pricing.totalPrice || 0);
    });
    return Object.entries(clients)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '…' : name, value }));
  }, [profitableQuotes]);

  const destProfitData = useMemo(() => {
    const dests: Record<string, { revenue: number; cost: number }> = {};
    profitableQuotes.forEach(q => {
      const dest = q.trip.destination || 'Sin destino';
      if (!dests[dest]) dests[dest] = { revenue: 0, cost: 0 };
      dests[dest].revenue += q.pricing.totalPrice || 0;
      dests[dest].cost += q.pricing.totalCost || 0;
    });
    return Object.entries(dests)
      .filter(([, v]) => v.cost > 0)
      .sort(([, a], [, b]) => (b.revenue - b.cost) - (a.revenue - a.cost))
      .slice(0, 6)
      .map(([name, v]) => ({
        name: name.length > 12 ? name.substring(0, 12) + '…' : name,
        margin: v.cost > 0 ? Math.round(((v.revenue - v.cost) / v.cost) * 100) : 0,
      }));
  }, [profitableQuotes]);

  if (filteredQuotes.length < 2) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Presupuestos por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(215, 50%, 23%)" radius={[4, 4, 0, 0]} name="Presupuestos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Destinos populares</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={destinationData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                  {destinationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evolución del margen</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={marginData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="margin" stroke="hsl(38, 70%, 55%)" strokeWidth={2} dot={{ fill: 'hsl(38, 70%, 55%)' }} name="Margen" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ingresos vs Costos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `${currencySymbol}${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(150, 50%, 40%)" strokeWidth={2} name="Ingresos" />
                <Line type="monotone" dataKey="cost" stroke="hsl(0, 72%, 51%)" strokeWidth={2} name="Costos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} style={{ fontSize: 10 }}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top clientes ({currencySymbol})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topClients} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                <Tooltip formatter={(v: number) => `${currencySymbol}${v.toLocaleString()}`} />
                <Bar dataKey="value" fill="hsl(215, 50%, 23%)" radius={[0, 4, 4, 0]} name="Facturación" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Margen por destino</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={destProfitData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="margin" fill="hsl(38, 70%, 55%)" radius={[4, 4, 0, 0]} name="Margen %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
