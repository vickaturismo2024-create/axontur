export interface ServiceRecord {
  supplier_name: string;
  supplier_id: string | null;
  cost: number;
  currency: string;
  status: string;
}

export interface SupplierPayment {
  id: string;
  supplier_name: string;
  supplier_id: string | null;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  reference: string;
  notes: string;
}

export interface CatalogSupplier {
  id: string;
  name: string;
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

export const GENERIC_NAMES = ['operador', 'proveedor', 'sin nombre', '-', ''];
export const isGenericName = (name?: string) => GENERIC_NAMES.includes((name || '').trim().toLowerCase());
