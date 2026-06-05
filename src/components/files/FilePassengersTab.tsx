import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, User, UserPlus, Search, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { exportPassengersToExcel } from '@/lib/exportPassengersExcel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ClientInfoDialog } from '@/components/clients/ClientInfoDialog';
import { ClientRecord } from '@/components/clients/ClientFormDialog';
import { useNavigate } from 'react-router-dom';
import { formatDateSafe } from '@/lib/utils';

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

interface PassengerForm {
  client_id: string | null;
  name: string;
  sex: string;
  birth_date: string | null;
  nationality: string;
  notes: string;
  dni: string;
  dni_expiry: string | null;
  passport: string;
  passport_issue: string | null;
  passport_expiry: string | null;
  cuil_cuit: string;
  email: string;
  phone: string;
  phone_work: string;
  phone_mobile: string;
  address: string;
  locality: string;
}

const emptyPassengerForm: PassengerForm = {
  client_id: null,
  name: '',
  sex: '',
  birth_date: null,
  nationality: '',
  notes: '',
  dni: '',
  dni_expiry: null,
  passport: '',
  passport_issue: null,
  passport_expiry: null,
  cuil_cuit: '',
  email: '',
  phone: '',
  phone_work: '',
  phone_mobile: '',
  address: '',
  locality: '',
};

interface ClientOption {
  id: string;
  name: string;
  dni: string;
  passport: string;
  passport_expiry: string | null;
  birth_date: string | null;
  nationality: string;
  sex?: string;
  cuil_cuit?: string;
  email?: string;
  phone?: string;
  phone_work?: string;
  phone_mobile?: string;
  address?: string;
  locality?: string;
  passport_issue?: string | null;
  notes?: string;
}

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
  const navigate = useNavigate();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClients, setLoadingClients] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Passenger | null>(null);
  const [form, setForm] = useState<PassengerForm>({ ...emptyPassengerForm });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // Info Dialog state
  const [selectedClientInfo, setSelectedClientInfo] = useState<ClientRecord | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [passengerForInfo, setPassengerForInfo] = useState<Passenger | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('file_passengers').select('*').eq('file_id', fileId).order('name');
    const list = (data as Passenger[]) || [];
    setPassengers(list);
    setLoading(false);
    
    // Sync travelers count with parent file
    await supabase.from('files').update({ travelers: 1 + list.length }).eq('id', fileId);
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
          .select('id,name,sex,birth_date,nationality,notes,dni,dni_expiry,passport,passport_issue,passport_expiry,cuil_cuit,email,phone,phone_work,phone_mobile,address,locality')
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
    setForm({ ...emptyPassengerForm });
    setImportMode(false);
    setClientSearch('');
    setDialogOpen(true);
  };

  const openEdit = async (p: Passenger) => {
    setEditing(p);
    setImportMode(false);

    if (p.client_id) {
      toast.loading('Cargando datos completos...', { id: 'edit-passenger-loading' });
      const { data } = await supabase.from('clients').select('*').eq('id', p.client_id).maybeSingle();
      toast.dismiss('edit-passenger-loading');
      if (data) {
        setForm({
          client_id: p.client_id,
          name: data.name || '',
          sex: data.sex || '',
          birth_date: data.birth_date || null,
          nationality: data.nationality || '',
          notes: data.notes || p.notes || '',
          dni: data.dni || p.dni || '',
          dni_expiry: data.dni_expiry || null,
          passport: data.passport || p.passport || '',
          passport_issue: data.passport_issue || null,
          passport_expiry: data.passport_expiry || p.passport_expiry || null,
          cuil_cuit: data.cuil_cuit || '',
          email: data.email || '',
          phone: data.phone || '',
          phone_work: data.phone_work || '',
          phone_mobile: data.phone_mobile || '',
          address: data.address || '',
          locality: data.locality || '',
        });
        setDialogOpen(true);
        return;
      }
    }

    setForm({
      client_id: null,
      name: p.name || '',
      sex: '',
      birth_date: p.birth_date || null,
      nationality: p.nationality || '',
      notes: p.notes || '',
      dni: p.dni || '',
      dni_expiry: null,
      passport: p.passport || '',
      passport_issue: null,
      passport_expiry: p.passport_expiry || null,
      cuil_cuit: '',
      email: '',
      phone: '',
      phone_work: '',
      phone_mobile: '',
      address: '',
      locality: '',
    });
    setDialogOpen(true);
  };

  const importClient = (c: ClientOption) => {
    setForm({
      client_id: c.id,
      name: c.name,
      sex: c.sex || '',
      birth_date: c.birth_date || null,
      nationality: c.nationality || '',
      notes: c.notes || '',
      dni: c.dni || '',
      dni_expiry: c.dni_expiry || null,
      passport: c.passport || '',
      passport_issue: c.passport_issue || null,
      passport_expiry: c.passport_expiry || null,
      cuil_cuit: c.cuil_cuit || '',
      email: c.email || '',
      phone: c.phone || '',
      phone_work: c.phone_work || '',
      phone_mobile: c.phone_mobile || '',
      address: c.address || '',
      locality: c.locality || '',
    });
    setImportMode(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim()) { toast.error('Ingresá el nombre'); return; }

    toast.loading('Guardando...', { id: 'save-passenger-loading' });

    try {
      let clientId = form.client_id;

      // 1. Search CRM for client by name if not linked
      if (!clientId) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('name', form.name.trim())
          .maybeSingle();

        if (existing) {
          clientId = existing.id;
        }
      }

      const clientPayload: any = {
        name: form.name.trim(),
        sex: form.sex || null,
        birth_date: form.birth_date || null,
        nationality: form.nationality || null,
        notes: form.notes || null,
        dni: form.dni || null,
        dni_expiry: form.dni_expiry || null,
        passport: form.passport || null,
        passport_issue: form.passport_issue || null,
        passport_expiry: form.passport_expiry || null,
        cuil_cuit: form.cuil_cuit || null,
        email: form.email || null,
        phone: form.phone || null,
        phone_work: form.phone_work || null,
        phone_mobile: form.phone_mobile || null,
        address: form.address || null,
        locality: form.locality || null,
      };

      // 2. Create or Update client in CRM
      if (!clientId) {
        clientPayload.user_id = user.id;
        const { data: newC, error: clientErr } = await supabase
          .from('clients')
          .insert([clientPayload])
          .select('id')
          .single();

        if (clientErr) throw clientErr;
        clientId = newC.id;
      } else {
        const { error: clientErr } = await supabase
          .from('clients')
          .update(clientPayload)
          .eq('id', clientId);

        if (clientErr) throw clientErr;
      }

      // 3. Save the passenger linked to client
      const passengerPayload = {
        client_id: clientId,
        name: form.name.trim(),
        dni: form.dni,
        passport: form.passport,
        passport_expiry: form.passport_expiry,
        birth_date: form.birth_date,
        nationality: form.nationality,
        notes: form.notes,
      };

      if (editing) {
        const { error } = await supabase
          .from('file_passengers')
          .update(passengerPayload)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Pasajero actualizado', { id: 'save-passenger-loading' });
      } else {
        const { error } = await supabase
          .from('file_passengers')
          .insert({
            ...passengerPayload,
            file_id: fileId,
            user_id: user.id,
          });
        if (error) throw error;
        toast.success('Pasajero agregado', { id: 'save-passenger-loading' });
      }

      setDialogOpen(false);
      void load();
      void loadClients();
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar el pasajero', { id: 'save-passenger-loading' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('file_passengers').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Pasajero eliminado');
    void load();
  };

  const handleViewInfo = async (p: Passenger) => {
    setPassengerForInfo(p);
    if (p.client_id) {
      const { data } = await supabase.from('clients').select('*').eq('id', p.client_id).maybeSingle();
      if (data) {
        setSelectedClientInfo(data as ClientRecord);
        setInfoOpen(true);
        return;
      }
    }

    const dummy: ClientRecord = {
      id: '',
      name: p.name,
      email: '',
      phone: '',
      phone_work: '',
      phone_mobile: '',
      notes: p.notes || '',
      address: '',
      nationality: p.nationality || '',
      birth_date: p.birth_date || '',
      dni: p.dni || '',
      dni_expiry: '',
      passport: p.passport || '',
      passport_issue: '',
      passport_expiry: p.passport_expiry || '',
      locality: '',
      cuil_cuit: '',
      sex: '',
    };
    setSelectedClientInfo(dummy);
    setInfoOpen(true);
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
            <Button size="sm" variant="outline" onClick={async () => await exportPassengersToExcel(passengers, `pasajeros-${fileId}.xlsx`)}>
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p
                      className="font-semibold text-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                      onClick={() => handleViewInfo(p)}
                      title="Ver Información del Pasajero"
                    >
                      {p.name}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-muted/80 text-muted-foreground hover:text-primary"
                      onClick={() => navigate(`/clients?highlight=${encodeURIComponent(p.name)}`)}
                      title="Ver en CRM Clientes"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                    {p.dni && <span>DNI: {p.dni}</span>}
                    {p.passport && <span>Pasaporte: {p.passport}</span>}
                    {p.nationality && <span>{p.nationality}</span>}
                    {p.birth_date && <span>Nac: {formatDateSafe(p.birth_date)}</span>}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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

          <div className="grid gap-4 mt-2">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="!grid w-full !grid-cols-2 sm:!grid-cols-4 gap-1 !h-auto p-1 mb-4">
                <TabsTrigger value="personal" className="py-2 text-xs sm:text-sm">Personal</TabsTrigger>
                <TabsTrigger value="documents" className="py-2 text-xs sm:text-sm">Documentos</TabsTrigger>
                <TabsTrigger value="contact" className="py-2 text-xs sm:text-sm">Contacto</TabsTrigger>
                <TabsTrigger value="notes" className="py-2 text-xs sm:text-sm">Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4 m-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre completo *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} placeholder="APELLIDO NOMBRE" />
                  </div>
                  <div>
                    <Label>Sexo</Label>
                    <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Femenino</SelectItem>
                        <SelectItem value="X">No binario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha de nacimiento</Label>
                    <Input type="date" value={form.birth_date || ''} onChange={(e) => setForm({ ...form, birth_date: e.target.value || null })} />
                  </div>
                  <div>
                    <Label>Nacionalidad</Label>
                    <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} placeholder="Argentina" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 m-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>DNI</Label>
                    <Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '') })} placeholder="12345678" />
                  </div>
                  <div>
                    <Label>Vto. DNI</Label>
                    <Input type="date" value={form.dni_expiry || ''} onChange={(e) => setForm({ ...form, dni_expiry: e.target.value || null })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Pasaporte</Label>
                    <Input value={form.passport} onChange={(e) => setForm({ ...form, passport: e.target.value.toUpperCase() })} placeholder="AAA123456" />
                  </div>
                  <div>
                    <Label>Emisión</Label>
                    <Input type="date" value={form.passport_issue || ''} onChange={(e) => setForm({ ...form, passport_issue: e.target.value || null })} />
                  </div>
                  <div>
                    <Label>Vencimiento</Label>
                    <Input type="date" value={form.passport_expiry || ''} onChange={(e) => setForm({ ...form, passport_expiry: e.target.value || null })} />
                  </div>
                </div>
                <div>
                  <Label>CUIL/CUIT</Label>
                  <Input value={form.cuil_cuit} onChange={(e) => setForm({ ...form, cuil_cuit: e.target.value })} placeholder="20-12345678-9" />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 m-0">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ejemplo@email.com" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Tel. Particular</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tel. Comercial</Label>
                    <Input value={form.phone_work} onChange={(e) => setForm({ ...form, phone_work: e.target.value })} />
                  </div>
                  <div>
                    <Label>Celular</Label>
                    <Input value={form.phone_mobile} onChange={(e) => setForm({ ...form, phone_mobile: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Dirección</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div>
                    <Label>Localidad</Label>
                    <Input value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4 m-0">
                <div>
                  <Label>Notas</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} placeholder="Notas adicionales..." />
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={handleSave} className="mt-4 w-full">{editing ? 'Actualizar' : 'Agregar'}</Button>
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

      <ClientInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        client={selectedClientInfo}
        onEdit={() => {
          if (passengerForInfo) {
            void openEdit(passengerForInfo);
          }
        }}
      />
    </div>
  );
}
