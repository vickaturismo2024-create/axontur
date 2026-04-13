import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Plane, Hotel, Bus, Anchor, Umbrella, Car, Train, Ship, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ServiceRecord {
  id: string;
  service_type: string;
  description: string;
  supplier_name: string;
  status: string;
  confirmation_number: string;
  cost: number;
  price: number;
  currency: string;
  service_date: string | null;
  notes: string;
}

const SERVICE_TYPES = [
  { value: 'flight', label: 'Vuelo', icon: Plane },
  { value: 'lodging', label: 'Alojamiento', icon: Hotel },
  { value: 'transfer', label: 'Traslado', icon: Bus },
  { value: 'activity', label: 'Actividad', icon: Activity },
  { value: 'insurance', label: 'Seguro', icon: Umbrella },
  { value: 'cruise', label: 'Crucero', icon: Ship },
  { value: 'train', label: 'Tren', icon: Train },
  { value: 'rental_car', label: 'Auto', icon: Car },
  { value: 'ferry', label: 'Ferry', icon: Anchor },
  { value: 'other', label: 'Otro', icon: Activity },
];

const SERVICE_STATUS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const emptyService: Omit<ServiceRecord, 'id'> = {
  service_type: 'flight', description: '', supplier_name: '', status: 'pending',
  confirmation_number: '', cost: 0, price: 0, currency: 'USD', service_date: null, notes: '',
};

interface Props { fileId: string; currency: string; }

export function FileServicesTab({ fileId, currency }: Props) {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [form, setForm] = useState({ ...emptyService, currency });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('file_services').select('*').eq('file_id', fileId).order('service_date');
    setServices((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fileId]);

  const openNew = () => { setEditing(null); setForm({ ...emptyService, currency }); setDialogOpen(true); };
  const openEdit = (s: ServiceRecord) => { setEditing(s); setForm({ ...s }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!user) return;
    if (!form.description.trim()) { toast.error('Ingresá una descripción'); return; }
    if (editing) {
      const { error } = await supabase.from('file_services').update({ ...form }).eq('id', editing.id);
      if (error) toast.error('Error al actualizar'); else toast.success('Servicio actualizado');
    } else {
      const { error } = await supabase.from('file_services').insert({ ...form, file_id: fileId, user_id: user.id });
      if (error) toast.error('Error al crear servicio'); else toast.success('Servicio agregado');
    }
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('file_services').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Servicio eliminado');
    load();
  };

  const getIcon = (type: string) => {
    const found = SERVICE_TYPES.find(t => t.value === type);
    const Icon = found?.icon || Activity;
    return <Icon className="h-5 w-5" />;
  };

  const getTypeLabel = (type: string) => SERVICE_TYPES.find(t => t.value === type)?.label || type;
  const getStatusBadge = (s: string) => {
    if (s === 'confirmed') return <Badge variant="default">Confirmado</Badge>;
    if (s === 'cancelled') return <Badge variant="destructive">Cancelado</Badge>;
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando servicios...</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Servicios ({services.length})</h3>
        <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Agregar servicio</Button>
      </div>

      {services.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No hay servicios cargados</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {services.map(s => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-4 p-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {getIcon(s.service_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">{getTypeLabel(s.service_type)}</span>
                    {getStatusBadge(s.status)}
                    {s.confirmation_number && <span className="font-mono text-xs text-muted-foreground">#{s.confirmation_number}</span>}
                  </div>
                  <p className="truncate font-medium">{s.description}</p>
                  {s.supplier_name && <p className="text-xs text-muted-foreground">Proveedor: {s.supplier_name}</p>}
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-semibold">{s.currency} {s.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">Costo: {s.currency} {s.cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
            <div>
              <label className="mb-1 block text-sm font-medium">Fecha del servicio</label>
              <Input type="date" value={form.service_date || ''} onChange={e => setForm({ ...form, service_date: e.target.value || null })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            <Button onClick={handleSave}>{editing ? 'Actualizar' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
