import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NewFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: () => void;
}

export function NewFileDialog({ open, onOpenChange, onSaveSuccess }: NewFileDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  
  const [form, setForm] = useState({
    client_id: 'new',
    client_name: '',
    destination: '',
    start_date: '',
    end_date: '',
    travelers: '1',
    currency: 'USD',
    total_price: '0',
    total_cost: '0',
    status: 'confirmed',
    internal_notes: '',
    operational_notes: '',
    promoter: '',
    secondary_seller: '',
    department: '',
    advance_amount_ars: '0',
    advance_amount_usd: '0',
  });

  useEffect(() => {
    if (open) {
      setForm({
        client_id: 'new',
        client_name: '',
        destination: '',
        start_date: '',
        end_date: '',
        travelers: '1',
        currency: 'USD',
        total_price: '0',
        total_cost: '0',
        status: 'confirmed',
        internal_notes: '',
        operational_notes: '',
        promoter: '',
        secondary_seller: '',
        department: '',
        advance_amount_ars: '0',
        advance_amount_usd: '0',
      });
      
      // Load clients list
      supabase
        .from('clients')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          if (data) setClients(data);
        });
    }
  }, [open]);

  const handleClientChange = (val: string) => {
    if (val === 'new') {
      setForm(prev => ({ ...prev, client_id: 'new', client_name: '' }));
    } else {
      const selected = clients.find(c => c.id === val);
      setForm(prev => ({
        ...prev,
        client_id: val,
        client_name: selected ? selected.name : ''
      }));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Form values mapping
      const payload: any = {
        user_id: user.id,
        client_name: form.client_name.trim() || 'Sin cliente',
        client_id: form.client_id === 'new' ? null : form.client_id,
        destination: form.destination.trim(),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        travelers: parseInt(form.travelers, 10) || 1,
        currency: form.currency,
        total_price: parseFloat(form.total_price) || 0,
        total_cost: parseFloat(form.total_cost) || 0,
        status: form.status,
        internal_notes: form.internal_notes.trim(),
        operational_notes: form.operational_notes.trim(),
        promoter: form.promoter.trim(),
        secondary_seller: form.secondary_seller.trim(),
        department: form.department.trim(),
        advance_amount_ars: parseFloat(form.advance_amount_ars) || 0,
        advance_amount_usd: parseFloat(form.advance_amount_usd) || 0,
      };

      const { data, error } = await supabase
        .from('files')
        .insert(payload)
        .select('id, file_number')
        .single();

      if (error) throw error;

      toast.success(`Expediente FILE-${String(data.file_number).padStart(3, '0')} creado con éxito`);
      onSaveSuccess();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(`Error al crear expediente: ${e.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo Expediente</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-2">
          {/* Seccion 1: Cliente y Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="client-select">Seleccionar Cliente</Label>
              <Select value={form.client_id} onValueChange={handleClientChange}>
                <SelectTrigger id="client-select">
                  <SelectValue placeholder="Seleccionar o escribir nuevo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">-- Ingresar cliente manual --</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client-name">Nombre del Cliente *</Label>
              <Input
                id="client-name"
                placeholder="Nombre completo"
                value={form.client_name}
                onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                disabled={form.client_id !== 'new'}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="destination">Destino</Label>
              <Input
                id="destination"
                placeholder="Ej: Rio de Janeiro"
                value={form.destination}
                onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="in_progress">En curso</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seccion 2: Fechas y Pax */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Fecha Salida</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end_date">Fecha Regreso</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="travelers">Pasajeros (Pax)</Label>
              <Input
                id="travelers"
                type="number"
                min="1"
                value={form.travelers}
                onChange={e => setForm(p => ({ ...p, travelers: e.target.value }))}
              />
            </div>
          </div>

          {/* Seccion 3: Finanzas */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-b pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="currency">Moneda</Label>
              <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                  <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                  <SelectItem value="EUR">EUR (Euros)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="total_price">Precio de Venta</Label>
              <Input
                id="total_price"
                type="number"
                min="0"
                step="0.01"
                value={form.total_price}
                onChange={e => setForm(p => ({ ...p, total_price: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="total_cost">Costo Total</Label>
              <Input
                id="total_cost"
                type="number"
                min="0"
                step="0.01"
                value={form.total_cost}
                onChange={e => setForm(p => ({ ...p, total_cost: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                placeholder="Área/Depto"
                value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
              />
            </div>
          </div>

          {/* Seccion 4: Staff y Adelantos */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-b pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="promoter">Promotor / Referido</Label>
              <Input
                id="promoter"
                placeholder="Referido por"
                value={form.promoter}
                onChange={e => setForm(p => ({ ...p, promoter: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="secondary_seller">Vendedor 2</Label>
              <Input
                id="secondary_seller"
                placeholder="Vendedor secundario"
                value={form.secondary_seller}
                onChange={e => setForm(p => ({ ...p, secondary_seller: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="advance_amount_ars">Adelanto ARS</Label>
              <Input
                id="advance_amount_ars"
                type="number"
                min="0"
                value={form.advance_amount_ars}
                onChange={e => setForm(p => ({ ...p, advance_amount_ars: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="advance_amount_usd">Adelanto USD</Label>
              <Input
                id="advance_amount_usd"
                type="number"
                min="0"
                value={form.advance_amount_usd}
                onChange={e => setForm(p => ({ ...p, advance_amount_usd: e.target.value }))}
              />
            </div>
          </div>

          {/* Seccion 5: Notas */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="internal_notes">Notas Internas</Label>
              <Textarea
                id="internal_notes"
                placeholder="Notas de oficina..."
                value={form.internal_notes}
                onChange={e => setForm(p => ({ ...p, internal_notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="operational_notes">Notas Operativas</Label>
              <Textarea
                id="operational_notes"
                placeholder="Notas de viaje y proveedores..."
                value={form.operational_notes}
                onChange={e => setForm(p => ({ ...p, operational_notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Crear Expediente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
