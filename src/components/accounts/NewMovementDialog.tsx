import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  accountId: string;
  accountType: 'client' | 'supplier';
  onSaved: () => void;
}

export function NewMovementDialog({ open, onClose, accountId, accountType, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    movement_type: 'credit',
    amount: 0,
    currency: 'USD',
    concept: '',
    reference: '',
    movement_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSave = async () => {
    if (!user) return;
    if (form.amount <= 0) { toast.error('El monto debe ser mayor a 0'); return; }
    if (!form.concept.trim()) { toast.error('Ingresá un concepto'); return; }

    const { error } = await supabase.from('account_movements' as any).insert({
      user_id: user.id,
      account_type: accountType,
      account_id: accountId,
      movement_type: form.movement_type,
      amount: form.amount,
      currency: form.currency,
      concept: form.concept,
      reference: form.reference || null,
      movement_date: form.movement_date,
      notes: form.notes || null,
    } as any);

    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Movimiento registrado');
    setForm({ movement_type: 'credit', amount: 0, currency: 'USD', concept: '', reference: '', movement_date: new Date().toISOString().split('T')[0], notes: '' });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nuevo movimiento</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Tipo</label>
              <Select value={form.movement_type} onValueChange={v => setForm({ ...form, movement_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Crédito (ingreso)</SelectItem>
                  <SelectItem value="debit">Débito (egreso)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha</label>
              <Input type="date" value={form.movement_date} onChange={e => setForm({ ...form, movement_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Monto *</label>
              <Input type="number" min={0} step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Moneda</label>
              <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Concepto *</label>
            <Input value={form.concept} onChange={e => setForm({ ...form, concept: e.target.value })} placeholder="Ej: Seña viaje, Ajuste, Nota de crédito" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Referencia</label>
            <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Nro de recibo, factura, etc." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notas</label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <Button onClick={handleSave}>Guardar movimiento</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
