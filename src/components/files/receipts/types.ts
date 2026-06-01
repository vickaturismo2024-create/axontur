export interface Receipt {
  id: string;
  receipt_number: number;
  client_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_date: string;
  concept: string;
  notes: string;
  status: string;
  created_at: string;
}

export interface ReceiptItem {
  id?: string;
  amount: number;
  currency: string;
  payment_method: string;
  exchange_rate: number | null;
  service_currency: string | null;
  notes: string;
}

export const METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit_card', label: 'Tarjeta de Crédito' },
  { value: 'debit_card', label: 'Tarjeta de Débito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' },
];

export const CURRENCIES = ['USD', 'ARS', 'EUR', 'BRL'];

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  issued: 'Emitido',
  paid: 'Pagado',
  cancelled: 'Anulado',
};

export const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  issued: 'default',
  paid: 'outline',
  cancelled: 'destructive',
};

export const emptyItem = (): ReceiptItem => ({
  amount: 0,
  currency: 'USD',
  payment_method: 'transfer',
  exchange_rate: null,
  service_currency: null,
  notes: '',
});
