import { Header } from '@/components/layout/Header';
import { useQuotes } from '@/contexts/QuotesContext';
import { useSupplierAnalytics } from '@/hooks/useSupplierAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CHART_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658',
  '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042',
];

const Reports = () => {
  const { quotes } = useQuotes();
  const supplierStats = useSupplierAnalytics(quotes);

  const top10 = supplierStats.slice(0, 10);
  const pieData = supplierStats.slice(0, 8).map(s => ({ name: s.name, value: s.services }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground">Reportes</h1>
          <p className="mt-1 text-muted-foreground">Análisis de rentabilidad y métricas de tu negocio</p>
        </div>

        {supplierStats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay datos de proveedores en tus presupuestos aún.</p>
              <p className="text-sm mt-1">Cargá servicios con proveedor en tus presupuestos para ver el análisis.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Rentabilidad por proveedor</h2>
            <div className="grid gap-6 lg:grid-cols-2 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top proveedores por volumen</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={top10} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Bar dataKey="totalCost" name="Costo" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="totalPrice" name="Venta" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribución de uso</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resumen por proveedor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">Proveedor</th>
                        <th className="py-2 pr-4 text-right">Servicios</th>
                        <th className="py-2 pr-4 text-right">Costo total</th>
                        <th className="py-2 pr-4 text-right">Venta total</th>
                        <th className="py-2 pr-4 text-right">Margen $</th>
                        <th className="py-2 text-right">Margen %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierStats.map(s => (
                        <tr key={s.name} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{s.name}</td>
                          <td className="py-2 pr-4 text-right">{s.services}</td>
                          <td className="py-2 pr-4 text-right">${s.totalCost.toLocaleString()}</td>
                          <td className="py-2 pr-4 text-right">${s.totalPrice.toLocaleString()}</td>
                          <td className={`py-2 pr-4 text-right ${s.margin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            ${s.margin.toLocaleString()}
                          </td>
                          <td className={`py-2 text-right ${s.marginPct >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {s.marginPct.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Reports;
