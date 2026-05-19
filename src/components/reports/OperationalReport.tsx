import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Download } from 'lucide-react';
import { useOperationalReport, ReportPeriod, getPeriodRange, ByCurrency } from '@/hooks/useOperationalReport';
import { exportOperationalReportToExcel } from '@/lib/exportReports';
import { toast } from 'sonner';

const formatByCurrency = (data: ByCurrency, prefix = '') => {
  const entries = Object.entries(data).filter(([, v]) => Math.abs(v) > 0.01);
  if (entries.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
  return (
    <div className="flex flex-col">
      {entries.map(([c, v]) => (
        <span key={c} className="text-lg font-bold leading-tight">
          {prefix}{c} {v.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      ))}
    </div>
  );
};

export function OperationalReport() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const customRange = period === 'custom' && customFrom && customTo
    ? { from: customFrom, to: customTo }
    : undefined;

  const { data, isLoading } = useOperationalReport(period, customRange);
  const range = getPeriodRange(period, customRange);

  const handleExport = async () => {
    if (!data) return;
    await exportOperationalReportToExcel(data, range);
    toast.success('Reporte operativo exportado');
  };

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Período</Label>
                <Tabs value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
                  <TabsList>
                    <TabsTrigger value="month">Mes</TabsTrigger>
                    <TabsTrigger value="quarter">Trimestre</TabsTrigger>
                    <TabsTrigger value="year">Año</TabsTrigger>
                    <TabsTrigger value="custom">Personalizado</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {period === 'custom' && (
                <div className="flex gap-2 items-end">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Desde</Label>
                    <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-40" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Hasta</Label>
                    <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-40" />
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {range.from} → {range.to}
              </p>
            </div>
            <Button onClick={handleExport} disabled={!data || isLoading} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading || !data ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Cargando reporte...</CardContent>
        </Card>
      ) : (
        <>
          {/* Cards: collections, payments, A/R, A/P */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-green-600" /> Cobranzas del período
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formatByCurrency(data.collections)}
                <p className="text-xs text-muted-foreground mt-1">{data.collectionsCount} recibo(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <TrendingDown className="h-4 w-4 text-orange-600" /> Pagos a proveedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formatByCurrency(data.supplierPayments)}
                <p className="text-xs text-muted-foreground mt-1">{data.paymentsCount} pago(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Wallet className="h-4 w-4 text-blue-600" /> Cuentas por cobrar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formatByCurrency(data.receivable)}
                <p className="text-xs text-muted-foreground mt-1">Saldo global de clientes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-destructive" /> Cuentas por pagar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formatByCurrency(data.payable)}
                <p className="text-xs text-muted-foreground mt-1">Saldo global a proveedores</p>
              </CardContent>
            </Card>
          </div>

          {/* Period summary: facturado vs cobrado */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Facturación del período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Facturado</span>
                  {formatByCurrency(data.invoiced)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cobrado</span>
                  {formatByCurrency(data.collections)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Costos vs pagos del período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Costo expedientes</span>
                  {formatByCurrency(data.costInvoiced)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pagado a proveedores</span>
                  {formatByCurrency(data.supplierPayments)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top clients & suppliers */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top 10 clientes (YTD)</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin datos</p>
                ) : (
                  <div className="space-y-1">
                    {data.topClients.map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                          <span className="font-medium truncate">{c.name}</span>
                        </span>
                        <span className="text-right shrink-0 ml-2">
                          {Object.entries(c.byCurrency).map(([cur, v]) => (
                            <div key={cur} className="text-xs">
                              {cur} {v.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </div>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top 10 proveedores por gasto (YTD)</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topSuppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sin datos</p>
                ) : (
                  <div className="space-y-1">
                    {data.topSuppliers.map((s, i) => (
                      <div key={s.name} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                          <span className="font-medium truncate">{s.name}</span>
                        </span>
                        <span className="text-right shrink-0 ml-2">
                          {Object.entries(s.byCurrency).map(([cur, v]) => (
                            <div key={cur} className="text-xs">
                              {cur} {v.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </div>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
