import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Calculator, DollarSign, ShieldCheck } from 'lucide-react';
import { CardOperationDetails } from './types';

interface CardDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBaseAmount: number;
  currency: string;
  initialDetails?: CardOperationDetails;
  onSave: (details: CardOperationDetails) => void;
}

const CARD_BRANDS = ['Visa', 'Mastercard', 'Amex', 'Cabal', 'Naranja', 'Maestro', 'Otra'];
const INSTALLMENT_OPTIONS = [1, 2, 3, 6, 9, 12, 18, 24];

export function CardDetailsDialog({
  open,
  onOpenChange,
  initialBaseAmount,
  currency,
  initialDetails,
  onSave,
}: CardDetailsDialogProps) {
  const [details, setDetails] = useState<CardOperationDetails>({
    card_type: 'credit',
    brand: 'Visa',
    bank: '',
    cardholder_name: '',
    last_four: '',
    installments: 1,
    calculation_method: 'percentage',
    base_amount: initialBaseAmount || 0,
    surcharge_percentage: 0,
    surcharge_amount: 0,
    total_charged: initialBaseAmount || 0,
    installment_amount: initialBaseAmount || 0,
    processor_fee_percentage: 0,
    processor_fee_amount: 0,
    net_amount: initialBaseAmount || 0,
  });

  useEffect(() => {
    if (open) {
      if (initialDetails) {
        setDetails(initialDetails);
      } else {
        const base = initialBaseAmount || 0;
        setDetails({
          card_type: 'credit',
          brand: 'Visa',
          bank: '',
          cardholder_name: '',
          last_four: '',
          installments: 1,
          calculation_method: 'percentage',
          base_amount: base,
          surcharge_percentage: 0,
          surcharge_amount: 0,
          total_charged: base,
          installment_amount: base,
          processor_fee_percentage: 0,
          processor_fee_amount: 0,
          net_amount: base,
        });
      }
    }
  }, [open, initialBaseAmount, initialDetails]);

  // Recalculate financial breakdown
  const recalculate = (patch: Partial<CardOperationDetails>) => {
    const updated = { ...details, ...patch };
    const base = Number(updated.base_amount) || 0;
    const installments = Math.max(1, Number(updated.installments) || 1);

    let surchargeAmt = 0;
    let total = base;

    if (updated.calculation_method === 'percentage') {
      const pct = Number(updated.surcharge_percentage) || 0;
      surchargeAmt = base * (pct / 100);
      total = base + surchargeAmt;
    } else if (updated.calculation_method === 'manual') {
      surchargeAmt = Number(updated.surcharge_amount) || 0;
      total = base + surchargeAmt;
    }

    const perInstallment = total / installments;
    const feePct = Number(updated.processor_fee_percentage) || 0;
    const feeAmt = total * (feePct / 100);
    const net = total - feeAmt;

    setDetails({
      ...updated,
      base_amount: base,
      surcharge_amount: Math.round(surchargeAmt * 100) / 100,
      total_charged: Math.round(total * 100) / 100,
      installment_amount: Math.round(perInstallment * 100) / 100,
      processor_fee_amount: Math.round(feeAmt * 100) / 100,
      net_amount: Math.round(net * 100) / 100,
    });
  };

  const handleSave = () => {
    onSave(details);
    onOpenChange(false);
  };

  const fmt = (val: number) =>
    val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Detalle de Cobro con Tarjeta
          </DialogTitle>
          <DialogDescription className="text-xs">
            Desglose de cuotas, recargo financiero y neto de la operación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs pt-1">
          {/* Alerta de Seguridad PCI-DSS */}
          <div className="rounded-md bg-muted/60 p-2.5 border text-muted-foreground flex items-center gap-2 text-[11px]">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              <strong>PCI-DSS Compliant:</strong> Solo se guardan datos de referencia (marca, banco, últimos 4 dígitos). Nunca ingrese el número completo ni CVV.
            </span>
          </div>

          {/* Tipo, Marca y Banco */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select
                value={details.card_type}
                onValueChange={(v) => recalculate({ card_type: v as any })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Marca</Label>
              <Select
                value={details.brand}
                onValueChange={(v) => recalculate({ brand: v })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Banco Emisor</Label>
              <Input
                placeholder="Ej: Galicia"
                value={details.bank}
                onChange={(e) => recalculate({ bank: e.target.value })}
                className="h-8"
              />
            </div>
          </div>

          {/* Titular y ÚLtimos 4 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Titular de la Tarjeta</Label>
              <Input
                placeholder="Nombre del titular"
                value={details.cardholder_name}
                onChange={(e) => recalculate({ cardholder_name: e.target.value })}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Últimos 4 dígitos</Label>
              <Input
                placeholder="4321"
                maxLength={4}
                value={details.last_four}
                onChange={(e) =>
                  recalculate({ last_four: e.target.value.replace(/\D/g, '') })
                }
                className="h-8 font-mono"
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Plan de Cuotas y Cálculo de Recargo */}
          <div className="space-y-3">
            <h4 className="font-semibold text-xs flex items-center gap-1">
              <Calculator className="h-3.5 w-3.5 text-primary" />
              Plan de Cuotas y Financiación
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cuotas</Label>
                <Select
                  value={String(details.installments)}
                  onValueChange={(v) => recalculate({ installments: Number(v) })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTALLMENT_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? 'cuota (pago único)' : 'cuotas'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Monto Base Imputado (Viaje)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={details.base_amount}
                  onChange={(e) => recalculate({ base_amount: Number(e.target.value) })}
                  className="h-8 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">% Recargo Financiero</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={details.surcharge_percentage}
                    onChange={(e) =>
                      recalculate({ surcharge_percentage: Number(e.target.value) })
                    }
                    className="h-8 font-mono"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">$ Recargo Financiero</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={details.surcharge_amount}
                  onChange={(e) => {
                    const amt = Number(e.target.value);
                    const pct = details.base_amount > 0 ? (amt / details.base_amount) * 100 : 0;
                    recalculate({
                      calculation_method: 'manual',
                      surcharge_amount: amt,
                      surcharge_percentage: Math.round(pct * 10) / 10,
                    });
                  }}
                  className="h-8 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t">
              <div>
                <Label className="text-xs">% Comisión Procesador (Posnet)</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={details.processor_fee_percentage}
                    onChange={(e) =>
                      recalculate({ processor_fee_percentage: Number(e.target.value) })
                    }
                    className="h-8 font-mono"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Fecha est. acreditación</Label>
                <Input
                  type="date"
                  value={details.settlement_date || ''}
                  onChange={(e) => recalculate({ settlement_date: e.target.value })}
                  className="h-8"
                />
              </div>
            </div>
          </div>

          {/* Resumen Financiero Calculado */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Monto imputado al viaje:</span>
              <span className="font-semibold">{currency} {fmt(details.base_amount)}</span>
            </div>
            {details.surcharge_amount > 0 && (
              <div className="flex justify-between items-center text-xs text-amber-600 font-medium">
                <span>+ Recargo financiero:</span>
                <span>+{currency} {fmt(details.surcharge_amount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-bold border-t pt-1">
              <span>Total a cobrar en Tarjeta:</span>
              <span className="text-primary">{currency} {fmt(details.total_charged)}</span>
            </div>
            {details.installments > 1 && (
              <div className="flex justify-between items-center text-xs text-muted-foreground bg-background p-1.5 rounded border">
                <span>Valor de cada cuota ({details.installments}x):</span>
                <span className="font-mono font-bold text-foreground">
                  {currency} {fmt(details.installment_amount)} / cuota
                </span>
              </div>
            )}
            {details.processor_fee_amount > 0 && (
              <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t">
                <span>Neto estimado agencia (desc. posnet {details.processor_fee_percentage}%):</span>
                <span className="font-mono">{currency} {fmt(details.net_amount)}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave}>
            Confirmar Tarjeta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
