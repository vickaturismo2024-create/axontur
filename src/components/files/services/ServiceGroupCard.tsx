import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Pencil, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';
import { isPast, isToday, differenceInDays } from 'date-fns';
import { ServiceRecord, SERVICE_TYPES } from './types';

interface ServiceGroupCardProps {
  type: string;
  supplier: string;
  items: ServiceRecord[];
  subtotals: Record<string, { cost: number; price: number }>;
  onEdit: (s: ServiceRecord) => void;
  onDelete: (id: string) => void;
}

export function ServiceGroupCard({
  type,
  supplier,
  items,
  subtotals,
  onEdit,
  onDelete,
}: ServiceGroupCardProps) {
  const [open, setOpen] = useState(true);

  const getIcon = (type: string) => {
    const found = SERVICE_TYPES.find(t => t.value === type);
    if (!found) return null;
    const Icon = found.icon;
    return <Icon className="h-5 w-5" />;
  };

  const getTypeLabel = (type: string) => SERVICE_TYPES.find(t => t.value === type)?.label || type;

  const getStatusBadge = (s: string) => {
    if (s === 'confirmed') return <Badge variant="default">Confirmado</Badge>;
    if (s === 'cancelled') return <Badge variant="destructive">Cancelado</Badge>;
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  const getDueBadge = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'cancelled') return null;
    const date = new Date(dueDate);
    const today = new Date();
    const daysLeft = differenceInDays(date, today);
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive" className="text-xs"><AlertTriangle className="mr-1 h-3 w-3" />Vencido</Badge>;
    }
    if (daysLeft <= 3) {
      return <Badge variant="secondary" className="text-xs"><AlertTriangle className="mr-1 h-3 w-3" />Vence pronto</Badge>;
    }
    return null;
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {getIcon(type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">
                {getTypeLabel(type)}{supplier ? ` — ${supplier}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">{items.length} servicio{items.length > 1 ? 's' : ''}</p>
            </div>
            <div className="hidden gap-3 text-right sm:flex sm:flex-col">
              {Object.entries(subtotals).map(([cur, { cost, price }]) => (
                <div key={cur} className="text-xs">
                  <span className="font-semibold">{cur} {price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  <span className="text-muted-foreground ml-2">Costo: {cur} {cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t">
            {items.map(s => (
              <div key={s.id} className="flex items-center gap-4 p-3 border-b last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(s.status)}
                    {getDueBadge(s.payment_due_date, s.status)}
                    {s.confirmation_number && <span className="font-mono text-xs text-muted-foreground">#{s.confirmation_number}</span>}
                  </div>
                  <p className="truncate font-medium text-sm">{s.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {s.service_date && <span>Fecha: {new Date(s.service_date).toLocaleDateString('es-AR')}</span>}
                    {s.payment_due_date && <span>Venc. pago: {new Date(s.payment_due_date).toLocaleDateString('es-AR')}</span>}
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-semibold text-sm">{s.currency} {s.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">Costo: {s.currency} {s.cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
