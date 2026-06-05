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
import { formatDateSafe } from '@/lib/utils';
import { isPast, isToday, differenceInDays } from 'date-fns';

type ServiceType = 'flight' | 'lodging' | 'transfer' | 'activity' | 'insurance' |
                   'cruise' | 'train' | 'rental_car' | 'ferry' | 'other';

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
  end_date: string | null;
  payment_due_date: string | null;
  notes: string;
  origin?: string | null;
  destination?: string | null;
  airline?: string | null;
  flight_number?: string | null;
  cabin_class?: string | null;
  regime?: string | null;
  room_type?: string | null;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  company?: string | null;
  departure_time?: string | null;
  arrival_time?: string | null;
  luggage?: string | null;
  luggage_type?: string | null;
  hotel_category?: string | null;
  ship_name?: string | null;
  embarkation_port?: string | null;
  disembarkation_port?: string | null;
  deck?: string | null;
  cabin_number?: string | null;
  coverage?: string | null;
  insurance_plan?: string | null;
}

const SERVICE_TYPES: { value: ServiceType; label: string; icon: React.ElementType }[] = [
  { value: 'flight',     label: 'Vuelo',        icon: Plane    },
  { value: 'lodging',    label: 'Alojamiento',  icon: Hotel    },
  { value: 'transfer',   label: 'Traslado',     icon: Bus      },
  { value: 'activity',   label: 'Actividad',    icon: Activity },
  { value: 'insurance',  label: 'Seguro',       icon: Umbrella },
  { value: 'cruise',     label: 'Crucero',      icon: Ship     },
  { value: 'train',      label: 'Tren',         icon: Train    },
  { value: 'rental_car', label: 'Auto',         icon: Car      },
  { value: 'ferry',      label: 'Ferry',        icon: Anchor   },
  { value: 'other',      label: 'Otro',         icon: Activity },
];

const SERVICE_STATUS = [
  { value: 'pending',   label: 'Pendiente'   },
  { value: 'confirmed', label: 'Confirmado'  },
  { value: 'cancelled', label: 'Cancelado'   },
];

const CURRENCIES = ['USD', 'ARS', 'EUR', 'BRL'];
const REGIMENES  = ['Sin régimen', 'Solo alojamiento', 'Desayuno', 'Media pensión', 'Pensión completa', 'Todo incluido'];
const CLASES     = ['Economy', 'Premium Economy', 'Business', 'First'];

// Labels dinámicos según tipo de servicio
const LABELS: Record<string, { dateFrom: string; dateTo: string; supplier: string; confirmation: string }> = {
  flight:     { dateFrom: 'Fecha de salida',   dateTo: 'Fecha de llegada',   supplier: 'Aerolínea',   confirmation: 'Nro. de vuelo / PNR' },
  lodging:    { dateFrom: 'Check-in',           dateTo: 'Check-out',          supplier: 'Hotel',       confirmation: 'Nro. de reserva'     },
  transfer:   { dateFrom: 'Fecha y hora',       dateTo: '',                   supplier: 'Operador',    confirmation: 'Referencia'          },
  activity:   { dateFrom: 'Fecha',              dateTo: '',                   supplier: 'Operador',    confirmation: 'Referencia'          },
  insurance:  { dateFrom: 'Vigencia desde',     dateTo: 'Vigencia hasta',     supplier: 'Compañía',    confirmation: 'Nro. de póliza'      },
  cruise:     { dateFrom: 'Fecha de embarque',  dateTo: 'Fecha de desembarque', supplier: 'Naviera',   confirmation: 'Nro. de reserva'     },
  train:      { dateFrom: 'Fecha de salida',    dateTo: 'Fecha de llegada',   supplier: 'Operador',    confirmation: 'Nro. de reserva'     },
  rental_car: { dateFrom: 'Fecha de retiro',    dateTo: 'Fecha de devolución', supplier: 'Empresa',   confirmation: 'Nro. de reserva'     },
  ferry:      { dateFrom: 'Fecha de salida',    dateTo: 'Fecha de llegada',   supplier: 'Naviera',     confirmation: 'Nro. de reserva'     },
  other:      { dateFrom: 'Fecha de inicio',    dateTo: 'Fecha de fin',       supplier: 'Proveedor',   confirmation: 'Referencia'          },
};

const emptyService = {
  service_type:        'flight' as ServiceType,
  description:         '',
  supplier_name:       '',
  supplier_id:         null as string | null,
  status:              'pending',
  confirmation_number: '',
  cost:                0,
  price:               0,
  currency:            'USD',
  service_date:        null as string | null,
  end_date:            null as string | null,
  payment_due_date:    null as string | null,
  notes:               '',
  // extras de base de datos
  origin:              '',
  destination:         '',
  airline:             '',
  flight_number:       '',
  cabin_class:         'Economy',
  regime:              'Sin régimen',
  room_type:           '',
  pickup_location:     '',
  dropoff_location:    '',
  company:             '',
  departure_time:      '',
  arrival_time:        '',
  luggage:             '',
  luggage_type:        'personal',
  hotel_category:      '',
  ship_name:           '',
  embarkation_port:    '',
  disembarkation_port: '',
  deck:                '',
  cabin_number:        '',
  coverage:            '',
  insurance_plan:      '',
};

interface Props { fileId: string; currency: string; }

export function FileServicesTab({ fileId, currency }: Props) {
  const { user } = useAuth();
  const [services, setServices]   = useState<ServiceRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]     = useState<ServiceRecord | null>(null);
  const [form, setForm]           = useState({ ...emptyService, currency });
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('file_services')
      .select('*')
      .eq('file_id', fileId)
      .order('service_date');
    setServices((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fileId]);

  // helpers
  const getIcon      = (type: string) => { const t = SERVICE_TYPES.find(x => x.value === type); const I = t?.icon || Activity; return <I className="h-5 w-5" />; };
  const getTypeLabel = (type: string) => SERVICE_TYPES.find(x => x.value === type)?.label || type;
  const lblFor       = (type: string) => LABELS[type] || LABELS.other;

  const getStatusBadge = (s: string) => {
    if (s === 'confirmed') return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Confirmado</Badge>;
    if (s === 'cancelled') return <Badge variant="destructive">Cancelado</Badge>;
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  const getDueBadge = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'cancelled') return null;
    const d = new Date(dueDate);
    if (isPast(d) && !isToday(d))
      return <Badge variant="destructive" className="text-[10px] font-bold"><AlertTriangle className="mr-1 h-3 w-3" />Vencido</Badge>;
    if (differenceInDays(d, new Date()) <= 3)
      return <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"><AlertTriangle className="mr-1 h-3 w-3" />Vence pronto</Badge>;
    return null;
  };

  // Para enriquecer la descripción automáticamente con datos específicos
  const enrichDescription = (f: typeof form): string => {
    if (f.description.trim()) return f.description;
    
    if (f.service_type === 'flight') {
      const route = `${f.origin || ''} → ${f.destination || ''}`.trim();
      const code = `${f.airline || ''} ${f.flight_number || ''}`.trim();
      return `Vuelo ${code} (${route})`.trim() || 'Servicio de Vuelo';
    }
    if (f.service_type === 'lodging') {
      return `Hotel: ${f.supplier_name || 'Alojamiento'} (${f.room_type || ''})`.trim() || 'Alojamiento';
    }
    if (f.service_type === 'rental_car') {
      return `Alquiler de Auto: ${f.company || f.supplier_name || ''} (${f.pickup_location || ''} → ${f.dropoff_location || ''})`.trim() || 'Alquiler de Auto';
    }
    if (f.service_type === 'insurance') {
      return `Seguro de Viaje: ${f.company || f.supplier_name || ''} (${f.insurance_plan || ''})`.trim() || 'Seguro';
    }
    if (f.service_type === 'cruise') {
      return `Crucero: ${f.ship_name || ''} (${f.company || f.supplier_name || ''})`.trim() || 'Crucero';
    }
    
    return f.description;
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyService, currency });
    setDialogOpen(true);
  };

  const openEdit = (s: ServiceRecord) => {
    setEditing(s);
    setForm({
      ...emptyService,
      ...s,
      currency:        s.currency,
      service_date:    s.service_date    || null,
      end_date:        s.end_date        || null,
      payment_due_date: s.payment_due_date || null,
      origin:          s.origin || '',
      destination:     s.destination || '',
      airline:         s.airline || '',
      flight_number:   s.flight_number || '',
      cabin_class:     s.cabin_class || 'Economy',
      regime:          s.regime || 'Sin régimen',
      room_type:       s.room_type || '',
      pickup_location:  s.pickup_location || '',
      dropoff_location: s.dropoff_location || '',
      company:         s.company || '',
      departure_time:  s.departure_time || '',
      arrival_time:    s.arrival_time || '',
      luggage:         s.luggage || '',
      luggage_type:    s.luggage_type || 'personal',
      hotel_category:  s.hotel_category || '',
      ship_name:       s.ship_name || '',
      embarkation_port: s.embarkation_port || '',
      disembarkation_port: s.disembarkation_port || '',
      deck:            s.deck || '',
      cabin_number:    s.cabin_number || '',
      coverage:        s.coverage || '',
      insurance_plan:  s.insurance_plan || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    
    const finalDesc = form.description.trim() || enrichDescription(form);
    if (!finalDesc) { toast.error('Ingresá una descripción'); return; }

    const payload = {
      service_type:        form.service_type,
      description:         finalDesc,
      supplier_name:       form.supplier_name,
      supplier_id:         form.supplier_id || null,
      status:              form.status,
      confirmation_number: form.confirmation_number,
      cost:                form.cost,
      price:               form.price,
      currency:            form.currency,
      service_date:        form.service_date        || null,
      end_date:            form.end_date            || null,
      payment_due_date:    form.payment_due_date    || null,
      notes:               form.notes,
      
      // 23 Columnas de base de datos
      origin:              form.origin || null,
      destination:         form.destination || null,
      airline:             form.airline || null,
      flight_number:       form.flight_number || null,
      cabin_class:         form.cabin_class || null,
      regime:              form.regime || null,
      room_type:           form.room_type || null,
      pickup_location:     form.pickup_location || null,
      dropoff_location:    form.dropoff_location || null,
      company:             form.company || null,
      departure_time:      form.departure_time || null,
      arrival_time:        form.arrival_time || null,
      luggage:             form.luggage || null,
      luggage_type:        form.luggage_type || null,
      hotel_category:      form.hotel_category || null,
      ship_name:           form.ship_name || null,
      embarkation_port:    form.embarkation_port || null,
      disembarkation_port: form.disembarkation_port || null,
      deck:                form.deck || null,
      cabin_number:        form.cabin_number || null,
      coverage:            form.coverage || null,
      insurance_plan:      form.insurance_plan || null,
    };

    if (editing) {
      const { error } = await supabase.from('file_services').update(payload as any).eq('id', editing.id);
      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Servicio actualizado');
    } else {
      const { error } = await supabase.from('file_services')
        .insert({ ...payload, file_id: fileId, user_id: user.id } as any);
      if (error) { toast.error('Error al crear servicio'); return; }
      toast.success('Servicio agregado');
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

  const groups = useMemo(() => {
    const map = new Map<string, ServiceRecord[]>();
    for (const s of services) {
      const key = `${s.service_type}::${s.supplier_name || ''}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) =>
      getTypeLabel(a[0].split('::')[0]).localeCompare(getTypeLabel(b[0].split('::')[0]))
    );
  }, [services]);

  const getGroupSubtotals = (items: ServiceRecord[]) => {
    const by: Record<string, { cost: number; price: number }> = {};
    for (const s of items) {
      if (!by[s.currency]) by[s.currency] = { cost: 0, price: 0 };
      by[s.currency].cost  += s.cost;
      by[s.currency].price += s.price;
    }
    return by;
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando servicios...</div>;

  const lbl = lblFor(form.service_type);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground uppercase tracking-wider">Servicios ({services.length})</h3>
        <Button size="sm" onClick={openNew} className="shadow-sm"><Plus className="mr-2 h-4 w-4" />Agregar servicio</Button>
      </div>

      {services.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No hay servicios cargados</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {groups.map(([key, items]) => {
            const [type, supplier] = key.split('::');
            return (
              <ServiceGroup
                key={key}
                type={type} supplier={supplier} items={items}
                subtotals={getGroupSubtotals(items)}
                getIcon={getIcon} getTypeLabel={getTypeLabel}
                getStatusBadge={getStatusBadge} getDueBadge={getDueBadge}
                onEdit={openEdit} onDelete={setDeleteId}
              />
            );
          })}
        </div>
      )}

      {/* ── Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">

            {/* Tipo + Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">Tipo *</label>
                <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v as ServiceType })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">Estado</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">Descripción *</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder={
                  form.service_type === 'flight'    ? 'Ej: AR 1234 EZE → MAD' :
                  form.service_type === 'lodging'   ? 'Ej: Hotel Marriott Madrid' :
                  form.service_type === 'insurance' ? 'Ej: Assist Card Gold' :
                  form.service_type === 'cruise'    ? 'Ej: MSC Bellissima — Mediterráneo' :
                  'Ej: Entrada al Louvre, Excursión en grupo'
                }
                className="h-10"
              />
            </div>

            {/* Proveedor + Confirmación */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">{lbl.supplier}</label>
                <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">{lbl.confirmation}</label>
                <Input value={form.confirmation_number} onChange={e => setForm({ ...form, confirmation_number: e.target.value })} className="h-10" />
              </div>
            </div>

            {/* Fechas */}
            <div className={`grid gap-4 ${lbl.dateTo ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">{lbl.dateFrom}</label>
                <Input type={form.service_type === 'flight' ? 'datetime-local' : 'date'}
                  value={form.service_date || ''}
                  onChange={e => setForm({ ...form, service_date: e.target.value || null })}
                  className="h-10" />
              </div>
              {lbl.dateTo && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">{lbl.dateTo}</label>
                  <Input type={form.service_type === 'flight' || form.service_type === 'train' || form.service_type === 'ferry' ? 'datetime-local' : 'date'}
                    value={form.end_date || ''}
                    onChange={e => setForm({ ...form, end_date: e.target.value || null })}
                    className="h-10" />
                </div>
              )}
            </div>

            {/* ── CAMPOS ESPECÍFICOS POR TIPO DE SERVICIO ── */}
            {form.service_type === 'flight' && (
              <div className="border border-border bg-slate-50/50 p-3.5 rounded-lg space-y-3">
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Detalles de Vuelo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Origen (EZE, MAD)</label>
                    <Input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Destino</label>
                    <Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) })} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Aerolínea</label>
                    <Input value={form.airline} onChange={e => setForm({ ...form, airline: e.target.value.toUpperCase() })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Nro Vuelo</label>
                    <Input value={form.flight_number} onChange={e => setForm({ ...form, flight_number: e.target.value.toUpperCase() })} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Hora Salida</label>
                    <Input placeholder="Ej: 14:30" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Hora Llegada</label>
                    <Input placeholder="Ej: 06:15" value={form.arrival_time} onChange={e => setForm({ ...form, arrival_time: e.target.value })} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Cabina / Clase</label>
                    <Select value={form.cabin_class} onValueChange={v => setForm({ ...form, cabin_class: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{CLASES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Equipaje permitido</label>
                    <Input placeholder="Ej: 1x23kg + Carry-on" value={form.luggage} onChange={e => setForm({ ...form, luggage: e.target.value })} className="h-9" />
                  </div>
                </div>
              </div>
            )}

            {form.service_type === 'lodging' && (
              <div className="border border-border bg-slate-50/50 p-3.5 rounded-lg space-y-3">
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Detalles de Alojamiento</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Tipo de Habitación</label>
                    <Input placeholder="Ej: Standard Doble, Suite" value={form.room_type} onChange={e => setForm({ ...form, room_type: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Régimen</label>
                    <Select value={form.regime} onValueChange={v => setForm({ ...form, regime: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{REGIMENES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Categoría del hotel</label>
                  <Input placeholder="Ej: 5 estrellas, Boutique" value={form.hotel_category} onChange={e => setForm({ ...form, hotel_category: e.target.value })} className="h-9" />
                </div>
              </div>
            )}

            {form.service_type === 'rental_car' && (
              <div className="border border-border bg-slate-50/50 p-3.5 rounded-lg space-y-3">
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Detalles de Auto</p>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Compañía Rentadora</label>
                  <Input placeholder="Ej: Hertz, Avis" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="h-9" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Lugar de Retiro</label>
                    <Input value={form.pickup_location} onChange={e => setForm({ ...form, pickup_location: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Lugar de Devolución</label>
                    <Input value={form.dropoff_location} onChange={e => setForm({ ...form, dropoff_location: e.target.value })} className="h-9" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Categoría / Tipo de Auto</label>
                  <Input placeholder="Ej: Mediano Automatico, SUV" value={form.room_type} onChange={e => setForm({ ...form, room_type: e.target.value })} className="h-9" />
                </div>
              </div>
            )}

            {form.service_type === 'insurance' && (
              <div className="border border-border bg-slate-50/50 p-3.5 rounded-lg space-y-3">
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Detalles de Asistencia / Seguro</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Plan de Seguro</label>
                    <Input placeholder="Ej: Gold 150k" value={form.insurance_plan} onChange={e => setForm({ ...form, insurance_plan: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Cobertura</label>
                    <Input placeholder="Ej: USD 150.000" value={form.coverage} onChange={e => setForm({ ...form, coverage: e.target.value })} className="h-9" />
                  </div>
                </div>
              </div>
            )}

            {form.service_type === 'cruise' && (
              <div className="border border-border bg-slate-50/50 p-3.5 rounded-lg space-y-3">
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Detalles de Crucero</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Nombre del Barco</label>
                    <Input value={form.ship_name} onChange={e => setForm({ ...form, ship_name: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Naviera / Compañía</label>
                    <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Nro Cabina</label>
                    <Input value={form.cabin_number} onChange={e => setForm({ ...form, cabin_number: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Cubierta (Deck)</label>
                    <Input value={form.deck} onChange={e => setForm({ ...form, deck: e.target.value })} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Puerto de Embarque</label>
                    <Input value={form.embarkation_port} onChange={e => setForm({ ...form, embarkation_port: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Puerto de Desembarque</label>
                    <Input value={form.disembarkation_port} onChange={e => setForm({ ...form, disembarkation_port: e.target.value })} className="h-9" />
                  </div>
                </div>
              </div>
            )}

            {(form.service_type === 'train' || form.service_type === 'ferry') && (
              <div className="border border-border bg-slate-50/50 p-3.5 rounded-lg space-y-3">
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Detalles de {form.service_type === 'train' ? 'Tren' : 'Ferry'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Compañía Operadora</label>
                    <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">{form.service_type === 'train' ? 'Nro Tren' : 'Nombre Barco'}</label>
                    <Input value={form.ship_name} onChange={e => setForm({ ...form, ship_name: e.target.value })} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Origen</label>
                    <Input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Destino</label>
                    <Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Clase</label>
                    <Input placeholder="Ej: Standard, VIP" value={form.cabin_class} onChange={e => setForm({ ...form, cabin_class: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 uppercase">Nro Asiento / Cabina</label>
                    <Input value={form.cabin_number} onChange={e => setForm({ ...form, cabin_number: e.target.value })} className="h-9" />
                  </div>
                </div>
              </div>
            )}

            {/* Vencimiento de pago */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">Vencimiento de pago al proveedor</label>
              <Input type="date" value={form.payment_due_date || ''}
                onChange={e => setForm({ ...form, payment_due_date: e.target.value || null })} className="h-10" />
            </div>

            {/* Moneda + Costo + Precio */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">Moneda</label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">Costo neto</label>
                <Input type="number" min={0} value={form.cost}
                  onChange={e => setForm({ ...form, cost: Number(e.target.value) })} className="h-10" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">Precio venta</label>
                <Input type="number" min={0} value={form.price}
                  onChange={e => setForm({ ...form, price: Number(e.target.value) })} className="h-10" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase">Notas</label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>

            <Button onClick={handleSave} className="h-11 text-sm font-semibold">{editing ? 'Actualizar servicio' : 'Agregar servicio'}</Button>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── ServiceGroup ─────────────────────────────────────────────────────────────
interface SGProps {
  type: string; supplier: string; items: ServiceRecord[];
  subtotals: Record<string, { cost: number; price: number }>;
  getIcon: (t: string) => React.ReactNode; getTypeLabel: (t: string) => string;
  getStatusBadge: (s: string) => React.ReactNode;
  getDueBadge: (d: string | null, s: string) => React.ReactNode;
  onEdit: (s: ServiceRecord) => void; onDelete: (id: string) => void;
}

function ServiceGroup({ type, supplier, items, subtotals, getIcon, getTypeLabel, getStatusBadge, getDueBadge, onEdit, onDelete }: SGProps) {
  const [open, setOpen] = useState(true);
  const lbl = LABELS[type] || LABELS.other;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border border-border/80 shadow-sm overflow-hidden bg-card">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-3.5 text-left hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {getIcon(type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground uppercase tracking-tight">{getTypeLabel(type)}{supplier ? ` — ${supplier}` : ''}</p>
              <p className="text-xs text-muted-foreground font-medium">{items.length} servicio{items.length > 1 ? 's' : ''}</p>
            </div>
            <div className="hidden gap-3 text-right sm:flex sm:flex-col shrink-0">
              {Object.entries(subtotals).map(([cur, { cost, price }]) => (
                <div key={cur} className="text-xs font-mono">
                  <span className="font-bold text-foreground">{cur} {price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  <span className="text-muted-foreground ml-2">Costo: {cur} {cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''} ml-2`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border bg-card">
            {items.map(s => (
              <div key={s.id} className="flex items-start gap-4 p-4 border-b border-border/50 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {getStatusBadge(s.status)}
                    {getDueBadge(s.payment_due_date, s.status)}
                    {s.confirmation_number && (
                      <span className="font-mono text-xs text-muted-foreground bg-muted border border-border/50 px-1.5 py-0.5 rounded font-semibold">
                        #{s.confirmation_number}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{s.description}</p>
                  
                  {/* METADATOS ESPECÍFICOS DE ALTO CONTRASTE */}
                  {s.service_type === 'flight' && (s.origin || s.destination || s.airline || s.flight_number || s.cabin_class || s.departure_time || s.arrival_time) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/80 bg-muted/30 border border-border/50 p-2.5 rounded-md font-medium">
                      {s.airline && <span>✈️ <strong className="font-bold">{s.airline}</strong> {s.flight_number}</span>}
                      {(s.origin || s.destination) && <span>Ruta: <strong className="font-bold">{s.origin || 'N/D'} → {s.destination || 'N/D'}</strong></span>}
                      {(s.departure_time || s.arrival_time) && <span>Horas: <strong className="font-bold">{s.departure_time || 'N/D'} - {s.arrival_time || 'N/D'}</strong></span>}
                      {s.cabin_class && <span>Clase: <strong className="font-bold">{s.cabin_class}</strong></span>}
                      {s.luggage && <span>Equipaje: <strong className="font-bold">{s.luggage}</strong></span>}
                    </div>
                  )}

                  {s.service_type === 'lodging' && (s.room_type || s.regime || s.hotel_category) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/80 bg-muted/30 border border-border/50 p-2.5 rounded-md font-medium">
                      {s.room_type && <span>Habitación: <strong className="font-bold">{s.room_type}</strong></span>}
                      {s.regime && <span>Régimen: <strong className="font-bold">{s.regime}</strong></span>}
                      {s.hotel_category && <span>Categoría: <strong className="font-bold">{s.hotel_category}</strong></span>}
                    </div>
                  )}

                  {s.service_type === 'rental_car' && (s.company || s.pickup_location || s.dropoff_location || s.room_type) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/80 bg-muted/30 border border-border/50 p-2.5 rounded-md font-medium">
                      {s.company && <span>Rentadora: <strong className="font-bold">{s.company}</strong></span>}
                      {s.room_type && <span>Auto: <strong className="font-bold">{s.room_type}</strong></span>}
                      {s.pickup_location && <span>Retiro: <strong className="font-bold">{s.pickup_location}</strong></span>}
                      {s.dropoff_location && <span>Devolución: <strong className="font-bold">{s.dropoff_location}</strong></span>}
                    </div>
                  )}

                  {s.service_type === 'insurance' && (s.insurance_plan || s.coverage) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/80 bg-muted/30 border border-border/50 p-2.5 rounded-md font-medium">
                      {s.insurance_plan && <span>Plan: <strong className="font-bold">{s.insurance_plan}</strong></span>}
                      {s.coverage && <span>Cobertura: <strong className="font-bold">{s.coverage}</strong></span>}
                    </div>
                  )}

                  {s.service_type === 'cruise' && (s.ship_name || s.company || s.cabin_number || s.deck || s.embarkation_port || s.disembarkation_port) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/80 bg-muted/30 border border-border/50 p-2.5 rounded-md font-medium">
                      {s.ship_name && <span>Barco: <strong className="font-bold">{s.ship_name}</strong> {s.company ? `(${s.company})` : ''}</span>}
                      {s.cabin_number && <span>Cabina: <strong className="font-bold">{s.cabin_number}</strong> {s.deck ? `Deck ${s.deck}` : ''}</span>}
                      {(s.embarkation_port || s.disembarkation_port) && <span>Puertos: <strong className="font-bold">{s.embarkation_port || 'N/D'} → {s.disembarkation_port || 'N/D'}</strong></span>}
                    </div>
                  )}

                  {(s.service_type === 'train' || s.service_type === 'ferry') && (s.company || s.ship_name || s.origin || s.destination || s.cabin_class || s.cabin_number) && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/80 bg-muted/30 border border-border/50 p-2.5 rounded-md font-medium">
                      {s.company && <span>Operador: <strong className="font-bold">{s.company}</strong></span>}
                      {s.ship_name && <span>{s.service_type === 'train' ? 'Tren' : 'Barco'}: <strong className="font-bold">{s.ship_name}</strong></span>}
                      {(s.origin || s.destination) && <span>Ruta: <strong className="font-bold">{s.origin || 'N/D'} → {s.destination || 'N/D'}</strong></span>}
                      {s.cabin_class && <span>Clase: <strong className="font-bold">{s.cabin_class}</strong> {s.cabin_number ? `Asiento: ${s.cabin_number}` : ''}</span>}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground font-medium mt-2 border-t border-border/50 pt-2">
                    {s.service_date && (
                      <span>{lbl.dateFrom}: {formatDateSafe(s.service_date)}</span>
                    )}
                    {s.end_date && (
                      <span>{lbl.dateTo || 'Hasta'}: {formatDateSafe(s.end_date)}</span>
                    )}
                    {s.payment_due_date && (
                      <span>Venc. pago: <strong className="text-foreground/80 font-semibold">{formatDateSafe(s.payment_due_date)}</strong></span>
                    )}
                    {s.notes && (
                      <span className="w-full text-[11px] text-muted-foreground mt-1 italic block">Notas: {s.notes}</span>
                    )}
                  </div>
                </div>
                <div className="hidden text-right sm:block shrink-0 min-w-32 font-mono">
                  <p className="font-bold text-sm text-foreground">{s.currency} {s.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Costo: {s.currency} {s.cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(s)} className="text-muted-foreground hover:text-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)} className="text-destructive/80 hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

