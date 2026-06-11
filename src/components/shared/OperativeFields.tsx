import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SupplierSelect } from '@/components/quotes/SupplierSelect';

interface OperativeFieldsProps {
  data: {
    status?: string;
    confirmationNumber?: string;
    supplierId?: string;
    paymentDueDate?: string;
    supplier?: string; // fallback
  };
  onChange: (updates: any) => void;
  currency?: string;
}

export function OperativeFields({ data, onChange, currency }: OperativeFieldsProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-4">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Información Operativa</h4>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <SupplierSelect 
            value={data.supplierId || data.supplier} 
            onChange={(val) => onChange({ supplierId: val, supplier: val })} 
          />
        </div>
        
        <div>
          <Label>Estado de la reserva</Label>
          <Select 
            value={data.status || 'pending'} 
            onValueChange={(val) => onChange({ status: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Número de Confirmación / Localizador</Label>
          <Input 
            value={data.confirmationNumber || ''} 
            onChange={(e) => onChange({ confirmationNumber: e.target.value })} 
            placeholder="Ej: ABC123" 
          />
        </div>

        <div>
          <Label>Vencimiento de Pago</Label>
          <Input 
            type="date" 
            value={data.paymentDueDate || ''} 
            onChange={(e) => onChange({ paymentDueDate: e.target.value })} 
          />
        </div>
      </div>
    </div>
  );
}
