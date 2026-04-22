import * as XLSX from 'xlsx';
import { Quote } from '@/types/quote';
import { SupplierStat } from '@/hooks/useSupplierAnalytics';
import { getQuoteCurrency, hasCompleteCosts } from '@/lib/quoteFilters';
import { OperationalReportData, PeriodRange, ByCurrency } from '@/hooks/useOperationalReport';

interface RateLogRow {
  id: string;
  rate_date: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source: string;
  source_type: string | null;
  source_id: string | null;
}

interface RateMonthlySummary {
  period: string;
  pair: string;
  avg: number;
  min: number;
  max: number;
  count: number;
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

export function exportExchangeRatesReport(
  rows: RateLogRow[],
  monthly: RateMonthlySummary[],
  range: { from: string; to: string },
) {
  const wb = XLSX.utils.book_new();

  const summaryRows: any[][] = [['Período', 'Par', 'Promedio', 'Mínimo', 'Máximo', 'Operaciones']];
  monthly.forEach((m) =>
    summaryRows.push([m.period, m.pair, Number(m.avg.toFixed(4)), Number(m.min.toFixed(4)), Number(m.max.toFixed(4)), m.count]),
  );
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen mensual');

  const detailRows: any[][] = [['Fecha', 'Par', 'Cotización', 'Origen', 'Tipo de operación']];
  rows.forEach((r) =>
    detailRows.push([
      r.rate_date,
      `${r.from_currency}→${r.to_currency}`,
      Number(Number(r.rate).toFixed(4)),
      SOURCE_LABEL[r.source] || r.source,
      SOURCE_TYPE_LABEL[r.source_type || ''] || r.source_type || '-',
    ]),
  );
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle');

  XLSX.writeFile(wb, `tipos-de-cambio-${range.from}_a_${range.to}.xlsx`);
}

const byCurrencyToRows = (data: ByCurrency): [string, number][] =>
  Object.entries(data).map(([c, v]) => [c, Math.round(v * 100) / 100]);

export function exportOperationalReportToExcel(data: OperationalReportData, range: PeriodRange) {
  const wb = XLSX.utils.book_new();
  const periodLabel = `${range.from} a ${range.to}`;

  // Sheet 1: Resumen
  const summaryRows: any[][] = [
    ['Reporte Operativo', '', ''],
    ['Período', periodLabel, ''],
    ['', '', ''],
    ['Indicador', 'Moneda', 'Monto'],
  ];
  const pushSection = (label: string, d: ByCurrency) => {
    const entries = byCurrencyToRows(d);
    if (entries.length === 0) {
      summaryRows.push([label, '-', 0]);
    } else {
      entries.forEach(([c, v], i) => summaryRows.push([i === 0 ? label : '', c, v]));
    }
  };
  pushSection('Cobranzas del período', data.collections);
  pushSection('Pagos a proveedores', data.supplierPayments);
  pushSection('Facturado del período', data.invoiced);
  pushSection('Costo de expedientes período', data.costInvoiced);
  pushSection('Cuentas por cobrar', data.receivable);
  pushSection('Cuentas por pagar', data.payable);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

  // Sheet 2: Top clientes
  const clientRows: any[][] = [['#', 'Cliente', 'Moneda', 'Facturado YTD']];
  data.topClients.forEach((c, i) => {
    const entries = Object.entries(c.byCurrency);
    if (entries.length === 0) clientRows.push([i + 1, c.name, '-', 0]);
    entries.forEach(([cur, v], j) => clientRows.push([j === 0 ? i + 1 : '', j === 0 ? c.name : '', cur, Math.round(v * 100) / 100]));
  });
  const wsClients = XLSX.utils.aoa_to_sheet(clientRows);
  wsClients['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsClients, 'Top clientes');

  // Sheet 3: Top proveedores
  const supRows: any[][] = [['#', 'Proveedor', 'Moneda', 'Pagado YTD']];
  data.topSuppliers.forEach((s, i) => {
    const entries = Object.entries(s.byCurrency);
    if (entries.length === 0) supRows.push([i + 1, s.name, '-', 0]);
    entries.forEach(([cur, v], j) => supRows.push([j === 0 ? i + 1 : '', j === 0 ? s.name : '', cur, Math.round(v * 100) / 100]));
  });
  const wsSup = XLSX.utils.aoa_to_sheet(supRows);
  wsSup['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 10 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSup, 'Top proveedores');

  XLSX.writeFile(wb, `reporte-operativo-${range.from}_a_${range.to}.xlsx`);
}

export function exportReportsToExcel(quotes: Quote[], supplierStats: SupplierStat[], currency: string = 'USD') {
  const wb = XLSX.utils.book_new();
  const filtered = quotes.filter(q => getQuoteCurrency(q) === currency);
  const profitable = filtered.filter(hasCompleteCosts);
  const sym = currency === 'ARS' ? 'ARS' : 'USD';

  // Sheet 1: Resumen por mes
  const months: Record<string, { count: number; revenue: number; cost: number; margin: number }> = {};
  filtered.forEach(q => {
    const d = new Date(q.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) months[key] = { count: 0, revenue: 0, cost: 0, margin: 0 };
    months[key].count++;
  });
  profitable.forEach(q => {
    const d = new Date(q.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].revenue += q.pricing.totalPrice || 0;
      months[key].cost += q.pricing.totalCost || 0;
      months[key].margin += (q.pricing.totalPrice || 0) - (q.pricing.totalCost || 0);
    }
  });
  const monthRows = [['Mes', 'Presupuestos', `Ingresos (${sym})`, `Costos (${sym})`, `Margen (${sym})`]];
  Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).forEach(([key, v]) => {
    monthRows.push([key, v.count, v.revenue, v.cost, v.margin] as any);
  });
  const wsMonths = XLSX.utils.aoa_to_sheet(monthRows);
  wsMonths['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsMonths, 'Por mes');

  // Sheet 2: Por estado
  const statuses: Record<string, number> = {};
  const labels: Record<string, string> = { draft: 'Borrador', sent: 'Enviado', approved: 'Aprobado', expired: 'Vencido' };
  filtered.forEach(q => {
    const s = q.status || 'draft';
    statuses[labels[s] || s] = (statuses[labels[s] || s] || 0) + 1;
  });
  const statusRows = [['Estado', 'Cantidad']];
  Object.entries(statuses).forEach(([k, v]) => statusRows.push([k, v] as any));
  const wsStatus = XLSX.utils.aoa_to_sheet(statusRows);
  wsStatus['!cols'] = [{ wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsStatus, 'Por estado');

  // Sheet 3: Por destino
  const dests: Record<string, { count: number; revenue: number; cost: number }> = {};
  filtered.forEach(q => {
    const dest = q.trip.destination || 'Sin destino';
    if (!dests[dest]) dests[dest] = { count: 0, revenue: 0, cost: 0 };
    dests[dest].count++;
  });
  profitable.forEach(q => {
    const dest = q.trip.destination || 'Sin destino';
    if (dests[dest]) {
      dests[dest].revenue += q.pricing.totalPrice || 0;
      dests[dest].cost += q.pricing.totalCost || 0;
    }
  });
  const destRows = [['Destino', 'Presupuestos', `Ingresos (${sym})`, `Costos (${sym})`, `Margen (${sym})`]];
  Object.entries(dests).sort(([, a], [, b]) => b.count - a.count).forEach(([k, v]) => {
    destRows.push([k, v.count, v.revenue, v.cost, v.revenue - v.cost] as any);
  });
  const wsDest = XLSX.utils.aoa_to_sheet(destRows);
  wsDest['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsDest, 'Por destino');

  // Sheet 4: Rentabilidad por proveedor
  if (supplierStats.length > 0) {
    const supplierRows = [['Proveedor', 'Servicios', 'Valorizados', `Costo total (${sym})`, `Venta total (${sym})`, `Margen (${sym})`, 'Margen %']];
    supplierStats.forEach(s => {
      supplierRows.push([s.name, s.services, s.pricedServices, s.totalCost, s.totalPrice, s.margin, Math.round(s.marginPct * 10) / 10] as any);
    });
    const wsSupplier = XLSX.utils.aoa_to_sheet(supplierRows);
    wsSupplier['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSupplier, 'Por proveedor');
  }

  XLSX.writeFile(wb, `reportes-${sym}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
