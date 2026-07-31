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
  cancelled_at?: string;
  cancelled_by?: string;
  cancel_reason?: string;
}

export interface CardOperationDetails {
  id?: string;
  card_type: 'credit' | 'debit';
  brand: string;
  bank: string;
  cardholder_name: string;
  last_four: string;
  installments: number;
  calculation_method: 'percentage' | 'coefficient' | 'manual';
  base_amount: number;
  surcharge_percentage: number;
  surcharge_amount: number;
  total_charged: number;
  installment_amount: number;
  processor_fee_percentage: number;
  processor_fee_amount: number;
  net_amount: number;
  settlement_date?: string;
  status?: string;
}

export interface ReceiptItem {
  id?: string;
  amount: number;
  currency: string;
  payment_method: string;
  exchange_rate: number | null;
  service_currency: string | null;
  notes: string;
  card_details?: CardOperationDetails;
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
