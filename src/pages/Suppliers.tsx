import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotes } from '@/contexts/QuotesContext';
import { useSupplierAnalytics, SupplierStat } from '@/hooks/useSupplierAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Store, Search, Phone, Mail, BarChart3, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

const CHART_COLORS = [
  'hsl(var(--primary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658',
  '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042',
];

const Suppliers = () => {
  const { user } = useAuth();
  const { quotes } = useQuotes();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const supplierStats = useSupplierAnalytics(quotes);

  const fetchSuppliers = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('suppliers').select('*').order('name');
    if (data) setSuppliers(data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

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
    fetchSuppliers();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('suppliers').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Proveedor eliminado');
    fetchSuppliers();
  };

  const getStatForSupplier = (name: string): SupplierStat | undefined =>
    supplierStats.find(s => s.name.toLowerCase() === name.toLowerCase());

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  const top10 = supplierStats.slice(0, 10);
  const pieData = supplierStats.slice(0, 8).map(s => ({ name: s.name, value: s.services }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Proveedores</h1>
            <p className="mt-1 text-muted-foreground">Gestiona tus operadores y mayoristas</p>
          </div>
          <Button onClick={() => { setEditing(emptySupplier); setIsDialogOpen(true); }} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
          </Button>
        </div>

        {/* Analytics Section */}
        {supplierStats.length > 0 && (
          <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen} className="mb-6">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="mb-3 gap-2">
                <BarChart3 className="h-4 w-4" />
                Análisis de rentabilidad
                <ChevronDown className={`h-4 w-4 transition-transform ${analyticsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-6 lg:grid-cols-2 mb-6">
                {/* Bar Chart - Top 10 by volume */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top proveedores por volumen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={top10} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                        <Bar dataKey="totalCost" name="Costo" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="totalPrice" name="Venta" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Pie Chart - Usage distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Distribución de uso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Table */}
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Resumen por proveedor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4">Proveedor</th>
                          <th className="py-2 pr-4 text-right">Servicios</th>
                          <th className="py-2 pr-4 text-right">Costo total</th>
                          <th className="py-2 pr-4 text-right">Venta total</th>
                          <th className="py-2 pr-4 text-right">Margen $</th>
                          <th className="py-2 text-right">Margen %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierStats.map(s => (
                          <tr key={s.name} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{s.name}</td>
                            <td className="py-2 pr-4 text-right">{s.services}</td>
                            <td className="py-2 pr-4 text-right">${s.totalCost.toLocaleString()}</td>
                            <td className="py-2 pr-4 text-right">${s.totalPrice.toLocaleString()}</td>
                            <td className={`py-2 pr-4 text-right ${s.margin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                              ${s.margin.toLocaleString()}
                            </td>
                            <td className={`py-2 text-right ${s.marginPct >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                              {s.marginPct.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o tipo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Store className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>{suppliers.length === 0 ? 'No tenés proveedores aún. ¡Creá el primero!' : 'No se encontraron resultados.'}</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(s => {
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
                        <Badge variant={stat.marginPct >= 0 ? 'outline' : 'destructive'} className="text-[10px]">
                          Margen: {stat.marginPct.toFixed(1)}%
                        </Badge>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setIsDialogOpen(true); }}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)} className="text-destructive"><Trash2 className="mr-1 h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Nombre *</Label><Input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Tipo de servicio</Label><Input value={editing.type || ''} onChange={e => setEditing({ ...editing, type: e.target.value })} placeholder="Ej: Aéreo, Terrestre, Hotelería..." /></div>
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
