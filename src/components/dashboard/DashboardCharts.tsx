import { useMemo } from 'react';
import { Quote } from '@/types/quote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface DashboardChartsProps {
  quotes: Quote[];
}

const COLORS = ['hsl(215, 50%, 23%)', 'hsl(38, 70%, 55%)', 'hsl(38, 45%, 85%)', 'hsl(215, 40%, 35%)', 'hsl(0, 72%, 51%)', 'hsl(150, 50%, 40%)'];

export function DashboardCharts({ quotes }: DashboardChartsProps) {
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; count: number; revenue: number }> = {};
    quotes.forEach(q => {
      const d = new Date(q.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es', { month: 'short', year: '2-digit' });
      if (!months[key]) months[key] = { month: label, count: 0, revenue: 0 };
      months[key].count++;
      months[key].revenue += q.pricing.totalPrice || 0;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-6);
  }, [quotes]);

  const destinationData = useMemo(() => {
    const dests: Record<string, number> = {};
    quotes.forEach(q => {
      const dest = q.trip.destination || 'Sin destino';
      dests[dest] = (dests[dest] || 0) + 1;
    });
    return Object.entries(dests)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [quotes]);

  const marginData = useMemo(() => {
    const months: Record<string, { month: string; margin: number; count: number }> = {};
    quotes.forEach(q => {
      const cost = q.pricing.totalCost || 0;
      const price = q.pricing.totalPrice || 0;
      if (cost <= 0 || price <= 0) return;
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
  }, [quotes]);

  if (quotes.length < 2) return null;

  return (
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
  );
}
