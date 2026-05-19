import ExcelJS from 'exceljs';
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
  manual:     'Manual',
  system:     'Sistema',
  historical: 'Histórico',
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  receipt_item:     'Recibo',
  supplier_payment: 'Pago proveedor',
  movement:         'Movimiento',
};

const download = async (wb: ExcelJS.Workbook, filename: string) => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const byCurrencyToRows = (data: ByCurrency): [string, number][] =>
  Object.entries(data).map(([c, v]) => [c, Math.round(v * 100) / 100]);

// ── exportExchangeRatesReport ────────────────────────────────────────────────

export async function exportExchangeRatesReport(
  rows: RateLogRow[],
  monthly: RateMonthlySummary[],
  range: { from: string; to: string },
) {
  const wb = new ExcelJS.Workbook();

  // Sheet 1: Resumen mensual
  const wsSummary = wb.addWorksheet('Resumen mensual');
  wsSummary.columns = [
    { width: 13 }, { width: 13 }, { width: 15 },
    { width: 15 }, { width: 15 }, { width: 15 },
  ];
  wsSummary.addRow(['Período', 'Par', 'Promedio', 'Mínimo', 'Máximo', 'Operaciones']);
  monthly.forEach(m => {
    wsSummary.addRow([
      m.period, m.pair,
      Number(m.avg.toFixed(4)),
      Number(m.min.toFixed(4)),
      Number(m.max.toFixed(4)),
      m.count,
    ]);
  });

  // Sheet 2: Detalle
  const wsDetail = wb.addWorksheet('Detalle');
  wsDetail.columns = [
    { width: 13 }, { width: 13 }, { width: 15 }, { width: 13 }, { width: 19 },
  ];
  wsDetail.addRow(['Fecha', 'Par', 'Cotización', 'Origen', 'Tipo de operación']);
  rows.forEach(r => {
    wsDetail.addRow([
      r.rate_date,
      `${r.from_currency}→${r.to_currency}`,
      Number(Number(r.rate).toFixed(4)),
      SOURCE_LABEL[r.source] || r.source,
      SOURCE_TYPE_LABEL[r.source_type || ''] || r.source_type || '-',
    ]);
  });

  await download(wb, `tipos-de-cambio-${range.from}_a_${range.to}.xlsx`);
}

// ── exportOperationalReportToExcel ───────────────────────────────────────────

export async function exportOperationalReportToExcel(
  data: OperationalReportData,
  range: PeriodRange,
) {
  const wb          = new ExcelJS.Workbook();
  const periodLabel = `${range.from} a ${range.to}`;

  // Sheet 1: Resumen
  const wsSummary = wb.addWorksheet('Resumen');
  wsSummary.columns = [{ width: 31 }, { width: 11 }, { width: 19 }];
  wsSummary.addRow(['Reporte Operativo', '', '']);
  wsSummary.addRow(['Período', periodLabel, '']);
  wsSummary.addRow([]);
  wsSummary.addRow(['Indicador', 'Moneda', 'Monto']);

  const pushSection = (label: string, d: ByCurrency) => {
    const entries = byCurrencyToRows(d);
    if (entries.length === 0) {
      wsSummary.addRow([label, '-', 0]);
    } else {
      entries.forEach(([c, v], i) => wsSummary.addRow([i === 0 ? label : '', c, v]));
    }
  };

  pushSection('Cobranzas del período',       data.collections);
  pushSection('Pagos a proveedores',          data.supplierPayments);
  pushSection('Facturado del período',        data.invoiced);
  pushSection('Costo de expedientes período', data.costInvoiced);
  pushSection('Cuentas por cobrar',           data.receivable);
  pushSection('Cuentas por pagar',            data.payable);

  // Sheet 2: Top clientes
  const wsClients = wb.addWorksheet('Top clientes');
  wsClients.columns = [{ width: 6 }, { width: 31 }, { width: 11 }, { width: 19 }];
  wsClients.addRow(['#', 'Cliente', 'Moneda', 'Facturado YTD']);
  data.topClients.forEach((c, i) => {
    const entries = Object.entries(c.byCurrency);
    if (entries.length === 0) {
      wsClients.addRow([i + 1, c.name, '-', 0]);
    } else {
      entries.forEach(([cur, v], j) =>
        wsClients.addRow([
          j === 0 ? i + 1 : '',
          j === 0 ? c.name : '',
          cur,
          Math.round(v * 100) / 100,
        ]),
      );
    }
  });

  // Sheet 3: Top proveedores
  const wsSup = wb.addWorksheet('Top proveedores');
  wsSup.columns = [{ width: 6 }, { width: 31 }, { width: 11 }, { width: 19 }];
  wsSup.addRow(['#', 'Proveedor', 'Moneda', 'Pagado YTD']);
  data.topSuppliers.forEach((s, i) => {
    const entries = Object.entries(s.byCurrency);
    if (entries.length === 0) {
      wsSup.addRow([i + 1, s.name, '-', 0]);
    } else {
      entries.forEach(([cur, v], j) =>
        wsSup.addRow([
          j === 0 ? i + 1 : '',
          j === 0 ? s.name : '',
          cur,
          Math.round(v * 100) / 100,
        ]),
      );
    }
  });

  await download(wb, `reporte-operativo-${range.from}_a_${range.to}.xlsx`);
}

// ── exportReportsToExcel ─────────────────────────────────────────────────────

export async function exportReportsToExcel(
  quotes: Quote[],
  supplierStats: SupplierStat[],
  currency = 'USD',
) {
  const wb       = new ExcelJS.Workbook();
  const filtered  = quotes.filter(q => getQuoteCurrency(q) === currency);
  const profitable = filtered.filter(hasCompleteCosts);
  const sym       = currency === 'ARS' ? 'ARS' : 'USD';

  // Sheet 1: Por mes
  const months: Record<string, { count: number; revenue: number; cost: number; margin: number }> = {};
  filtered.forEach(q => {
    const d   = new Date(q.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) months[key] = { count: 0, revenue: 0, cost: 0, margin: 0 };
    months[key].count++;
  });
  profitable.forEach(q => {
    const d   = new Date(q.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].revenue += q.pricing.totalPrice || 0;
      months[key].cost    += q.pricing.totalCost  || 0;
      months[key].margin  += (q.pricing.totalPrice || 0) - (q.pricing.totalCost || 0);
    }
  });
  const wsMonths = wb.addWorksheet('Por mes');
  wsMonths.columns = [
    { width: 13 }, { width: 15 }, { width: 17 }, { width: 17 }, { width: 17 },
  ];
  wsMonths.addRow(['Mes', 'Presupuestos', `Ingresos (${sym})`, `Costos (${sym})`, `Margen (${sym})`]);
  Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, v]) => wsMonths.addRow([key, v.count, v.revenue, v.cost, v.margin]));

  // Sheet 2: Por estado
  const statuses: Record<string, number> = {};
  const labels: Record<string, string>   = {
    draft: 'Borrador', sent: 'Enviado', approved: 'Aprobado', expired: 'Vencido',
  };
  filtered.forEach(q => {
    const s = labels[q.status || 'draft'] || q.status || 'draft';
    statuses[s] = (statuses[s] || 0) + 1;
  });
  const wsStatus = wb.addWorksheet('Por estado');
  wsStatus.columns = [{ width: 16 }, { width: 11 }];
  wsStatus.addRow(['Estado', 'Cantidad']);
  Object.entries(statuses).forEach(([k, v]) => wsStatus.addRow([k, v]));

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
      dests[dest].cost    += q.pricing.totalCost  || 0;
    }
  });
  const wsDest = wb.addWorksheet('Por destino');
  wsDest.columns = [
    { width: 26 }, { width: 15 }, { width: 17 }, { width: 17 }, { width: 17 },
  ];
  wsDest.addRow(['Destino', 'Presupuestos', `Ingresos (${sym})`, `Costos (${sym})`, `Margen (${sym})`]);
  Object.entries(dests)
    .sort(([, a], [, b]) => b.count - a.count)
    .forEach(([k, v]) => wsDest.addRow([k, v.count, v.revenue, v.cost, v.revenue - v.cost]));

  // Sheet 4: Por proveedor
  if (supplierStats.length > 0) {
    const wsSupplier = wb.addWorksheet('Por proveedor');
    wsSupplier.columns = [
      { width: 26 }, { width: 11 }, { width: 13 },
      { width: 19 }, { width: 19 }, { width: 19 }, { width: 11 },
    ];
    wsSupplier.addRow([
      'Proveedor', 'Servicios', 'Valorizados',
      `Costo total (${sym})`, `Venta total (${sym})`, `Margen (${sym})`, 'Margen %',
    ]);
    supplierStats.forEach(s => {
      wsSupplier.addRow([
        s.name, s.services, s.pricedServices,
        s.totalCost, s.totalPrice, s.margin,
        Math.round(s.marginPct * 10) / 10,
      ]);
    });
  }

  await download(wb, `reportes-${sym}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
