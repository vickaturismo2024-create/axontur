import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotes } from '@/contexts/QuotesContext';
import { useSupplierAnalytics, SupplierStat } from '@/hooks/useSupplierAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Store, Search, Phone, Mail, BarChart3, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPLIER_TYPES } from './SupplierDetail';

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  notes: string;
  created_at: string;
}

const emptySupplier = { name: '', email: '', phone: '', type: '', notes: '' };
const PAGE_SIZE = 30;

const Suppliers = () => {
  const { user } = useAuth();
  const { quotes } = useQuotes();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const supplierStats = useSupplierAnalytics(quotes);

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers', user?.id],
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase.from('suppliers').select('*').order('name').range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all as Supplier[];
    },
    enabled: !!user,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['suppliers', user?.id] });

  const handleSave = async () => {
    if (!editing || !user || !editing.name?.trim()) return;
    if (editing.id) {
      const { error } = await supabase.from('suppliers').update({
        name: editing.name, email: editing.email || '', phone: editing.phone || '',
        type: editing.type || '', notes: editing.notes || '',
      } as any).eq('id', editing.id);
      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Proveedor actualizado');
    } else {
      const { error } = await supabase.from('suppliers').insert({
        name: editing.name, email: editing.email || '', phone: editing.phone || '',
        type: editing.type || '', notes: editing.notes || '', user_id: user.id,
      } as any);
      if (error) { toast.error('Error al crear'); return; }
      toast.success('Proveedor creado');
    }
    setIsDialogOpen(false);
    setEditing(null);
    refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('suppliers').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Proveedor eliminado');
    refresh();
  };

  const getStatForSupplier = (name: string): SupplierStat | undefined =>
    supplierStats.find(s => s.name.toLowerCase() === name.toLowerCase());

  const filtered = useMemo(() => (suppliers || []).filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.type.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || s.type === typeFilter;
    return matchesSearch && matchesType;
  }), [suppliers, search, typeFilter]);

  const usedTypes = useMemo(() => {
    const set = new Set((suppliers || []).map(s => s.type).filter(Boolean));
    return Array.from(set);
  }, [suppliers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Proveedores</h1>
            <p className="mt-1 text-muted-foreground">Gestiona tus operadores y mayoristas</p>
          </div>
          <div className="flex gap-2">
            <Link to="/reportes">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Ver reportes
              </Button>
            </Link>
            <Button onClick={() => { setEditing(emptySupplier); setIsDialogOpen(true); }} className="bg-primary">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-2">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o tipo..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-10" />
          </div>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="sm:max-w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {SUPPLIER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              {usedTypes.filter(t => !SUPPLIER_TYPES.includes(t)).map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-44 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Store className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>{(suppliers?.length || 0) === 0 ? 'No tenés proveedores aún. ¡Creá el primero!' : 'No se encontraron resultados.'}</p>
          </CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginated.map(s => {
                const stat = getStatForSupplier(s.name);
                return (
                  <Card key={s.id} className="group">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Store className="h-4 w-4 text-primary" /> {s.name}
                      </CardTitle>
                      {s.type && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full w-fit">{s.type}</span>}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm text-muted-foreground mb-2">
                        {s.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</p>}
                        {s.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</p>}
                        {s.notes && <p className="truncate">{s.notes}</p>}
                      </div>
                      {stat && (
                        <div className="flex gap-2 flex-wrap mb-2">
                          <Badge variant="secondary" className="text-[10px]">{stat.services} servicio(s)</Badge>
                        </div>
                      )}
                      <div className="flex gap-1 flex-wrap">
                        <Link to={`/suppliers/${s.id}`}>
                          <Button variant="ghost" size="sm"><ExternalLink className="mr-1 h-4 w-4" />Ver</Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setIsDialogOpen(true); }}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)} className="text-destructive"><Trash2 className="mr-1 h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <span className="text-sm">{currentPage + 1} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}>
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Nombre *</Label><Input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div>
                <Label>Tipo de servicio</Label>
                <Select value={editing.type || ''} onValueChange={v => setEditing({ ...editing, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    {editing.type && !SUPPLIER_TYPES.includes(editing.type) && (
                      <SelectItem value={editing.type}>{editing.type} (personalizado)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Email</Label><Input type="email" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div>
              <div><Label>Teléfono</Label><Input value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div><Label>Notas</Label><Textarea value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={3} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!editing?.name?.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Suppliers;
