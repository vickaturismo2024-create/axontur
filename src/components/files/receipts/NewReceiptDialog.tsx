import { localDateStr } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, CreditCard } from 'lucide-react';
import { ReceiptItem, METHODS, CURRENCIES, emptyItem, CardOperationDetails } from './types';
import { computeReceiptTotals } from '@/lib/receiptTotals';
import { supabase } from '@/integrations/supabase/client';
import { CardDetailsDialog } from './CardDetailsDialog';

declare global {
  interface Window {
    __liveRates?: any[];
  }
}

interface NewReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (form: any, items: ReceiptItem[], totalAmount: number) => Promise<void>;
  defaultClientName: string;
  defaultCurrency: string;
  passengers?: string[];
  fileDebts?: Record<string, number>;
}

export function NewReceiptDialog({ open, onOpenChange, onSave, defaultClientName, defaultCurrency, passengers = [], fileDebts = {} }: NewReceiptDialogProps) {
  const [form, setForm] = useState({
    client_name: defaultClientName,
    payment_date: localDateStr(),
    concept: '',
    notes: '',
  });
  const [items, setItems] = useState<ReceiptItem[]>([{ ...emptyItem(), currency: defaultCurrency }]);
  const [saving, setSaving] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        client_name: defaultClientName,
        payment_date: localDateStr(),
        concept: '',
        notes: '',
      });
      setItems([{ ...emptyItem(), currency: defaultCurrency }]);
      setSaving(false);
      
      // Auto-fetch current rates for autofill
      supabase.functions.invoke('fetch-currency-rates').then(({ data, error }) => {
        if (!error && data?.rates) {
          window.__liveRates = data.rates;
        }
      });
    }
  }, [open, defaultClientName, defaultCurrency]);

  const updateItem = (idx: number, patch: Partial<ReceiptItem>) => {
    setItems((prev) => {
      const newItems = [...prev];
      const current = newItems[idx];
      const updated = { ...current, ...patch };
      
      // Auto-fill exchange rate if currencies are changed and live rates are available
      if (patch.currency !== undefined || patch.service_currency !== undefined) {
        if (updated.currency && updated.service_currency && updated.currency !== updated.service_currency && window.__liveRates) {
          if (updated.currency === 'ARS' && updated.service_currency === 'USD') {
            const rate = window.__liveRates.find((r: any) => r.key === 'usd_blue');
            if (rate?.venta) updated.exchange_rate = rate.venta;
          } else if (updated.currency === 'USD' && updated.service_currency === 'ARS') {
            const rate = window.__liveRates.find((r: any) => r.key === 'usd_blue');
            if (rate?.compra) updated.exchange_rate = rate.compra;
          }
        }
      }
      
      newItems[idx] = updated;
      return newItems;
    });
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const mainCurrencyForForm = items[0]?.currency || defaultCurrency;
  const totals = computeReceiptTotals(items, mainCurrencyForForm);
  const totalAmount = totals.convertedTotal;

  const handleSave = async () => {
    setSaving(true);
    await onSave(form, items, totalAmount);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo recibo</DialogTitle>
          <DialogDescription className="sr-only">Formulario para crear un nuevo recibo</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {fileDebts && Object.keys(fileDebts).length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/20 p-3 text-sm dark:border-amber-900/30 dark:bg-amber-950/10">
              <span className="font-semibold text-amber-700 dark:text-amber-500 block mb-0.5">Saldo pendiente del expediente:</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(fileDebts).map(([cur, amt]) => (
                  <span key={cur} className="font-mono font-bold text-amber-800 dark:text-amber-400">
                    {cur} {amt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                ))}
              </div>
            </div>
          )}

          {passengers && passengers.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Pasajero del Expediente</label>
              <Select
                value={passengers.includes(form.client_name) ? form.client_name : ""}
                onValueChange={(value) => setForm({ ...form, client_name: value })}
              >
                <SelectTrigger className="w-full bg-background/50 border-input/60 hover:border-accent-foreground/50 transition-colors">
                  <SelectValue placeholder="Seleccionar titular o pasajero..." />
                </SelectTrigger>
                <SelectContent>
                  {passengers.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Nombre en Recibo</label>
              <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Fecha de pago</label>
              <Input
                type="date"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Concepto *</label>
            <Input
              value={form.concept}
              onChange={(e) => setForm({ ...form, concept: e.target.value })}
              placeholder="Ej: Seña paquete Caribe"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Líneas de pago</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setItems([...items, { ...emptyItem(), currency: defaultCurrency }])}
              >
                <PlusCircle className="mr-1 h-4 w-4" />Agregar línea
              </Button>
            </div>
            {items.map((item, idx) => (
              <Card key={idx} className="p-3">
                <div className="grid gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium">Monto *</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateItem(idx, { amount: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Moneda pago</label>
                      <Select value={item.currency} onValueChange={(v) => updateItem(idx, { currency: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Método</label>
                      <Select
                        value={item.payment_method}
                        onValueChange={(v) => updateItem(idx, { payment_method: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium">Moneda servicio</label>
                      <Select
                        value={item.service_currency || ''}
                        onValueChange={(v) => updateItem(idx, { service_currency: v === 'none' ? null : v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Sin conversión</SelectItem>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Cotización</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Ej: 1200"
                        value={item.exchange_rate ?? ''}
                        onChange={(e) =>
                          updateItem(idx, { exchange_rate: e.target.value ? Number(e.target.value) : null })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 text-destructive"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {(item.payment_method === 'credit_card' || item.payment_method === 'debit_card') && (
                    <div className="border-t pt-2 mt-1">
                      {item.card_details ? (
                        <div className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-xs border">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <p className="font-semibold">
                                {item.card_details.brand} {item.card_details.card_type === 'credit' ? 'Crédito' : 'Débito'}{' '}
                                {item.card_details.bank && `(${item.card_details.bank})`}{' '}
                                {item.card_details.last_four && `**** ${item.card_details.last_four}`}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.card_details.installments} {item.card_details.installments === 1 ? 'cuota' : 'cuotas de ' + item.currency + ' ' + item.card_details.installment_amount.toLocaleString()} · Total Tarjeta: {item.currency} {item.card_details.total_charged.toLocaleString()} (Base viaje: {item.currency} {item.card_details.base_amount.toLocaleString()})
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setActiveCardIndex(idx)}
                          >
                            Editar Tarjeta
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1 border-dashed text-primary border-primary/40 hover:bg-primary/5"
                          onClick={() => setActiveCardIndex(idx)}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Configurar Cuotas, Recargo y Datos de Tarjeta
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notas</label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Generando...' : 'Generar recibo'}</Button>
        </div>
      </DialogContent>

      {activeCardIndex !== null && (
        <CardDetailsDialog
          open={activeCardIndex !== null}
          onOpenChange={(open) => { if (!open) setActiveCardIndex(null); }}
          initialBaseAmount={items[activeCardIndex]?.amount || 0}
          currency={items[activeCardIndex]?.currency || defaultCurrency}
          initialDetails={items[activeCardIndex]?.card_details}
          onSave={(details) => {
            if (activeCardIndex !== null) {
              updateItem(activeCardIndex, {
                card_details: details,
                amount: details.base_amount || items[activeCardIndex].amount,
              });
            }
          }}
        />
      )}
    </Dialog>
  );
}
