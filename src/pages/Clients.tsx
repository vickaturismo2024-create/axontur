import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone, Download, Upload, FileText, AlertTriangle, ShieldAlert } from 'lucide-react';
import { DocumentAlertBadge, getDocStatus, getWorstStatus, DocStatus } from '@/components/clients/DocumentAlertBadge';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotes } from '@/contexts/QuotesContext';
import { toast } from 'sonner';
import { ClientFormDialog, ClientRecord, emptyClient } from '@/components/clients/ClientFormDialog';
import { ImportExcelDialog } from '@/components/clients/ImportExcelDialog';
import { GroupsManager } from '@/components/clients/GroupsManager';
import { Quote } from '@/types/quote';

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

async function fetchAllClients(userId: string): Promise<ClientRecord[]> {
  const all: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from('clients').select('*').order('name').range(from, from + PAGE - 1);
    if (error) { console.error(error); break; }
    all.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all.map(mapRow);
}

const Clients = () => {
  const { user } = useAuth();
  const { quotes } = useQuotes();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [quotesDialogClient, setQuotesDialogClient] = useState<ClientRecord | null>(null);
  const [searchParams] = useSearchParams();
  const [docFilter, setDocFilter] = useState<boolean>(() => searchParams.get('docs') === '1');

  const fetchClients = async () => {
    if (!user) return;
    const data = await fetchAllClients(user.id);
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  const existingDnis = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => { if (c.dni) set.add(c.dni); });
    return set;
  }, [clients]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) || c.dni.includes(q)
    );
  }, [clients, search]);

  const getClientQuotes = (client: ClientRecord): Quote[] =>
    quotes.filter(q => q.client.name === client.name || (client.email && q.client.email === client.email));

  const handleNew = () => { setEditingClient({ id: '', ...emptyClient }); setIsDialogOpen(true); };
  const handleEdit = (client: ClientRecord) => { setEditingClient({ ...client }); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!editingClient || !user) return;
    const payload: any = { ...editingClient };
    delete payload.id;
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

  const handleBulkImportDone = async () => {
    // Called after import finishes, just refresh
    await fetchClients();
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

  const clientQuotes = quotesDialogClient ? getClientQuotes(quotesDialogClient) : [];

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
                {filtered.map(client => {
                  const qCount = getClientQuotes(client).length;
                  return (
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
                          <button
                            onClick={() => qCount > 0 ? setQuotesDialogClient(client) : null}
                            className={`text-xs ${qCount > 0 ? 'text-primary underline cursor-pointer hover:text-primary/80' : ''}`}
                          >
                            {qCount} presupuesto(s)
                          </button>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(client.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
        onImport={handleBulkImportDone}
        existingDnis={existingDnis}
      />

      {/* Client Quotes Dialog */}
      <Dialog open={!!quotesDialogClient} onOpenChange={() => setQuotesDialogClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Presupuestos de {quotesDialogClient?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {clientQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin presupuestos asociados</p>
            ) : clientQuotes.map(q => (
              <button
                key={q.id}
                onClick={() => { setQuotesDialogClient(null); navigate(`/quote/${q.id}`); }}
                className="w-full rounded-md border p-3 text-left hover:bg-muted transition-colors"
              >
                <p className="font-medium text-sm">{q.trip.destination || 'Sin destino'}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleDateString()}</span>
                  <span className="text-xs font-medium">{(q.trip as any).currency || 'USD'} ${(q.pricing.totalPrice || 0).toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
