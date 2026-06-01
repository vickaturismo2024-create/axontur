import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import { ServiceRecord, SupplierPayment, CatalogSupplier, METHODS } from './suppliers/types';
import { SupplierCard } from './suppliers/SupplierCard';
import { SupplierPaymentDialog } from './suppliers/SupplierPaymentDialog';

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
              paid={getSupplierPaid(sup.name)}
              payments={getSupplierPayments(sup.name)}
              catalog={catalog}
              onOpenPayment={openPayment}
              onOpenEdit={openEdit}
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
      />

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
