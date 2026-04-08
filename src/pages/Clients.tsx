import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone, Download, Upload, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotes } from '@/contexts/QuotesContext';
import { toast } from 'sonner';
import { ClientFormDialog, ClientRecord, emptyClient } from '@/components/clients/ClientFormDialog';
import { ImportExcelDialog } from '@/components/clients/ImportExcelDialog';
import { GroupsManager } from '@/components/clients/GroupsManager';

function mapRow(c: any): ClientRecord {
  return {
    id: c.id, name: c.name || '', email: c.email || '', phone: c.phone || '',
    phone_work: c.phone_work || '', phone_mobile: c.phone_mobile || '', notes: c.notes || '',
    address: c.address || '', nationality: c.nationality || '',
    birth_date: c.birth_date || '', dni: c.dni || '', dni_expiry: c.dni_expiry || '',
    passport: c.passport || '', passport_issue: c.passport_issue || '',
    passport_expiry: c.passport_expiry || '', locality: c.locality || '',
    cuil_cuit: c.cuil_cuit || '', sex: c.sex || '',
  };
}

const Clients = () => {
  const { user } = useAuth();
  const { quotes } = useQuotes();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchClients = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) { console.error(error); return; }
    setClients((data || []).map(mapRow));
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) || c.dni.includes(q)
    );
  }, [clients, search]);

  const getQuoteCount = (client: ClientRecord) =>
    quotes.filter(q => q.client.name === client.name || q.client.email === client.email).length;

  const handleNew = () => { setEditingClient({ id: '', ...emptyClient }); setIsDialogOpen(true); };
  const handleEdit = (client: ClientRecord) => { setEditingClient({ ...client }); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!editingClient || !user) return;
    const payload: any = { ...editingClient };
    delete payload.id;
    // clean empty dates to null
    ['birth_date', 'dni_expiry', 'passport_issue', 'passport_expiry'].forEach(f => {
      if (!payload[f]) payload[f] = null;
    });
    try {
      if (editingClient.id) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
        if (error) throw error;
        toast.success('Cliente actualizado');
      } else {
        payload.user_id = user.id;
        const { error } = await supabase.from('clients').insert([payload]);
        if (error) throw error;
        toast.success('Cliente creado');
      }
      setIsDialogOpen(false);
      setEditingClient(null);
      fetchClients();
    } catch (e) { console.error(e); toast.error('Error al guardar el cliente'); }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', deleteTargetId);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== deleteTargetId));
      setDeleteTargetId(null);
      toast.success('Cliente eliminado');
    } catch (e) { console.error(e); toast.error('Error al eliminar'); }
  };

  const handleBulkImport = async (rows: Omit<ClientRecord, 'id'>[]) => {
    if (!user) return;
    const payload = rows.map(r => {
      const obj: any = { ...r, user_id: user.id };
      ['birth_date', 'dni_expiry', 'passport_issue', 'passport_expiry'].forEach(f => {
        if (!obj[f]) obj[f] = null;
      });
      return obj;
    });
    const { error } = await supabase.from('clients').insert(payload);
    if (error) { console.error(error); toast.error('Error al importar clientes'); return; }
    toast.success(`${rows.length} clientes importados`);
    fetchClients();
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(clients.map(c => ({
      Nombre: c.name, Email: c.email, 'Tel. Particular': c.phone, 'Tel. Comercial': c.phone_work,
      Celular: c.phone_mobile, Dirección: c.address, Localidad: c.locality,
      Nacionalidad: c.nationality, 'Fecha Nac.': c.birth_date, Sexo: c.sex,
      DNI: c.dni, 'Vto. DNI': c.dni_expiry, Pasaporte: c.passport,
      'Emisión Pas.': c.passport_issue, 'Vto. Pas.': c.passport_expiry,
      'CUIL/CUIT': c.cuil_cuit, Notas: c.notes,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'clientes.xlsx');
    toast.success('Clientes exportados');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8" /> Clientes
            </h1>
            <p className="mt-1 text-muted-foreground">Gestioná tus clientes, importá desde Excel y organizalos en grupos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Importar Excel
            </Button>
            {clients.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
            )}
            <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> Nuevo Cliente</Button>
          </div>
        </div>

        <Tabs defaultValue="clients">
          <TabsList>
            <TabsTrigger value="clients">Clientes ({clients.length})</TabsTrigger>
            <TabsTrigger value="groups">Grupos</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-6">
            <div className="mb-6 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email, teléfono o DNI..." className="pl-10" />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="py-12 text-center">
                <CardContent>
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">{search ? 'No se encontraron clientes' : 'Aún no tenés clientes. ¡Creá el primero o importá desde Excel!'}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(client => (
                  <Card key={client.id} className="group">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {client.dni && <p className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" />DNI: {client.dni}</p>}
                        {client.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{client.email}</p>}
                        {(client.phone || client.phone_mobile) && (
                          <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{client.phone_mobile || client.phone}</p>
                        )}
                        {client.nationality && <p className="text-xs">🌍 {client.nationality}</p>}
                        <p className="text-xs">{getQuoteCount(client)} presupuesto(s)</p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(client.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            <GroupsManager clients={clients} />
          </TabsContent>
        </Tabs>
      </main>

      <ClientFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        client={editingClient}
        onClientChange={setEditingClient}
        onSave={handleSave}
      />

      <ImportExcelDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={handleBulkImport}
      />

      <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
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
};

export default Clients;
