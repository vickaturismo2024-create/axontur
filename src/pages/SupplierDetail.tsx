import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Store, Mail, Phone, FileText, DollarSign, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export const SUPPLIER_TYPES = [
  'Aerolínea',
  'Hotel',
  'Operador',
  'Cruceros',
  'Asistencia',
  'Traslados',
  'Excursiones',
  'Otro',
];

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  notes: string;
}

interface ServiceRow {
  id: string;
  file_id: string;
  service_type: string;
  description: string;
  service_date: string | null;
  cost: number;
  price: number;
  currency: string;
  status: string;
}

interface PaymentRow {
  id: string;
  file_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
}

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<Supplier | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: supplier, isLoading } = useQuery<Supplier | null>({
    queryKey: queryKeys.suppliers.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
      const s = data as any;
      if (s) {
        setEditing({
          id: s.id, name: s.name || '', email: s.email || '', phone: s.phone || '',
          type: s.type || '', notes: s.notes || '',
        });
        setNotes(s.notes || '');
      }
      return s ? { id: s.id, name: s.name, email: s.email, phone: s.phone, type: s.type, notes: s.notes } : null;
    },
    enabled: !!id && !!user,
  });

  const { data: services = [] } = useQuery<ServiceRow[]>({
    queryKey: queryKeys.suppliers.services(id!),
    queryFn: async () => {
      const { data } = await supabase.from('file_services').select('*').eq('supplier_id', id!).order('service_date', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!id && !!user,
  });

  const { data: payments = [] } = useQuery<PaymentRow[]>({
    queryKey: queryKeys.suppliers.payments(id!),
    queryFn: async () => {
      const { data } = await supabase.from('file_supplier_payments').select('*').eq('supplier_id', id!).order('payment_date', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!id && !!user,
  });

  // Saldo por moneda: costo total servicios - pagos realizados
  const balancesByCurrency = useMemo(() => {
    const map: Record<string, { owed: number; paid: number }> = {};
    services.forEach(s => {
      if (!map[s.currency]) map[s.currency] = { owed: 0, paid: 0 };
      map[s.currency].owed += Number(s.cost) || 0;
    });
    payments.forEach(p => {
      if (!map[p.currency]) map[p.currency] = { owed: 0, paid: 0 };
      map[p.currency].paid += Number(p.amount) || 0;
    });
    return map;
  }, [services, payments]);

  // YTD: facturación + cantidad de expedientes asociados
  const ytdMetrics = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const ytdServices = services.filter(s => (s.service_date || '') >= yearStart);
    const fileSet = new Set(services.map(s => s.file_id));
    const totalsByCurr: Record<string, number> = {};
    ytdServices.forEach(s => {
      const c = s.currency;
      if (!totalsByCurr[c]) totalsByCurr[c] = 0;
      totalsByCurr[c] += Number(s.cost) || 0;
    });
    return { totalsByCurr, fileCount: fileSet.size };
  }, [services]);

  const handleSaveDetails = async () => {
    if (!editing || !id) return;
    const { error } = await supabase.from('suppliers').update({
      name: editing.name, email: editing.email, phone: editing.phone, type: editing.type,
    } as any).eq('id', id);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Proveedor actualizado');
    qc.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) });
    qc.invalidateQueries({ queryKey: queryKeys.suppliers.all(user?.id) });
  };

  // Autoguardado de notas con debounce
  const handleNotesChange = (val: string) => {
    setNotes(val);
    setSavingNotes(true);
    if ((window as any)._notesTimeout) clearTimeout((window as any)._notesTimeout);
    (window as any)._notesTimeout = setTimeout(async () => {
      if (!id) return;
      await supabase.from('suppliers').update({ notes: val } as any).eq('id', id);
      setSavingNotes(false);
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) });
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </main>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Proveedor no encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/suppliers')}>Volver</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/suppliers')} className="mb-2">
              <ArrowLeft className="mr-1 h-4 w-4" /> Volver
            </Button>
            <h1 className="font-serif text-3xl font-bold flex items-center gap-2">
              <Store className="h-7 w-7 text-primary" /> {supplier.name}
            </h1>
            {supplier.type && <Badge variant="secondary" className="mt-1">{supplier.type}</Badge>}
          </div>
        </div>

        {/* Métricas YTD */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Briefcase className="h-4 w-4" /> Expedientes asociados</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{ytdMetrics.fileCount}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><DollarSign className="h-4 w-4" /> Facturación YTD</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(ytdMetrics.totalsByCurr).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin actividad este año</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(ytdMetrics.totalsByCurr).map(([c, v]) => (
                    <p key={c} className="text-lg font-semibold">{c} {fmt(v)}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Saldo por moneda</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(balancesByCurrency).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin movimientos</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(balancesByCurrency).map(([c, { owed, paid }]) => {
                    const bal = owed - paid;
                    return (
                      <p key={c} className={`text-sm ${bal > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {c}: {bal > 0 ? 'Adeudado ' : 'Saldo '} {fmt(Math.abs(bal))}
                      </p>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Datos</TabsTrigger>
            <TabsTrigger value="services">Servicios ({services.length})</TabsTrigger>
            <TabsTrigger value="payments">Pagos ({payments.length})</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardContent className="pt-6 space-y-3">
                {editing && (
                  <>
                    <div><Label>Nombre</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
                    <div>
                      <Label>Tipo</Label>
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
                    <div><Label>Email</Label><Input type="email" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div>
                    <div><Label>Teléfono</Label><Input value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></div>
                    <Button onClick={handleSaveDetails}><Save className="mr-2 h-4 w-4" /> Guardar</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card>
              <CardContent className="pt-6">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Aún no hay servicios registrados con este proveedor.</p>
                ) : (
                  <div className="space-y-2">
                    {services.map(s => (
                      <Link to={`/files/${s.file_id}`} key={s.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.description || s.service_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.service_date ? new Date(s.service_date).toLocaleDateString('es-AR') : '—'} · {s.service_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm">{s.currency} {fmt(s.cost)}</p>
                          <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardContent className="pt-6">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Aún no hay pagos registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map(p => (
                      <Link to={`/files/${p.file_id}`} key={p.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50">
                        <div>
                          <p className="font-medium">{new Date(p.payment_date).toLocaleDateString('es-AR')}</p>
                          <p className="text-xs text-muted-foreground">{p.reference || p.payment_method || '—'}</p>
                        </div>
                        <p className="font-mono text-sm">{p.currency} {fmt(p.amount)}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Notas internas</Label>
                  <span className="text-xs text-muted-foreground">{savingNotes ? 'Guardando...' : 'Autoguardado'}</span>
                </div>
                <Textarea rows={10} value={notes} onChange={e => handleNotesChange(e.target.value)} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
