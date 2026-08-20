import { localDateStr } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Undo2 } from 'lucide-react';
import { ReceiptItem, METHODS, CURRENCIES, emptyItem } from './types';
import { computeReceiptTotals, getConvertedAmount } from '@/lib/receiptTotals';
import { supabase } from '@/integrations/supabase/client';

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (form: any, items: ReceiptItem[], totalAmount: number) => Promise<void>;
  defaultClientName: string;
  defaultCurrency: string;
  passengers?: string[];
  /** Total cobrado al cliente por moneda (para mostrar cuánto se puede devolver) */
  collectedByCurrency?: Record<string, number>;
  services?: Array<{
    id: string;
    description: string;
    price: number;
    currency: string;
    status: string;
    service_type?: string;
    supplier_name?: string;
  }>;
}

export function RefundDialog({
  open,
  onOpenChange,
  onSave,
  defaultClientName,
  defaultCurrency,
  passengers = [],
  collectedByCurrency = {},
  services = [],
}: RefundDialogProps) {
  const [form, setForm] = useState({
    client_name: defaultClientName,
    payment_date: localDateStr(),
    concept: 'Devolución al cliente',
    notes: '',
  });
  const [items, setItems] = useState<ReceiptItem[]>([{ ...emptyItem(), currency: defaultCurrency }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        client_name: defaultClientName,
        payment_date: localDateStr(),
        concept: 'Devolución al cliente',
        notes: '',
      });
      setItems([{ ...emptyItem(), currency: defaultCurrency }]);
      setSaving(false);
    }
  }, [open, defaultClientName, defaultCurrency]);

  const updateItem = (idx: number, patch: Partial<ReceiptItem>) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[idx] = { ...newItems[idx], ...patch };
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
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-destructive" />
            Nueva Devolución
            <Badge variant="destructive" className="text-[10px]">DEVOLUCIÓN</Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">Formulario para crear una devolución al cliente</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {/* Info de lo cobrado */}
          {Object.keys(collectedByCurrency).length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/20 p-3 text-sm dark:border-blue-900/30 dark:bg-blue-950/10">
              <span className="font-semibold text-blue-700 dark:text-blue-500 block mb-0.5">Total cobrado en este expediente:</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(collectedByCurrency).map(([cur, amt]) => (
                  <span key={cur} className="font-mono font-bold text-blue-800 dark:text-blue-400">
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
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Fecha de devolución</label>
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
              placeholder="Ej: Devolución parcial por cancelación de hotel"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Líneas de devolución</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setItems([...items, { ...emptyItem(), currency: defaultCurrency }])}
              >
                <PlusCircle className="mr-1 h-4 w-4" />Agregar línea
              </Button>
            </div>
            {items.map((item, idx) => {
              const hasFxConversion =
                item.service_currency &&
                item.currency &&
                item.service_currency !== item.currency &&
                item.exchange_rate &&
                Number(item.exchange_rate) > 0 &&
                Number(item.amount) > 0;

              return (
                <Card key={idx} className="p-3 border-destructive/20">
                  <div className="grid gap-3">
                    {/* Selector de servicio específico */}
                    {services && services.length > 0 && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground flex items-center justify-between">
                          <span>Vincular a Servicio a Devolver (opcional)</span>
                          {item.service_id && (
                            <span className="text-[10px] text-destructive font-semibold">Servicio Vinculado</span>
                          )}
                        </label>
                        <Select
                          value={item.service_id || 'none'}
                          onValueChange={(val) => {
                            if (val === 'none') {
                              updateItem(idx, { service_id: null, service_currency: null, exchange_rate: null });
                            } else {
                              const selectedSvc = services.find((s) => s.id === val);
                              if (selectedSvc) {
                                const newCurrency = selectedSvc.currency;
                                const patch: Partial<ReceiptItem> = {
                                  service_id: selectedSvc.id,
                                  service_currency: newCurrency,
                                };
                                if (item.currency && newCurrency && item.currency !== newCurrency && window.__liveRates) {
                                  if (item.currency === 'ARS' && newCurrency === 'USD') {
                                    const rate = window.__liveRates.find((r: any) => r.key === 'usd_blue');
                                    if (rate?.venta) patch.exchange_rate = rate.venta;
                                  } else if (item.currency === 'USD' && newCurrency === 'ARS') {
                                    const rate = window.__liveRates.find((r: any) => r.key === 'usd_blue');
                                    if (rate?.compra) patch.exchange_rate = rate.compra;
                                  }
                                } else if (item.currency === newCurrency) {
                                  patch.exchange_rate = null;
                                }
                                updateItem(idx, patch);
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="— Sin vincular (Devolución general) —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Sin vincular (Devolución general) —</SelectItem>
                            {services
                              .filter((s) => s.status !== 'cancelled')
                              .map((s) => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">
                                  [{s.currency} {Number(s.price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}] {s.description || s.service_type || 'Servicio'}{s.supplier_name ? ` (${s.supplier_name})` : ''}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium">Monto a devolver *</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateItem(idx, { amount: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Moneda</label>
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

                    {hasFxConversion && (
                      <div className="rounded bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-xs text-destructive flex items-center justify-between font-medium">
                        <span>Equivalente devuelto del servicio ({item.service_currency}):</span>
                        <span className="font-mono font-bold text-sm">
                          {item.service_currency} {getConvertedAmount(Number(item.amount), item.currency, item.service_currency, Number(item.exchange_rate)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notas</label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="destructive"
          >
            {saving ? 'Generando...' : 'Generar devolución'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
