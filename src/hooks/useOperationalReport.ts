import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ReportPeriod = 'month' | 'quarter' | 'year' | 'custom';

export interface PeriodRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export function getPeriodRange(period: ReportPeriod, custom?: PeriodRange): PeriodRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (period === 'custom' && custom) return custom;

  if (period === 'month') {
    return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
  }
  if (period === 'quarter') {
    const qStart = Math.floor(m / 3) * 3;
    return { from: fmt(new Date(y, qStart, 1)), to: fmt(new Date(y, qStart + 3, 0)) };
  }
  // year
  return { from: fmt(new Date(y, 0, 1)), to: fmt(new Date(y, 11, 31)) };
}

export interface ByCurrency {
  [currency: string]: number;
}

export interface TopEntry {
  name: string;
  byCurrency: ByCurrency;
  total: number; // sum across currencies (for sort only)
}

export interface OperationalReportData {
  collections: ByCurrency;            // file_receipts within period
  supplierPayments: ByCurrency;       // file_supplier_payments within period
  invoiced: ByCurrency;               // files.total_price for files in period
  costInvoiced: ByCurrency;           // files.total_cost for files in period
  receivable: ByCurrency;             // (sum file.total_price) - (sum receipts) per currency
  payable: ByCurrency;                // (sum file_services.cost) - (sum supplier payments) per currency
  topClients: TopEntry[];             // YTD by file.total_price
  topSuppliers: TopEntry[];           // YTD by supplier_payments
  collectionsCount: number;
  paymentsCount: number;
}

const sumByCurrency = (rows: any[], amountKey = 'amount', currencyKey = 'currency'): ByCurrency => {
  const out: ByCurrency = {};
  rows.forEach(r => {
    const c = r[currencyKey] || 'USD';
    out[c] = (out[c] || 0) + Number(r[amountKey] || 0);
  });
  return out;
};

const subtractByCurrency = (a: ByCurrency, b: ByCurrency): ByCurrency => {
  const out: ByCurrency = { ...a };
  Object.entries(b).forEach(([c, v]) => {
    out[c] = (out[c] || 0) - v;
  });
  return out;
};

export function useOperationalReport(period: ReportPeriod, custom?: PeriodRange) {
  const { user } = useAuth();
  const range = getPeriodRange(period, custom);

  return useQuery({
    queryKey: ['operational-report', user?.id, period, range.from, range.to],
    queryFn: async (): Promise<OperationalReportData> => {
      if (!user) {
        return {
          collections: {}, supplierPayments: {}, invoiced: {}, costInvoiced: {},
          receivable: {}, payable: {}, topClients: [], topSuppliers: [],
          collectionsCount: 0, paymentsCount: 0,
        };
      }

      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);

      const [receiptsRes, paymentsRes, filesPeriodRes, filesYTDRes, allReceiptsRes, allPaymentsRes, servicesRes] = await Promise.all([
        // Collections in period
        supabase
          .from('file_receipts')
          .select('amount, currency, payment_date, file_id, client_name')
          .eq('user_id', user.id)
          .gte('payment_date', range.from)
          .lte('payment_date', range.to),
        // Supplier payments in period
        supabase
          .from('file_supplier_payments')
          .select('amount, currency, payment_date, supplier_name, supplier_id')
          .eq('user_id', user.id)
          .gte('payment_date', range.from)
          .lte('payment_date', range.to),
        // Files in period (for invoiced)
        supabase
          .from('files')
          .select('id, total_price, total_cost, currency, client_name, created_at')
          .eq('user_id', user.id)
          .gte('created_at', range.from + 'T00:00:00')
          .lte('created_at', range.to + 'T23:59:59'),
        // Files YTD (for top clients)
        supabase
          .from('files')
          .select('id, total_price, currency, client_name, created_at')
          .eq('user_id', user.id)
          .gte('created_at', yearStart + 'T00:00:00'),
        // ALL receipts (to compute global receivable)
        supabase
          .from('file_receipts')
          .select('amount, currency, file_id')
          .eq('user_id', user.id),
        // ALL supplier payments (to compute global payable + top suppliers YTD)
        supabase
          .from('file_supplier_payments')
          .select('amount, currency, supplier_name, payment_date')
          .eq('user_id', user.id),
        // ALL services (to compute payable: cost owed)
        supabase
          .from('file_services')
          .select('cost, currency, supplier_name, supplier_id, status')
          .eq('user_id', user.id),
      ]);

      const receipts = receiptsRes.data || [];
      const payments = paymentsRes.data || [];
      const filesPeriod = filesPeriodRes.data || [];
      const filesYTD = filesYTDRes.data || [];
      const allReceipts = allReceiptsRes.data || [];
      const allPayments = allPaymentsRes.data || [];
      const allServices = servicesRes.data || [];

      const collections = sumByCurrency(receipts);
      const supplierPayments = sumByCurrency(payments);
      const invoiced = sumByCurrency(filesPeriod, 'total_price');
      const costInvoiced = sumByCurrency(filesPeriod, 'total_cost');

      // Receivable = sum(all files.total_price) - sum(all receipts) per currency
      const allFilesRes = await supabase
        .from('files')
        .select('total_price, currency, status')
        .eq('user_id', user.id)
        .neq('status', 'cancelled');
      const allFiles = allFilesRes.data || [];
      const totalInvoicedAll = sumByCurrency(allFiles, 'total_price');
      const totalCollectedAll = sumByCurrency(allReceipts);
      const receivable = subtractByCurrency(totalInvoicedAll, totalCollectedAll);

      // Payable = sum(file_services.cost) - sum(all supplier payments)
      const totalCostAll = sumByCurrency(
        allServices.filter(s => s.status !== 'cancelled'),
        'cost',
      );
      const totalPaidAll = sumByCurrency(allPayments);
      const payable = subtractByCurrency(totalCostAll, totalPaidAll);

      // Top clients YTD by file.total_price
      const clientMap = new Map<string, ByCurrency>();
      filesYTD.forEach((f: any) => {
        const name = f.client_name || 'Sin nombre';
        const c = f.currency || 'USD';
        const m = clientMap.get(name) || {};
        m[c] = (m[c] || 0) + Number(f.total_price || 0);
        clientMap.set(name, m);
      });
      const topClients: TopEntry[] = Array.from(clientMap.entries())
        .map(([name, byCurrency]) => ({
          name,
          byCurrency,
          total: Object.values(byCurrency).reduce((a, b) => a + b, 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Top suppliers YTD by supplier_payments amount
      const supplierMap = new Map<string, ByCurrency>();
      allPayments
        .filter((p: any) => p.payment_date >= yearStart)
        .forEach((p: any) => {
          const name = p.supplier_name || 'Sin nombre';
          const c = p.currency || 'USD';
          const m = supplierMap.get(name) || {};
          m[c] = (m[c] || 0) + Number(p.amount || 0);
          supplierMap.set(name, m);
        });
      const topSuppliers: TopEntry[] = Array.from(supplierMap.entries())
        .map(([name, byCurrency]) => ({
          name,
          byCurrency,
          total: Object.values(byCurrency).reduce((a, b) => a + b, 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      return {
        collections,
        supplierPayments,
        invoiced,
        costInvoiced,
        receivable,
        payable,
        topClients,
        topSuppliers,
        collectionsCount: receipts.length,
        paymentsCount: payments.length,
      };
    },
    enabled: !!user,
  });
}
