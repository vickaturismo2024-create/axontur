import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, AlertTriangle, CheckCircle2, Clock, Trash2, Pencil, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { AdminOnly } from '@/components/auth/AdminOnly';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Incidencia {
  id: string;
  descripcion: string;
  fecha: string;
  estado_gestion: string;
  impacto_caja: boolean;
  monto: number;
  moneda: string;
  created_at: string;
}

const ESTADOS = [
  { value: 'pendiente',   label: 'Pendiente',   icon: <Clock className="h-3 w-3" /> },
  { value: 'en_gestion',  label: 'En gestión',  icon: <AlertTriangle className="h-3 w-3" /> },
  { value: 'resuelto',    label: 'Resuelto',    icon: <CheckCircle2 className="h-3 w-3" /> },
];

const ESTADO_VARIANT: Record<string, 'secondary' | 'default' | 'outline'> = {
  pendiente:   'secondary',
  en_gestion:  'default',
  resuelto:    'outline',
};

const CURRENCIES = ['ARS', 'USD', 'EUR'];

const emptyForm = {
  descripcion: '',
  fecha: new Date().toISOString().slice(0, 16),
  estado_gestion: 'pendiente',
  impacto_caja: false,
  monto: 0,
  moneda: 'ARS',
};

interface Props {
  fileId: string;
  agencyId: string;
}

export function FileIncidenciasTab({ fileId, agencyId }: Props) {
  const { user } = useAuth();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Incidencia | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('file_incidencias')
      .select('*')
      .eq('file_id', fileId)
      .order('fecha', { ascending: false });
    setIncidencias((data as unknown as Incidencia[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fileId]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (inc: Incidencia) => {
    setEditing(inc);
    setForm({
      descripcion: inc.descripcion,
      fecha: inc.fecha.slice(0, 16),
      estado_gestion: inc.estado_gestion,
      impacto_caja: inc.impacto_caja,
      monto: inc.monto,
      moneda: inc.moneda,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.descripcion.trim()) {
      toast.error('Ingresá una descripción');
      return;
    }

    const payload = {
      descripcion:    form.descripcion.trim(),
      fecha:          new Date(form.fecha).toISOString(),
      estado_gestion: form.estado_gestion,
      impacto_caja:   form.impacto_caja,
      monto:          form.impacto_caja ? form.monto : 0,
      moneda:         form.moneda,
    };

    if (editing) {
      const { error } = await supabase
        .from('file_incidencias')
        .update(payload)
        .eq('id', editing.id);
      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Incidencia actualizada');
    } else {
      const { error } = await supabase
        .from('file_incidencias')
        .insert({
          ...payload,
          agency_id:  agencyId,
          file_id:    fileId,
          created_by: user.id,
        });
      if (error) { toast.error('Error al crear incidencia'); return; }
      toast.success('Incidencia registrada');
    }

    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('file_incidencias').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Incidencia eliminada');
    load();
  };

  const getEstado = (v: string) => ESTADOS.find(e => e.value === v);

  const pendientes = incidencias.filter(i => i.estado_gestion !== 'resuelto');

  if (loading) return (
    <div className="py-8 text-center text-muted-foreground">Cargando incidencias...</div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Incidencias ({incidencias.length})</h3>
          {pendientes.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />Nueva incidencia
        </Button>
      </div>

      {incidencias.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-500/40" />
            <p className="text-muted-foreground text-sm">Sin incidencias registradas</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Registrá problemas, reclamos o situaciones especiales del expediente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {incidencias.map(inc => {
            const estado = getEstado(inc.estado_gestion);
            return (
              <Card key={inc.id} className={inc.estado_gestion === 'resuelto' ? 'opacity-70' : ''}>
                <CardContent className="flex items-start gap-3 p-3 sm:p-4">
                  {/* Ícono estado */}
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    inc.estado_gestion === 'resuelto'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : inc.estado_gestion === 'en_gestion'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-destructive/10 text-destructive'
                  }`}>
                    {inc.estado_gestion === 'resuelto'
                      ? <CheckCircle2 className="h-5 w-5" />
                      : <AlertTriangle className="h-5 w-5" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={ESTADO_VARIANT[inc.estado_gestion]} className="text-[10px]">
                        {estado?.label}
                      </Badge>
                      {inc.impacto_caja && inc.monto > 0 && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400 gap-1">
                          <DollarSign className="h-2.5 w-2.5" />
                          {inc.moneda} {inc.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-snug">{inc.descripcion}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(inc.fecha), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(inc)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AdminOnly>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(inc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AdminOnly>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar incidencia' : 'Nueva incidencia'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Descripción *</label>
              <Textarea
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Describí el problema o situación..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha y hora</label>
                <Input
                  type="datetime-local"
                  value={form.fecha}
                  onChange={e => setForm({ ...form, fecha: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Estado</label>
                <Select
                  value={form.estado_gestion}
                  onValueChange={v => setForm({ ...form, estado_gestion: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(e => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Impacto en caja */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="impacto-caja"
                  checked={form.impacto_caja}
                  onChange={e => setForm({ ...form, impacto_caja: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="impacto-caja" className="text-sm font-medium cursor-pointer">
                  Impacta en caja / genera movimiento contable
                </label>
              </div>
              {form.impacto_caja && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Monto</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.monto}
                      onChange={e => setForm({ ...form, monto: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Moneda</label>
                    <Select
                      value={form.moneda}
                      onValueChange={v => setForm({ ...form, moneda: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleSave}>
              {editing ? 'Guardar cambios' : 'Registrar incidencia'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar incidencia?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
