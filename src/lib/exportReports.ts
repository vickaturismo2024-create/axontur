import * as XLSX from 'xlsx';
import { Quote } from '@/types/quote';
import { SupplierStat } from '@/hooks/useSupplierAnalytics';

export function exportReportsToExcel(quotes: Quote[], supplierStats: SupplierStat[]) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumen por mes
  const months: Record<string, { count: number; revenue: number; cost: number; margin: number }> = {};
  quotes.forEach(q => {
    const d = new Date(q.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) months[key] = { count: 0, revenue: 0, cost: 0, margin: 0 };
    months[key].count++;
    months[key].revenue += q.pricing.totalPrice || 0;
    months[key].cost += q.pricing.totalCost || 0;
    months[key].margin += (q.pricing.totalPrice || 0) - (q.pricing.totalCost || 0);
  });
  const monthRows = [['Mes', 'Presupuestos', 'Ingresos', 'Costos', 'Margen']];
  Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).forEach(([key, v]) => {
    monthRows.push([key, v.count, v.revenue, v.cost, v.margin] as any);
  });
  const wsMonths = XLSX.utils.aoa_to_sheet(monthRows);
  wsMonths['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsMonths, 'Por mes');

  // Sheet 2: Por estado
  const statuses: Record<string, number> = {};
  const labels: Record<string, string> = { draft: 'Borrador', sent: 'Enviado', approved: 'Aprobado', expired: 'Vencido' };
  quotes.forEach(q => {
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
  quotes.forEach(q => {
    const dest = q.trip.destination || 'Sin destino';
    if (!dests[dest]) dests[dest] = { count: 0, revenue: 0, cost: 0 };
    dests[dest].count++;
    dests[dest].revenue += q.pricing.totalPrice || 0;
    dests[dest].cost += q.pricing.totalCost || 0;
  });
  const destRows = [['Destino', 'Presupuestos', 'Ingresos', 'Costos', 'Margen']];
  Object.entries(dests).sort(([, a], [, b]) => b.count - a.count).forEach(([k, v]) => {
    destRows.push([k, v.count, v.revenue, v.cost, v.revenue - v.cost] as any);
  });
  const wsDest = XLSX.utils.aoa_to_sheet(destRows);
  wsDest['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsDest, 'Por destino');

  // Sheet 4: Rentabilidad por proveedor
  if (supplierStats.length > 0) {
    const supplierRows = [['Proveedor', 'Servicios', 'Costo total', 'Venta total', 'Margen $', 'Margen %']];
    supplierStats.forEach(s => {
      supplierRows.push([s.name, s.services, s.totalCost, s.totalPrice, s.margin, Math.round(s.marginPct * 10) / 10] as any);
    });
    const wsSupplier = XLSX.utils.aoa_to_sheet(supplierRows);
    wsSupplier['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsSupplier, 'Por proveedor');
  }

  XLSX.writeFile(wb, `reportes-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
