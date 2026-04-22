import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, Building2, DollarSign, Check, ChevronsUpDown, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ServiceRecord {
  supplier_name: string;
  supplier_id: string | null;
  cost: number;
  currency: string;
  status: string;
}

interface SupplierPayment {
  id: string;
  supplier_name: string;
  supplier_id: string | null;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  reference: string;
  notes: string;
}

interface CatalogSupplier {
  id: string;
  name: string;
}

const METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit_card', label: 'Tarjeta de Crédito' },
  { value: 'debit_card', label: 'Tarjeta de Débito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' },
];

const CURRENCIES = ['USD', 'ARS', 'EUR', 'BRL'];

interface Props { fileId: string; currency: string; }

export function FileSuppliersTab({ fileId, currency }: Props) {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [catalog, setCatalog] = useState<CatalogSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<{ name: string; id: string | null } | null>(null);
  const [resolvedSupplierId, setResolvedSupplierId] = useState<string | null>(null);
  const [autoMatched, setAutoMatched] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [form, setForm] = useState({
    amount: 0, currency, payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer', reference: '', notes: '',
  });

  const load = async () => {
    if (!user) return;
    const [svcRes, payRes, supRes] = await Promise.all([
      supabase.from('file_services').select('supplier_name,supplier_id,cost,currency,status').eq('file_id', fileId),
      supabase.from('file_supplier_payments' as any).select('*').eq('file_id', fileId).order('payment_date', { ascending: false }),
      supabase.from('suppliers').select('id,name').eq('user_id', user.id).order('name'),
    ]);
    setServices((svcRes.data as any[]) || []);
    setPayments((payRes.data as any[]) || []);
    setCatalog((supRes.data as CatalogSupplier[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fileId, user?.id]);

  // Group services by supplier
  const suppliers = useMemo(() => {
    const map = new Map<string, { name: string; id: string | null; costs: Record<string, number> }>();
    services.filter(s => s.supplier_name && s.status !== 'cancelled').forEach(s => {
      const key = s.supplier_name;
      if (!map.has(key)) map.set(key, { name: s.supplier_name, id: s.supplier_id, costs: {} });
      const entry = map.get(key)!;
      entry.costs[s.currency] = (entry.costs[s.currency] || 0) + s.cost;
    });
    return Array.from(map.values());
  }, [services]);

  const getSupplierPayments = (name: string) => payments.filter(p => p.supplier_name === name);

  const getSupplierPaid = (name: string) => {
    const paid: Record<string, number> = {};
    getSupplierPayments(name).forEach(p => { paid[p.currency] = (paid[p.currency] || 0) + p.amount; });
    return paid;
  };

  const findCatalogMatch = (name: string): CatalogSupplier | null => {
    const norm = name.trim().toLowerCase();
    return catalog.find(s => s.name.trim().toLowerCase() === norm) || null;
  };

  const openPayment = (supplier: { name: string; id: string | null }) => {
    setSelectedSupplier(supplier);
    // Pre-resolve supplier_id from service link or catalog match
    let resolvedId: string | null = supplier.id || null;
    let matched = false;
    if (!resolvedId) {
      const match = findCatalogMatch(supplier.name);
      if (match) {
        resolvedId = match.id;
        matched = true;
      }
    } else {
      matched = true;
    }
    setResolvedSupplierId(resolvedId);
    setAutoMatched(matched);
    setForm({ amount: 0, currency, payment_date: new Date().toISOString().split('T')[0], payment_method: 'transfer', reference: '', notes: '' });
    setDialogOpen(true);
  };

  const createSupplierFromName = async (name: string) => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ user_id: user.id, name: trimmed, type: '' })
      .select('id,name')
      .single();
    if (error || !data) {
      toast.error('No se pudo crear el proveedor');
      return;
    }
    setCatalog(prev => [...prev, data as CatalogSupplier].sort((a, b) => a.name.localeCompare(b.name)));
    setResolvedSupplierId(data.id);
    setAutoMatched(false);
    setComboOpen(false);
    toast.success(`Proveedor «${data.name}» creado`);
  };

  const handleSave = async () => {
    if (!user || !selectedSupplier) return;
    if (form.amount <= 0) { toast.error('El monto debe ser mayor a 0'); return; }
    if (!resolvedSupplierId) {
      toast.error('Debe enlazar el pago a un proveedor del catálogo');
      return;
    }

    const supplierName = catalog.find(c => c.id === resolvedSupplierId)?.name || selectedSupplier.name;

    const { error } = await supabase.from('file_supplier_payments' as any).insert({
      file_id: fileId, user_id: user.id,
      supplier_name: supplierName, supplier_id: resolvedSupplierId,
      amount: form.amount, currency: form.currency, payment_date: form.payment_date,
      payment_method: form.payment_method, reference: form.reference, notes: form.notes,
    } as any);

    if (error) { toast.error('Error al registrar pago'); return; }

    toast.success('Pago registrado y reflejado en cuenta corriente');
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('file_supplier_payments' as any).delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Pago eliminado');
    load();
  };

  const getMethodLabel = (v: string) => METHODS.find(m => m.value === v)?.label || v;

  const formatMoney = (amounts: Record<string, number>) =>
    Object.entries(amounts).map(([cur, amt]) => `${cur} ${amt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`).join(' + ');

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando operadores...</div>;

  const resolvedSupplierName = catalog.find(c => c.id === resolvedSupplierId)?.name;
  const showCreateOption = selectedSupplier && !findCatalogMatch(selectedSupplier.name);

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold">Operadores / Proveedores ({suppliers.length})</h3>
      </div>

      {suppliers.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No hay proveedores en los servicios del expediente</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {suppliers.map(sup => {
            const paid = getSupplierPaid(sup.name);
            const supPayments = getSupplierPayments(sup.name);
            return (
              <Card key={sup.name}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{sup.name}</p>
                        <p className="text-xs text-muted-foreground">Costo total: {formatMoney(sup.costs)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openPayment(sup)}>
                      <DollarSign className="mr-1 h-4 w-4" />Registrar pago
                    </Button>
                  </div>

                  {Object.keys(paid).length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary">Pagado: {formatMoney(paid)}</Badge>
                      {Object.entries(sup.costs).map(([cur, cost]) => {
                        const paidAmt = paid[cur] || 0;
                        const pending = cost - paidAmt;
                        if (pending <= 0) return null;
                        return <Badge key={cur} variant="outline" className="text-destructive">Pendiente: {cur} {pending.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</Badge>;
                      })}
                    </div>
                  )}

                  {Object.keys(paid).length === 0 && (
                    <Badge variant="outline" className="text-destructive">Sin pagos registrados</Badge>
                  )}

                  {supPayments.length > 0 && (
                    <div className="space-y-1 border-t pt-2">
                      <p className="text-xs font-medium text-muted-foreground">Historial de pagos</p>
                      {supPayments.map(p => (
                        <div key={p.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{p.currency} {p.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString('es-AR')} · {getMethodLabel(p.payment_method)}</span>
                            {p.reference && <span className="ml-2 text-xs text-muted-foreground">Ref: {p.reference}</span>}
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar pago a {selectedSupplier?.name}</DialogTitle></DialogHeader>

          {/* Supplier link selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Proveedor del catálogo *</label>
            {resolvedSupplierId && autoMatched ? (
              <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/10 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">Enlazado a: {resolvedSupplierName}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setResolvedSupplierId(null); setAutoMatched(false); }}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn('w-full justify-between', !resolvedSupplierId && 'text-muted-foreground')}
                  >
                    {resolvedSupplierId ? resolvedSupplierName : 'Seleccionar o crear proveedor...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar proveedor..." />
                    <CommandList>
                      <CommandEmpty>
                        {selectedSupplier && (
                          <button
                            type="button"
                            onClick={() => createSupplierFromName(selectedSupplier.name)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            <Plus className="mr-2 inline h-4 w-4" />
                            Crear «{selectedSupplier.name}»
                          </button>
                        )}
                      </CommandEmpty>
                      {showCreateOption && selectedSupplier && (
                        <CommandGroup>
                          <CommandItem
                            value={`__create__${selectedSupplier.name}`}
                            onSelect={() => createSupplierFromName(selectedSupplier.name)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Crear «{selectedSupplier.name}»
                          </CommandItem>
                        </CommandGroup>
                      )}
                      <CommandGroup heading="Catálogo">
                        {catalog.map(s => (
                          <CommandItem
                            key={s.id}
                            value={s.name}
                            onSelect={() => { setResolvedSupplierId(s.id); setAutoMatched(false); setComboOpen(false); }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', resolvedSupplierId === s.id ? 'opacity-100' : 'opacity-0')} />
                            {s.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            <p className="text-xs text-muted-foreground">
              Sin enlazar al catálogo, el pago no aparece en la cuenta corriente del proveedor.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Monto *</label>
                <Input type="number" min={0} step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Moneda</label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha de pago</label>
                <Input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Método</label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Referencia / Nro. transferencia</label>
              <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notas</label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <Button onClick={handleSave} disabled={!resolvedSupplierId || form.amount <= 0}>
              Registrar pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
            <AlertDialogDescription>El movimiento asociado en la cuenta corriente también se eliminará. Esta acción no se puede deshacer.</AlertDialogDescription>
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
