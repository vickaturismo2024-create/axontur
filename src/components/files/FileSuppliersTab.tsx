import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, Pencil, Trash2 } from 'lucide-react';

import { ServiceRecord, SupplierPayment, CatalogSupplier, METHODS } from './suppliers/types';
import { SupplierCard } from './suppliers/SupplierCard';
import { SupplierPaymentDialog } from './suppliers/SupplierPaymentDialog';
import { SupplierPaymentDetailDialog } from './suppliers/SupplierPaymentDetailDialog';

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
  
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);
  const [detailPayment, setDetailPayment] = useState<SupplierPayment | null>(null);

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

  const getSupplierPayments = (supName: string, supId: string | null) => {
    return payments.filter(p => {
      if (supId && p.supplier_id && p.supplier_id === supId) {
        return true;
      }
      if (p.supplier_id) {
        const matched = catalog.find(c => c.id === p.supplier_id);
        if (matched && matched.name.trim().toLowerCase() === supName.trim().toLowerCase()) {
          return true;
        }
      }
      const pName = (p.supplier_name || '').trim().toLowerCase();
      const sName = (supName || '').trim().toLowerCase();
      if (pName === sName) {
        return true;
      }
      if (p.supplier_id) {
        const linked = catalog.find(c => c.id === p.supplier_id);
        if (linked && linked.name.trim().toLowerCase() === sName) {
          return true;
        }
      }
      return false;
    });
  };

  const getSupplierPaid = (supName: string, supId: string | null) => {
    const paid: Record<string, number> = {};
    getSupplierPayments(supName, supId).forEach(p => { paid[p.currency] = (paid[p.currency] || 0) + p.amount; });
    return paid;
  };

  const orphanedPayments = useMemo(() => {
    return payments.filter(p => {
      return !suppliers.some(sup => {
        if (sup.id && p.supplier_id && p.supplier_id === sup.id) return true;
        if (p.supplier_id) {
          const matched = catalog.find(c => c.id === p.supplier_id);
          if (matched && matched.name.trim().toLowerCase() === sup.name.trim().toLowerCase()) return true;
        }
        if ((p.supplier_name || '').trim().toLowerCase() === (sup.name || '').trim().toLowerCase()) return true;
        if (p.supplier_id) {
          const linked = catalog.find(c => c.id === p.supplier_id);
          if (linked && linked.name.trim().toLowerCase() === (sup.name || '').trim().toLowerCase()) return true;
        }
        return false;
      });
    });
  }, [payments, suppliers, catalog]);

  const findCatalogMatch = (name: string): CatalogSupplier | null => {
    const norm = name.trim().toLowerCase();
    return catalog.find(s => s.name.trim().toLowerCase() === norm) || null;
  };

  const openPayment = (supplier: { name: string; id: string | null }) => {
    setSelectedSupplier(supplier);
    setEditingPayment(null);
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
    setDialogOpen(true);
  };

  const openEdit = (payment: SupplierPayment) => {
    setSelectedSupplier({ name: payment.supplier_name, id: payment.supplier_id });
    setEditingPayment(payment);
    setResolvedSupplierId(payment.supplier_id);
    setAutoMatched(false);
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

  const handleSave = async (lines: any[], paymentDate: string) => {
    if (!user || !selectedSupplier || !resolvedSupplierId) return;
    const supplierName = catalog.find(c => c.id === resolvedSupplierId)?.name || selectedSupplier.name;

    if (editingPayment) {
      const line = lines[0];
      const payload = {
        supplier_name: supplierName,
        supplier_id: resolvedSupplierId,
        amount: line.amount,
        currency: line.currency,
        payment_date: paymentDate,
        payment_method: line.payment_method,
        reference: line.reference,
        notes: line.notes,
      };
      const { error } = await supabase.from('file_supplier_payments' as any).update(payload as any).eq('id', editingPayment.id);
      if (error) { toast.error('Error al actualizar pago'); return; }
    } else {
      const promises = lines.map(line => {
        const payload = {
          supplier_name: supplierName,
          supplier_id: resolvedSupplierId,
          amount: line.amount,
          currency: line.currency,
          payment_date: paymentDate,
          payment_method: line.payment_method,
          reference: line.reference,
          notes: line.notes,
          file_id: fileId,
          user_id: user.id,
        };
        return supabase.from('file_supplier_payments' as any).insert(payload as any);
      });
      const results = await Promise.all(promises);
      const firstError = results.find(r => r.error);
      if (firstError) { toast.error('Error al registrar algunos pagos'); return; }
    }

    toast.success(editingPayment ? 'Pago actualizado y reflejado en cuenta corriente' : 'Pagos registrados y reflejados en cuenta corriente');
    setDialogOpen(false);
    setEditingPayment(null);
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

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold">Operadores / Proveedores ({suppliers.length})</h3>
      </div>

      {suppliers.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No hay proveedores en los servicios del expediente</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {suppliers.map(sup => (
            <SupplierCard
              key={sup.name}
              supplier={sup}
              paid={getSupplierPaid(sup.name, sup.id)}
              payments={getSupplierPayments(sup.name, sup.id)}
              catalog={catalog}
              onOpenPayment={openPayment}
              onOpenEdit={openEdit}
              onOpenDetail={setDetailPayment}
              onDelete={setDeleteId}
              getMethodLabel={getMethodLabel}
              formatMoney={formatMoney}
            />
          ))}
        </div>
      )}

      <SupplierPaymentDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingPayment(null); }}
        editingPayment={editingPayment}
        selectedSupplier={selectedSupplier}
        resolvedSupplierId={resolvedSupplierId}
        setResolvedSupplierId={setResolvedSupplierId}
        autoMatched={autoMatched}
        setAutoMatched={setAutoMatched}
        catalog={catalog}
        findCatalogMatch={findCatalogMatch}
        createSupplierFromName={createSupplierFromName}
        comboOpen={comboOpen}
        setComboOpen={setComboOpen}
        onSave={handleSave}
        defaultCurrency={currency}
        supplierCosts={selectedSupplier ? (suppliers.find(s => s.name === selectedSupplier.name)?.costs || {}) : {}}
        supplierPaid={selectedSupplier ? getSupplierPaid(selectedSupplier.name, selectedSupplier.id) : {}}
      />

      <SupplierPaymentDetailDialog
        payment={detailPayment}
        onOpenChange={(open) => !open && setDetailPayment(null)}
        catalog={catalog}
        getMethodLabel={getMethodLabel}
      />

      {orphanedPayments.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Otros pagos en este expediente</h4>
          <Card className="border-amber-200/60 bg-amber-50/5">
            <CardContent className="p-3 sm:p-4 space-y-2">
              {orphanedPayments.map(p => (
                <div key={p.id} className="flex items-start justify-between gap-2 rounded bg-muted/50 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                      <span className="font-semibold text-amber-600 dark:text-amber-500">{p.supplier_name}</span>
                      <span className="font-medium">{p.currency} {p.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString('es-AR')} · {getMethodLabel(p.payment_method)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => setDetailPayment(p)} title="Ver detalle">
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => openEdit(p)} title="Editar pago">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => setDeleteId(p.id)} title="Eliminar pago">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

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
