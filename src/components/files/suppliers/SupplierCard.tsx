import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { SupplierPayment, CatalogSupplier } from './types';

interface SupplierCardProps {
  supplier: { name: string; id: string | null; costs: Record<string, number> };
  paid: Record<string, number>;
  payments: SupplierPayment[];
  catalog: CatalogSupplier[];
  onOpenPayment: (sup: { name: string; id: string | null }) => void;
  onOpenEdit: (p: SupplierPayment) => void;
  onDelete: (id: string) => void;
  getMethodLabel: (v: string) => string;
  formatMoney: (amounts: Record<string, number>) => string;
}

export function SupplierCard({
  supplier: sup,
  paid,
  payments,
  catalog,
  onOpenPayment,
  onOpenEdit,
  onDelete,
  getMethodLabel,
  formatMoney,
}: SupplierCardProps) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{sup.name}</p>
              <p className="text-xs text-muted-foreground break-words">Costo total: {formatMoney(sup.costs)}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenPayment(sup)} className="shrink-0">
            <DollarSign className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Registrar pago</span>
          </Button>
        </div>

        {Object.keys(paid).length > 0 && (
          <div className="flex items-center flex-wrap gap-2 text-sm">
            <Badge variant="secondary">Pagado: {formatMoney(paid)}</Badge>
            {Object.entries(sup.costs).map(([cur, cost]) => {
              const paidAmt = paid[cur] || 0;
              const pending = cost - paidAmt;
              if (pending <= 0) return null;
              return <Badge key={cur} variant="outline" className="text-destructive">Pendiente: {cur} {pending.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</Badge>;
            })}
          </div>
        )}

        {Object.keys(paid).length === 0 && (
          <Badge variant="outline" className="text-destructive">Sin pagos registrados</Badge>
        )}

        {payments.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground">Historial de pagos</p>
            {payments.map(p => {
              const linked = catalog.find(c => c.id === p.supplier_id);
              return (
                <div key={p.id} className="flex items-start justify-between gap-2 rounded bg-muted/50 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                      <span className="font-medium">{p.currency} {p.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString('es-AR')} · {getMethodLabel(p.payment_method)}</span>
                      {p.reference && <span className="text-xs text-muted-foreground">Ref: {p.reference}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {linked ? `→ CC: ${linked.name}` : (
                        <span className="text-destructive">Sin enlazar a catálogo</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => onOpenEdit(p)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => onDelete(p.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
