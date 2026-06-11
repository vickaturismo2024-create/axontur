import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Plus, Check, ChevronsUpDown, CheckCircle2, AlertTriangle, Trash2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupplierPayment, CatalogSupplier, METHODS, CURRENCIES, isGenericName } from './types';

interface PaymentLine {
  amount: number;
  currency: string;
  payment_method: string;
  reference: string;
  notes: string;
}

interface SupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPayment: SupplierPayment | null;
  selectedSupplier: { name: string; id: string | null } | null;
  resolvedSupplierId: string | null;
  setResolvedSupplierId: (id: string | null) => void;
  autoMatched: boolean;
  setAutoMatched: (val: boolean) => void;
  catalog: CatalogSupplier[];
  findCatalogMatch: (name: string) => CatalogSupplier | null;
  createSupplierFromName: (name: string) => void;
  form?: any; // kept for TS compatibility if needed, but not used inside
  setForm?: (form: any) => void; // kept for TS compatibility
  comboOpen: boolean;
  setComboOpen: (open: boolean) => void;
  onSave: (lines: PaymentLine[], paymentDate: string) => void;
  defaultCurrency?: string;
  supplierCosts?: Record<string, number>;
  supplierPaid?: Record<string, number>;
}

export function SupplierPaymentDialog({
  open,
  onOpenChange,
  editingPayment,
  selectedSupplier,
  resolvedSupplierId,
  setResolvedSupplierId,
  autoMatched,
  setAutoMatched,
  catalog,
  findCatalogMatch,
  createSupplierFromName,
  comboOpen,
  setComboOpen,
  onSave,
  defaultCurrency = 'USD',
  supplierCosts = {},
  supplierPaid = {},
}: SupplierPaymentDialogProps) {
  const resolvedSupplierName = catalog.find(c => c.id === resolvedSupplierId)?.name;
  const showCreateOption = selectedSupplier && !findCatalogMatch(selectedSupplier.name);

  const debtsByCurrency = selectedSupplier ? Object.keys(supplierCosts || {}).reduce((acc, cur) => {
    const cost = supplierCosts?.[cur] || 0;
    const paid = supplierPaid?.[cur] || 0;
    const pending = cost - paid;
    if (pending !== 0) {
      acc[cur] = pending;
    }
    return acc;
  }, {} as Record<string, number>) : {};

  // Local state for multi-line payments
  const [paymentDate, setPaymentDate] = useState('');
  const [lines, setLines] = useState<PaymentLine[]>([]);

  useEffect(() => {
    if (open) {
      setPaymentDate(editingPayment?.payment_date || new Date().toISOString().split('T')[0]);
      if (editingPayment) {
        setLines([
          {
            amount: editingPayment.amount,
            currency: editingPayment.currency,
            payment_method: editingPayment.payment_method || 'transfer',
            reference: editingPayment.reference || '',
            notes: editingPayment.notes || '',
          },
        ]);
      } else {
        setLines([
          {
            amount: 0,
            currency: defaultCurrency,
            payment_method: 'transfer',
            reference: '',
            notes: '',
          },
        ]);
      }
    }
  }, [open, editingPayment, defaultCurrency]);

  const updateLine = (idx: number, patch: Partial<PaymentLine>) => {
    setLines((prev) => prev.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln)));
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        amount: 0,
        currency: defaultCurrency,
        payment_method: 'transfer',
        reference: '',
        notes: '',
      },
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const validLines = lines.filter((l) => l.amount !== 0);
    if (validLines.length === 0) return;
    onSave(validLines, paymentDate);
  };

  const hasValidAmount = lines.some((l) => l.amount !== 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingPayment ? 'Editar pago' : 'Registrar pago'} a {selectedSupplier?.name}</DialogTitle>
        </DialogHeader>

        {editingPayment && isGenericName(editingPayment.supplier_name) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Este proveedor parece genérico. Cambialo por el operador real para que el saldo se refleje en su cuenta corriente.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {selectedSupplier && Object.keys(debtsByCurrency).length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/20 p-3 text-sm dark:border-amber-900/30 dark:bg-amber-950/10">
              <span className="font-semibold text-amber-700 dark:text-amber-500 block mb-0.5">Saldo pendiente con este operador:</span>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(debtsByCurrency).map(([cur, amt]) => (
                  <span key={cur} className="font-mono font-bold text-amber-800 dark:text-amber-400">
                    {cur} {amt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Proveedor del catálogo */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Proveedor del catálogo *</label>
            {resolvedSupplierId && autoMatched ? (
              <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/10 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">Enlazado a: {resolvedSupplierName}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setResolvedSupplierId(null); setAutoMatched(false); }}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn('w-full justify-between', !resolvedSupplierId && 'text-muted-foreground')}
                  >
                    {resolvedSupplierId ? resolvedSupplierName : 'Seleccionar o crear proveedor...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar proveedor..." />
                    <CommandList>
                      <CommandEmpty>
                        {selectedSupplier && (
                          <button
                            type="button"
                            onClick={() => createSupplierFromName(selectedSupplier.name)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            <Plus className="mr-2 inline h-4 w-4" />
                            Crear «{selectedSupplier.name}»
                          </button>
                        )}
                      </CommandEmpty>
                      {showCreateOption && selectedSupplier && (
                        <CommandGroup>
                          <CommandItem
                            value={`__create__${selectedSupplier.name}`}
                            onSelect={() => createSupplierFromName(selectedSupplier.name)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Crear «{selectedSupplier.name}»
                          </CommandItem>
                        </CommandGroup>
                      )}
                      <CommandGroup heading="Catálogo">
                        {catalog.map(s => (
                          <CommandItem
                            key={s.id}
                            value={s.name}
                            onSelect={() => { setResolvedSupplierId(s.id); setAutoMatched(false); setComboOpen(false); }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', resolvedSupplierId === s.id ? 'opacity-100' : 'opacity-0')} />
                            {s.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            <p className="text-[11px] text-muted-foreground">
              Sin enlazar al catálogo, el pago no aparece en la cuenta corriente del proveedor.
            </p>
          </div>

          {/* Fecha de pago común */}
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha de pago</label>
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>

          {/* Líneas de pago */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Líneas de pago</label>
              {!editingPayment && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addLine}
                  className="h-8 px-2 text-primary"
                >
                  <PlusCircle className="mr-1 h-4 w-4" /> Agregar línea
                </Button>
              )}
            </div>

            {lines.map((line, idx) => (
              <Card key={idx} className="p-3 bg-muted/20 border-border/60">
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium">Monto *</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.amount || ''}
                          placeholder="Monto"
                          onChange={e => updateLine(idx, { amount: Number(e.target.value) })}
                          className="h-9"
                        />
                        <Select value={line.currency} onValueChange={v => updateLine(idx, { currency: v })}>
                          <SelectTrigger className="w-24 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Método</label>
                      <Select value={line.payment_method} onValueChange={v => updateLine(idx, { payment_method: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-11">
                      <label className="mb-1 block text-xs font-medium">Referencia / Notas de esta línea</label>
                      <Input
                        value={line.reference}
                        placeholder="Nro. transferencia o referencia (opcional)"
                        onChange={e => updateLine(idx, { reference: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-1 flex items-end justify-center pb-0.5">
                      {lines.length > 1 && !editingPayment && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => removeLine(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Button
            onClick={handleSave}
            disabled={!resolvedSupplierId || !hasValidAmount}
            className="w-full mt-4"
          >
            {editingPayment ? 'Guardar cambios' : 'Registrar pago(s)'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
