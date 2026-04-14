import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, FileText, Download, PlusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { generateReceiptPDF } from '@/components/files/receiptPdfUtils';

interface Receipt {
  id: string;
  receipt_number: number;
  client_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_date: string;
  concept: string;
  notes: string;
  created_at: string;
}

interface ReceiptItem {
  id?: string;
  amount: number;
  currency: string;
  payment_method: string;
  exchange_rate: number | null;
  service_currency: string | null;
  notes: string;
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

const emptyItem = (): ReceiptItem => ({
  amount: 0, currency: 'USD', payment_method: 'transfer', exchange_rate: null, service_currency: null, notes: '',
});

interface Props { fileId: string; clientName: string; currency: string; clientId?: string | null; }

export function FileReceiptsTab({ fileId, clientName, currency, clientId }: Props) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_name: clientName, payment_date: new Date().toISOString().split('T')[0], concept: '', notes: '',
  });
  const [items, setItems] = useState<ReceiptItem[]>([{ ...emptyItem(), currency }]);

  const load = async () => {
    const { data } = await supabase.from('file_receipts').select('*').eq('file_id', fileId).order('receipt_number', { ascending: false });
    setReceipts((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fileId]);

  const openNew = () => {
    setForm({ client_name: clientName, payment_date: new Date().toISOString().split('T')[0], concept: '', notes: '' });
    setItems([{ ...emptyItem(), currency }]);
    setDialogOpen(true);
  };

  const updateItem = (idx: number, patch: Partial<ReceiptItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totalAmount = items.reduce((sum, it) => sum + it.amount, 0);

  const handleSave = async () => {
    if (!user) return;
    if (items.every(it => it.amount <= 0)) { toast.error('Al menos una línea debe tener monto > 0'); return; }
    if (!form.concept.trim()) { toast.error('Ingresá un concepto'); return; }

    // Use first item's currency as the receipt main currency, total as sum
    const mainCurrency = items[0].currency;
    const mainMethod = items[0].payment_method;

    const { data: receiptData, error } = await supabase.from('file_receipts').insert({
      file_id: fileId, user_id: user.id,
      client_name: form.client_name, amount: totalAmount, currency: mainCurrency,
      payment_method: mainMethod, payment_date: form.payment_date,
      concept: form.concept, notes: form.notes,
    } as any).select().single();

    if (error || !receiptData) { toast.error('Error al crear recibo'); return; }

    // Insert receipt items
    const receiptId = (receiptData as any).id;
    const itemsToInsert = items.filter(it => it.amount > 0).map(it => ({
      receipt_id: receiptId, user_id: user.id,
      amount: it.amount, currency: it.currency, payment_method: it.payment_method,
      exchange_rate: it.exchange_rate, service_currency: it.service_currency, notes: it.notes,
    }));

    if (itemsToInsert.length > 0) {
      await supabase.from('file_receipt_items' as any).insert(itemsToInsert as any);
    }

    // Auto-insert credit movements in client account for each item
    if (clientId) {
      for (const it of items.filter(i => i.amount > 0)) {
        await supabase.from('account_movements' as any).insert({
          user_id: user.id, account_type: 'client', account_id: clientId,
          file_id: fileId, movement_type: 'credit', amount: it.amount,
          currency: it.currency, concept: `Recibo: ${form.concept}`,
          reference: null, movement_date: form.payment_date,
        } as any);
      }
    }

    toast.success('Recibo generado');
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    // Delete receipt items first
    await supabase.from('file_receipt_items' as any).delete().eq('receipt_id', deleteId);
    await supabase.from('file_receipts').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Recibo eliminado');
    load();
  };

  const downloadReceipt = async (r: Receipt) => {
    let agency = { name: '', phone: '', address: '', cuit: '', email: '', logo_url: '' };
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (data) agency = { name: (data as any).agency_name || '', phone: (data as any).phone || '', address: (data as any).address || '', cuit: (data as any).cuit || '', email: (data as any).email || '', logo_url: (data as any).logo_url || '' };
    }
    await generateReceiptPDF(r, agency);
  };

  const getMethodLabel = (v: string) => METHODS.find(m => m.value === v)?.label || v;

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando recibos...</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Recibos ({receipts.length})</h3>
        <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nuevo recibo</Button>
      </div>

      {receipts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No hay recibos emitidos</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {receipts.map(r => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-4 p-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">REC-{String(r.receipt_number).padStart(4, '0')}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.payment_date).toLocaleDateString('es-AR')}</span>
                  </div>
                  <p className="truncate text-sm">{r.concept}</p>
                  <p className="text-xs text-muted-foreground">{r.client_name} · {getMethodLabel(r.payment_method)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{r.currency} {r.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => downloadReceipt(r)} title="Descargar PDF"><Download className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>Nuevo recibo</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Cliente</label>
                <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha de pago</label>
                <Input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Concepto *</label>
              <Input value={form.concept} onChange={e => setForm({ ...form, concept: e.target.value })} placeholder="Ej: Seña paquete Caribe" />
            </div>

            {/* Payment lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Líneas de pago</label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setItems([...items, { ...emptyItem(), currency }])}>
                  <PlusCircle className="mr-1 h-4 w-4" />Agregar línea
                </Button>
              </div>
              {items.map((item, idx) => (
                <Card key={idx} className="p-3">
                  <div className="grid gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium">Monto *</label>
                        <Input type="number" min={0} step="0.01" value={item.amount} onChange={e => updateItem(idx, { amount: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Moneda pago</label>
                        <Select value={item.currency} onValueChange={v => updateItem(idx, { currency: v })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Método</label>
                        <Select value={item.payment_method} onValueChange={v => updateItem(idx, { payment_method: v })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium">Moneda servicio</label>
                        <Select value={item.service_currency || ''} onValueChange={v => updateItem(idx, { service_currency: v || null })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Sin conversión</SelectItem>
                            {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Cotización</label>
                        <Input type="number" min={0} step="0.01" placeholder="Ej: 1200" value={item.exchange_rate ?? ''} onChange={e => updateItem(idx, { exchange_rate: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                      <div className="flex items-end">
                        {items.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="h-9 text-destructive" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Notas</label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <Button onClick={handleSave}>Generar recibo</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recibo?</AlertDialogTitle>
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
}
