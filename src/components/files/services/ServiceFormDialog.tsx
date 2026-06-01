import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ServiceRecord, SERVICE_TYPES, SERVICE_STATUS, CURRENCIES } from './types';

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ServiceRecord | null;
  form: any;
  setForm: (form: any) => void;
  onSave: () => void;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  onSave,
}: ServiceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Tipo</label>
              <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Estado</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICE_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Descripción *</label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ej: Vuelo BA 1234 EZE-MAD" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Proveedor</label>
              <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nro. Reserva</label>
              <Input value={form.confirmation_number} onChange={e => setForm({ ...form, confirmation_number: e.target.value })} placeholder="Código de confirmación" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha del servicio</label>
              <Input type="date" value={form.service_date || ''} onChange={e => setForm({ ...form, service_date: e.target.value || null })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Venc. de pago</label>
              <Input type="date" value={form.payment_due_date || ''} onChange={e => setForm({ ...form, payment_due_date: e.target.value || null })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Moneda</label>
              <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Costo</label>
              <Input type="number" min={0} value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Precio venta</label>
              <Input type="number" min={0} value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notas</label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <Button onClick={onSave}>{editing ? 'Actualizar' : 'Agregar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
