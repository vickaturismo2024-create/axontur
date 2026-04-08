import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotes } from '@/contexts/QuotesContext';
import { toast } from 'sonner';

interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

const emptyClient: Omit<ClientRecord, 'id'> = { name: '', email: '', phone: '', notes: '' };

const Clients = () => {
  const { user } = useAuth();
  const { quotes } = useQuotes();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchClients = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('clients' as any)
      .select('*')
      .order('name');
    if (error) { console.error(error); return; }
    setClients((data || []).map((c: any) => ({
      id: c.id, name: c.name || '', email: c.email || '', phone: c.phone || '', notes: c.notes || '',
    })));
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [clients, search]);

  const getQuoteCount = (client: ClientRecord) =>
    quotes.filter(q => q.client.name === client.name || q.client.email === client.email).length;

  const handleNew = () => {
    setEditingClient({ id: '', ...emptyClient });
    setIsDialogOpen(true);
  };

  const handleEdit = (client: ClientRecord) => {
    setEditingClient({ ...client });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingClient || !user) return;
    try {
      if (editingClient.id) {
        const { error } = await supabase
          .from('clients' as any)
          .update({ name: editingClient.name, email: editingClient.email, phone: editingClient.phone, notes: editingClient.notes } as any)
          .eq('id', editingClient.id);
        if (error) throw error;
        toast.success('Cliente actualizado');
      } else {
        const { error } = await supabase
          .from('clients' as any)
          .insert([{ name: editingClient.name, email: editingClient.email, phone: editingClient.phone, notes: editingClient.notes, user_id: user.id }] as any);
        if (error) throw error;
        toast.success('Cliente creado');
      }
      setIsDialogOpen(false);
      setEditingClient(null);
      fetchClients();
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar el cliente');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const { error } = await supabase.from('clients' as any).delete().eq('id', deleteTargetId);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== deleteTargetId));
      setDeleteTargetId(null);
      toast.success('Cliente eliminado');
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8" /> Clientes
            </h1>
            <p className="mt-1 text-muted-foreground">Gestioná tus clientes y reutilizá sus datos en nuevos presupuestos</p>
          </div>
          <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> Nuevo Cliente</Button>
        </div>

        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email o teléfono..." className="pl-10" />
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
              <p className="mt-4 text-muted-foreground">{search ? 'No se encontraron clientes' : 'Aún no tenés clientes. ¡Creá el primero!'}</p>
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
                    {client.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{client.email}</p>}
                    {client.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{client.phone}</p>}
                    <p className="text-xs">{getQuoteCount(client)} presupuesto(s)</p>
                  </div>
                  {client.notes && <p className="mt-2 text-xs text-muted-foreground/70 line-clamp-2">{client.notes}</p>}
                  <div className="mt-3 flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTargetId(client.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient?.id ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editingClient.email} onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={editingClient.phone} onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })} />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={editingClient.notes} onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!editingClient?.name}>Guardar</Button>
          </DialogFooter>
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
