import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useQuotes } from '@/contexts/QuotesContext';
import { useSupplierAnalytics } from '@/hooks/useSupplierAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3, Download } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { exportReportsToExcel } from '@/lib/exportReports';
import { OperationalReport } from '@/components/reports/OperationalReport';
import { ExchangeRatesReport } from '@/components/reports/ExchangeRatesReport';
import { toast } from 'sonner';
import { getAvailableCurrencies, getDefaultCurrency } from '@/lib/quoteFilters';

const CHART_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658',
  '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042',
];

const Reports = () => {
  const { quotes } = useQuotes();
  const availableCurrencies = useMemo(() => getAvailableCurrencies(quotes), [quotes]);
  const defaultCurrency = useMemo(() => getDefaultCurrency(quotes), [quotes]);
  const [currency, setCurrency] = useState<string | null>(null);
  const [tab, setTab] = useState('profitability');

  const activeCurrency = currency || defaultCurrency;
  const supplierStats = useSupplierAnalytics(quotes, activeCurrency);
  const currencySymbol = activeCurrency === 'ARS' ? 'ARS ' : 'US$';

  const top10 = supplierStats.slice(0, 10);
  const pieData = supplierStats.slice(0, 8).map(s => ({ name: s.name, value: s.services }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Botón Volver al Dashboard */}
        <Button asChild variant="ghost" className="gap-2 mb-4 hover:bg-muted/50 shrink-0">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
          </Link>
        </Button>

        <div className="mb-6">
          <h1 className="font-sans text-3xl font-bold text-foreground">Reportes</h1>
          <p className="mt-1 text-muted-foreground">Análisis de rentabilidad y métricas de tu negocio</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profitability">Rentabilidad</TabsTrigger>
            <TabsTrigger value="operational">Operativo</TabsTrigger>
            <TabsTrigger value="exchange">Tipos de Cambio</TabsTrigger>
          </TabsList>

          <TabsContent value="profitability" className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {availableCurrencies.length > 1 && (
                <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
                  {availableCurrencies.map(c => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeCurrency === c
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <Button onClick={async () => { await exportReportsToExcel(quotes, supplierStats, activeCurrency); toast.success('Reporte exportado'); }} className="ml-auto">
                <Download className="mr-2 h-4 w-4" /> Exportar a Excel
              </Button>
            </div>

            <div>
              <h2 className="font-sans text-xl font-semibold mb-4 text-foreground">Análisis general</h2>
              <DashboardCharts quotes={quotes} currency={activeCurrency} />
            </div>

            {supplierStats.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay datos de proveedores con costos completos en {activeCurrency}.</p>
                  <p className="text-sm mt-1">Cargá servicios con proveedor y costos netos en tus presupuestos para ver el análisis.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <h2 className="font-sans text-xl font-semibold mb-4 text-foreground">Rentabilidad por proveedor ({activeCurrency})</h2>
                <div className="grid gap-6 lg:grid-cols-2 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-sans text-base font-semibold">Top proveedores por volumen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={top10} layout="vertical" margin={{ left: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={v => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => `${currencySymbol}${v.toLocaleString()}`} />
                          <Bar dataKey="totalCost" name="Costo" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="totalPrice" name="Venta" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                          <Legend />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-sans text-base font-semibold">Distribución de uso</CardTitle>
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
                    <CardTitle className="font-sans text-base font-semibold">Resumen por proveedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm stack-table">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-4">Proveedor</th>
                            <th className="py-2 pr-4 text-right">Servicios</th>
                            <th className="py-2 pr-4 text-right">Valorizados</th>
                            <th className="py-2 pr-4 text-right">Costo total ({activeCurrency})</th>
                            <th className="py-2 pr-4 text-right">Venta total ({activeCurrency})</th>
                            <th className="py-2 pr-4 text-right">Margen {activeCurrency}</th>
                            <th className="py-2 text-right">Margen %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplierStats.map(s => (
                            <tr key={s.name} className="border-b last:border-0">
                              <td data-label="Proveedor" className="py-2 pr-4 font-medium">{s.name}</td>
                              <td data-label="Servicios" className="py-2 pr-4 text-right">{s.services}</td>
                              <td data-label="Valorizados" className="py-2 pr-4 text-right">{s.pricedServices}</td>
                              <td data-label={`Costo (${activeCurrency})`} className="py-2 pr-4 text-right">{currencySymbol}{s.totalCost.toLocaleString()}</td>
                              <td data-label={`Venta (${activeCurrency})`} className="py-2 pr-4 text-right">{currencySymbol}{s.totalPrice.toLocaleString()}</td>
                              <td data-label={`Margen ${activeCurrency}`} className={`py-2 pr-4 text-right ${s.margin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                {currencySymbol}{s.margin.toLocaleString()}
                              </td>
                              <td data-label="Margen %" className={`py-2 text-right ${s.marginPct >= 0 ? 'text-green-600' : 'text-destructive'}`}>
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
          </TabsContent>

          <TabsContent value="operational">
            <OperationalReport />
          </TabsContent>

          <TabsContent value="exchange">
            <ExchangeRatesReport />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Reports;
