import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SupplierPayment, CatalogSupplier } from './types';
import { FileText, Calendar, DollarSign, Tag, Info, User } from 'lucide-react';

interface SupplierPaymentDetailDialogProps {
  payment: SupplierPayment | null;
  onOpenChange: (open: boolean) => void;
  catalog: CatalogSupplier[];
  getMethodLabel: (v: string) => string;
}

export function SupplierPaymentDetailDialog({
  payment,
  onOpenChange,
  catalog,
  getMethodLabel,
}: SupplierPaymentDetailDialogProps) {
  const linked = payment ? catalog.find((c) => c.id === payment.supplier_id) : null;

  return (
    <Dialog open={!!payment} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Detalle de Pago
          </DialogTitle>
        </DialogHeader>
        {payment && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2 space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Operador (en el servicio)
                </span>
                <p className="font-semibold text-base">{payment.supplier_name}</p>
              </div>

              <div className="col-span-2 space-y-1 border-t pt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" /> Enlace de Catálogo (Cuenta Corriente)
                </span>
                {linked ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                      {linked.name}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-destructive font-medium">Sin enlazar al catálogo (no afecta cuenta corriente)</p>
                )}
              </div>

              <div className="space-y-1 border-t pt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Fecha
                </span>
                <p className="font-medium">{new Date(payment.payment_date).toLocaleDateString('es-AR')}</p>
              </div>

              <div className="space-y-1 border-t pt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Método de pago
                </span>
                <p className="font-medium">{getMethodLabel(payment.payment_method || 'other')}</p>
              </div>

              <div className="col-span-2 space-y-1 border-t pt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Monto registrado
                </span>
                <p className="font-bold text-lg text-primary">
                  {payment.currency} {payment.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {payment.reference && (
                <div className="col-span-2 space-y-1 border-t pt-2">
                  <span className="text-xs text-muted-foreground">Referencia / Nro. Operación</span>
                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded border border-border/50 break-words">
                    {payment.reference}
                  </p>
                </div>
              )}

              {payment.notes && (
                <div className="col-span-2 space-y-1 border-t pt-2">
                  <span className="text-xs text-muted-foreground">Notas</span>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded border border-border/40 whitespace-pre-wrap">
                    {payment.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
