import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, Plane, Hotel, Bus, Anchor, Umbrella, Car, Train, Ship, Activity, AlertTriangle, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isPast, isToday, differenceInDays } from 'date-fns';

interface ServiceRecord {
  id: string;
  service_type: string;
  description: string;
  supplier_name: string;
  supplier_id: string | null;
  status: string;
  confirmation_number: string;
  cost: number;
  price: number;
  currency: string;
  service_date: string | null;
  payment_due_date: string | null;
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

const CURRENCIES = ['USD', 'ARS', 'EUR', 'BRL'];

const emptyService: Omit<ServiceRecord, 'id'> = {
  service_type: 'flight', description: '', supplier_name: '', supplier_id: null, status: 'pending',
  confirmation_number: '', cost: 0, price: 0, currency: 'USD', service_date: null, payment_due_date: null, notes: '',
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
      const { error } = await supabase.from('file_services').update({ ...form } as any).eq('id', editing.id);
      if (error) toast.error('Error al actualizar'); else toast.success('Servicio actualizado');
    } else {
      const { error } = await supabase.from('file_services').insert({ ...form, file_id: fileId, user_id: user.id } as any);
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

  // Group services by type + supplier
  const groups = useMemo(() => {
    const map = new Map<string, ServiceRecord[]>();
    for (const s of services) {
      const key = `${s.service_type}::${s.supplier_name || ''}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // Sort by type label then supplier
    return Array.from(map.entries()).sort((a, b) => {
      const [aType, aSupplier] = a[0].split('::');
      const [bType, bSupplier] = b[0].split('::');
      const typeCompare = getTypeLabel(aType).localeCompare(getTypeLabel(bType));
      if (typeCompare !== 0) return typeCompare;
      return (aSupplier || '').localeCompare(bSupplier || '');
    });
  }, [services]);

  const getGroupSubtotals = (items: ServiceRecord[]) => {
    const byCurrency: Record<string, { cost: number; price: number }> = {};
    for (const s of items) {
      if (!byCurrency[s.currency]) byCurrency[s.currency] = { cost: 0, price: 0 };
      byCurrency[s.currency].cost += s.cost;
      byCurrency[s.currency].price += s.price;
    }
    return byCurrency;
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
        <div className="space-y-3">
          {groups.map(([key, items]) => {
            const [type, supplier] = key.split('::');
            const subtotals = getGroupSubtotals(items);
            return (
              <ServiceGroup
                key={key}
                type={type}
                supplier={supplier}
                items={items}
                subtotals={subtotals}
                getIcon={getIcon}
                getTypeLabel={getTypeLabel}
                getStatusBadge={getStatusBadge}
                getDueBadge={getDueBadge}
                onEdit={openEdit}
                onDelete={setDeleteId}
              />
            );
          })}
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

// Grouped service card component
interface ServiceGroupProps {
  type: string;
  supplier: string;
  items: ServiceRecord[];
  subtotals: Record<string, { cost: number; price: number }>;
  getIcon: (type: string) => React.ReactNode;
  getTypeLabel: (type: string) => string;
  getStatusBadge: (s: string) => React.ReactNode;
  getDueBadge: (dueDate: string | null, status: string) => React.ReactNode;
  onEdit: (s: ServiceRecord) => void;
  onDelete: (id: string) => void;
}

function ServiceGroup({ type, supplier, items, subtotals, getIcon, getTypeLabel, getStatusBadge, getDueBadge, onEdit, onDelete }: ServiceGroupProps) {
  const [open, setOpen] = useState(true);

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
