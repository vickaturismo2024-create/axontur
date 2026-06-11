import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, ArrowRight, CheckCircle2, AlertTriangle, Truck } from 'lucide-react';
import { SupplierPaymentDialog } from './suppliers/SupplierPaymentDialog';
import { CatalogSupplier, SupplierPayment } from './suppliers/types';
import { toast } from 'sonner';
import { TransferSupplierCreditDialog } from './TransferSupplierCreditDialog';

interface Props {
  fileId: string;
  currency: string;
}

interface ServiceRecord {
  supplier_name: string | null;
  supplier_id: string | null;
  cost: number;
  currency: string;
  status: string;
}

interface SupplierDebt {
  name: string;
  id: string | null;
  costByCurrency: Record<string, number>;
  paidByCurrency: Record<string, number>;
}

export function FileDebtsTab({ fileId, currency }: Props) {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [catalog, setCatalog] = useState<CatalogSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for payment dialog trigger
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<{ name: string; id: string | null } | null>(null);
  const [resolvedSupplierId, setResolvedSupplierId] = useState<string | null>(null);
  const [autoMatched, setAutoMatched] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    currency,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    reference: '',
    notes: '',
  });

  // Transfer state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferSupplier, setTransferSupplier] = useState<{ id: string, name: string } | null>(null);
  const [transferCurrency, setTransferCurrency] = useState('');
  const [transferMaxAmount, setTransferMaxAmount] = useState(0);

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const [svcRes, payRes, supRes] = await Promise.all([
      supabase
        .from('file_services')
        .select('supplier_name, supplier_id, cost, currency, status')
        .eq('file_id', fileId),
      supabase
        .from('file_supplier_payments' as any)
        .select('*')
        .eq('file_id', fileId)
        .order('payment_date', { ascending: false }),
      supabase
        .from('suppliers')
        .select('id, name')
        .eq('user_id', userData.user.id)
        .order('name'),
    ]);

    setServices((svcRes.data as any[]) || []);
    setPayments((payRes.data as any[]) || []);
    setCatalog((supRes.data as CatalogSupplier[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [fileId]);

  const supplierDebts = useMemo(() => {
    const map = new Map<string, SupplierDebt>();

    // 1. Group costs
    services
      .filter((s) => s.supplier_name && s.status !== 'cancelled')
      .forEach((s) => {
        const key = s.supplier_name!;
        if (!map.has(key)) {
          map.set(key, {
            name: key,
            id: s.supplier_id,
            costByCurrency: {},
            paidByCurrency: {},
          });
        }
        const entry = map.get(key)!;
        entry.costByCurrency[s.currency] = (entry.costByCurrency[s.currency] || 0) + s.cost;
      });

    // 2. Group payments (even if supplier has no services but has payments recorded)
    payments.forEach((p) => {
      const key = p.supplier_name;
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          id: p.supplier_id,
          costByCurrency: {},
          paidByCurrency: {},
        });
      }
      const entry = map.get(key)!;
      entry.paidByCurrency[p.currency] = (entry.paidByCurrency[p.currency] || 0) + p.amount;
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [services, payments]);

  const findCatalogMatch = (name: string): CatalogSupplier | null => {
    const norm = name.trim().toLowerCase();
    return catalog.find((s) => s.name.trim().toLowerCase() === norm) || null;
  };

  const openPayment = (supplier: { name: string; id: string | null }) => {
    setSelectedSupplier(supplier);
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
    setPaymentForm({
      amount: 0,
      currency,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'transfer',
      reference: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const createSupplierFromName = async (name: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    const trimmed = name.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ user_id: userData.user.id, name: trimmed, type: '' })
      .select('id, name')
      .single();
      
    if (error || !data) {
      toast.error('No se pudo crear el proveedor');
      return;
    }
    setCatalog((prev) => [...prev, data as CatalogSupplier].sort((a, b) => a.name.localeCompare(b.name)));
    setResolvedSupplierId(data.id);
    setAutoMatched(false);
    setComboOpen(false);
    toast.success(`Proveedor «${data.name}» creado`);
  };

  const handleSavePayment = async (lines: any[], paymentDate: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user || !selectedSupplier) return;
    
    if (!resolvedSupplierId) {
      toast.error('Debe enlazar el pago a un proveedor del catálogo');
      return;
    }

    const supplierName = catalog.find((c) => c.id === resolvedSupplierId)?.name || selectedSupplier.name;

    const payloads = lines.map(line => ({
      supplier_name: supplierName,
      supplier_id: resolvedSupplierId,
      amount: line.amount,
      currency: line.currency,
      payment_date: paymentDate,
      payment_method: line.payment_method,
      reference: line.reference,
      notes: line.notes,
      linked_receipt_id: line.linked_receipt_id || null,
      file_id: fileId,
      user_id: userData.user.id,
    }));

    const { error } = await supabase.from('file_supplier_payments' as any).insert(payloads as any);

    if (error) {
      toast.error('Error al registrar pago');
      return;
    }

    toast.success('Pago registrado y reflejado en cuenta corriente');
    setDialogOpen(false);
    load();
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando deudas...</div>;

  return (
    <div className="space-y-4 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Control de Deudas a Proveedores</h3>
      </div>

      {supplierDebts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500/50 mb-3" />
            <p className="text-sm">No hay deudas cargadas</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Todos los saldos de proveedores están limpios o no hay servicios registrados en este expediente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {supplierDebts.map((deb) => {
            // Get all currencies involved for this supplier
            const currencies = Array.from(
              new Set([...Object.keys(deb.costByCurrency), ...Object.keys(deb.paidByCurrency)])
            );

            return (
              <Card key={deb.name} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Supplier info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{deb.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {deb.id ? 'Catálogo enlazado' : 'Proveedor temporal'}
                        </p>
                      </div>
                    </div>

                    {/* Balances list */}
                    <div className="flex-1 space-y-2 max-w-xl">
                      {currencies.map((cur) => {
                        const cost = deb.costByCurrency[cur] || 0;
                        const paid = deb.paidByCurrency[cur] || 0;
                        const balance = cost - paid;
                        const settled = balance <= 0;

                        return (
                          <div
                            key={cur}
                            className="flex flex-wrap items-center justify-between text-xs gap-x-4 border-b border-border/20 last:border-b-0 pb-1.5 last:pb-0"
                          >
                            <span className="font-medium font-mono text-muted-foreground">{cur}</span>
                            <div className="flex items-center gap-6">
                              <div>
                                <span className="text-muted-foreground">Costo: </span>
                                <span className="font-semibold">{cost.toLocaleString('es-AR')}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Pagado: </span>
                                <span className="font-semibold text-emerald-600">{paid.toLocaleString('es-AR')}</span>
                              </div>
                              <div className="min-w-[100px] text-right">
                                <Badge
                                  variant={settled ? 'default' : 'destructive'}
                                  className={settled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0' : 'animate-pulse'}
                                >
                                  {settled ? (
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" /> Saldado
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> Debe {balance.toLocaleString('es-AR')}
                                    </span>
                                  )}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pay/Transfer trigger */}
                    <div className="shrink-0 flex items-center justify-end gap-2 mt-4 sm:mt-0">
                      {currencies.some(cur => (deb.costByCurrency[cur] || 0) - (deb.paidByCurrency[cur] || 0) < 0) && (
                        <div className="flex gap-2 mr-2">
                           {currencies.filter(cur => (deb.costByCurrency[cur] || 0) - (deb.paidByCurrency[cur] || 0) < 0).map(cur => {
                             const fav = Math.abs((deb.costByCurrency[cur] || 0) - (deb.paidByCurrency[cur] || 0));
                             return (
                               <Button key={`tr-${cur}`} size="sm" variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" onClick={() => {
                                  setTransferSupplier({ id: deb.id || '', name: deb.name });
                                  setTransferCurrency(cur);
                                  setTransferMaxAmount(fav);
                                  setTransferDialogOpen(true);
                               }}>
                                 Transferir A Favor ({cur} {fav.toLocaleString('es-AR')})
                               </Button>
                             )
                           })}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPayment({ name: deb.name, id: deb.id })}
                        className="gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        <DollarSign className="h-4 w-4" /> Registrar Pago <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Supplier Payment Dialog */}
      <SupplierPaymentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
        }}
        fileId={fileId}
        editingPayment={null}
        selectedSupplier={selectedSupplier}
        resolvedSupplierId={resolvedSupplierId}
        setResolvedSupplierId={setResolvedSupplierId}
        autoMatched={autoMatched}
        setAutoMatched={setAutoMatched}
        catalog={catalog}
        findCatalogMatch={findCatalogMatch}
        createSupplierFromName={createSupplierFromName}
        form={paymentForm}
        setForm={setPaymentForm}
        comboOpen={comboOpen}
        setComboOpen={setComboOpen}
        onSave={handleSavePayment}
      />

      {transferSupplier && (
        <TransferSupplierCreditDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          sourceFileId={fileId}
          supplierId={transferSupplier.id}
          supplierName={transferSupplier.name}
          maxAmount={transferMaxAmount}
          currency={transferCurrency}
          onSuccess={() => {
            load();
          }}
        />
      )}
    </div>
  );
}
