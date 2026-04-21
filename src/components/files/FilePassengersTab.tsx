import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, User, UserPlus, Search, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { exportPassengersToExcel } from '@/lib/exportPassengersExcel';

interface Passenger {
  id: string;
  client_id: string | null;
  name: string;
  dni: string;
  passport: string;
  passport_expiry: string | null;
  birth_date: string | null;
  nationality: string;
  notes: string;
}

interface ClientOption {
  id: string;
  name: string;
  dni: string;
  passport: string;
  passport_expiry: string | null;
  birth_date: string | null;
  nationality: string;
}

const emptyPassenger: Omit<Passenger, 'id'> = {
  client_id: null,
  name: '',
  dni: '',
  passport: '',
  passport_expiry: null,
  birth_date: null,
  nationality: '',
  notes: '',
};

const CLIENTS_PAGE_SIZE = 1000;

const normalizeText = (value: string | null | undefined) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

interface Props { fileId: string; }

export function FilePassengersTab({ fileId }: Props) {
  const { user } = useAuth();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Passenger | null>(null);
  const [form, setForm] = useState({ ...emptyPassenger });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('file_passengers').select('*').eq('file_id', fileId).order('name');
    setPassengers((data as Passenger[]) || []);
    setLoading(false);
  };

  const loadClients = async () => {
    if (!user) {
      setClients([]);
      return;
    }

    setLoadingClients(true);

    try {
      const allClients: ClientOption[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('clients')
          .select('id,name,dni,passport,passport_expiry,birth_date,nationality')
          .order('name')
          .range(from, from + CLIENTS_PAGE_SIZE - 1);

        if (error) throw error;

        const batch = (data as ClientOption[]) || [];
        allClients.push(...batch);
        hasMore = batch.length === CLIENTS_PAGE_SIZE;
        from += CLIENTS_PAGE_SIZE;
      }

      setClients(allClients);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar pasajeros del CRM');
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    void load();
  }, [fileId]);

  useEffect(() => {
    void loadClients();
  }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyPassenger });
    setImportMode(false);
    setClientSearch('');
    setDialogOpen(true);
  };

  const openEdit = (p: Passenger) => {
    setEditing(p);
    setForm({ ...p });
    setImportMode(false);
    setDialogOpen(true);
  };

  const importClient = (c: ClientOption) => {
    setForm({
      client_id: c.id,
      name: c.name,
      dni: c.dni || '',
      passport: c.passport || '',
      passport_expiry: c.passport_expiry,
      birth_date: c.birth_date,
      nationality: c.nationality || '',
      notes: '',
    });
    setImportMode(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim()) { toast.error('Ingresá el nombre'); return; }
    if (editing) {
      const { error } = await supabase.from('file_passengers').update({ ...form }).eq('id', editing.id);
      if (error) toast.error('Error al actualizar'); else toast.success('Pasajero actualizado');
    } else {
      const { error } = await supabase.from('file_passengers').insert({ ...form, file_id: fileId, user_id: user.id });
      if (error) toast.error('Error al agregar'); else toast.success('Pasajero agregado');
    }
    setDialogOpen(false);
    void load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('file_passengers').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Pasajero eliminado');
    void load();
  };

  const filteredClients = useMemo(() => {
    const query = normalizeText(clientSearch);

    if (!query) return clients;

    return clients.filter((client) =>
      normalizeText(client.name).includes(query) ||
      normalizeText(client.dni).includes(query) ||
      normalizeText(client.passport).includes(query)
    );
  }, [clientSearch, clients]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando pasajeros...</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold">Pasajeros ({passengers.length})</h3>
        <div className="flex gap-2">
          {passengers.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => exportPassengersToExcel(passengers, `pasajeros-${fileId}.xlsx`)}>
              <Download className="mr-2 h-4 w-4" />Exportar
            </Button>
          )}
          <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Agregar pasajero</Button>
        </div>
      </div>

      {passengers.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No hay pasajeros cargados</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {passengers.map(p => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-4 p-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{p.name}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {p.dni && <span>DNI: {p.dni}</span>}
                    {p.passport && <span>Pasaporte: {p.passport}</span>}
                    {p.nationality && <span>{p.nationality}</span>}
                    {p.birth_date && <span>Nac: {new Date(p.birth_date).toLocaleDateString('es-AR')}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar pasajero' : 'Nuevo pasajero'}</DialogTitle></DialogHeader>

          {!editing && !importMode && (
            <Button variant="outline" className="mb-4" onClick={() => setImportMode(true)}>
              <UserPlus className="mr-2 h-4 w-4" />Importar desde CRM
            </Button>
          )}

          {importMode && (
            <div className="mb-4 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nombre, DNI o pasaporte..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {loadingClients
                    ? 'Cargando todos los pasajeros del CRM...'
                    : `${filteredClients.length} resultado(s) sobre ${clients.length} pasajero(s)`}
                </span>
                {!!clientSearch && !loadingClients && (
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" onClick={() => setClientSearch('')}>
                    Limpiar
                  </Button>
                )}
              </div>
              <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-md border p-2">
                {loadingClients ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">Cargando pasajeros...</p>
                ) : filteredClients.length === 0 ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    {clientSearch ? 'Sin resultados' : 'No hay clientes en el CRM'}
                  </p>
                ) : filteredClients.map(c => (
                  <Button key={c.id} variant="ghost" className="w-full justify-start text-sm" onClick={() => importClient(c)}>
                    {c.name} {c.dni ? `(DNI: ${c.dni})` : ''}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setImportMode(false)}>Cancelar</Button>
            </div>
          )}

          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nombre completo *</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">DNI</label>
                <Input value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Pasaporte</label>
                <Input value={form.passport} onChange={e => setForm({ ...form, passport: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Venc. Pasaporte</label>
                <Input type="date" value={form.passport_expiry || ''} onChange={e => setForm({ ...form, passport_expiry: e.target.value || null })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha nacimiento</label>
                <Input type="date" value={form.birth_date || ''} onChange={e => setForm({ ...form, birth_date: e.target.value || null })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nacionalidad</label>
              <Input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} />
            </div>
            <Button onClick={handleSave}>{editing ? 'Actualizar' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pasajero?</AlertDialogTitle>
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
