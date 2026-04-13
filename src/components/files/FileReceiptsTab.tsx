import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, FileText, Download } from 'lucide-react';
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

const METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit_card', label: 'Tarjeta de Crédito' },
  { value: 'debit_card', label: 'Tarjeta de Débito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' },
];

interface Props { fileId: string; clientName: string; currency: string; }

export function FileReceiptsTab({ fileId, clientName, currency }: Props) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_name: clientName, amount: 0, currency, payment_method: 'transfer',
    payment_date: new Date().toISOString().split('T')[0], concept: '', notes: '',
  });

  const load = async () => {
    const { data } = await supabase.from('file_receipts').select('*').eq('file_id', fileId).order('receipt_number', { ascending: false });
    setReceipts((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fileId]);

  const openNew = () => {
    setForm({ client_name: clientName, amount: 0, currency, payment_method: 'transfer', payment_date: new Date().toISOString().split('T')[0], concept: '', notes: '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (form.amount <= 0) { toast.error('El monto debe ser mayor a 0'); return; }
    if (!form.concept.trim()) { toast.error('Ingresá un concepto'); return; }
    const { error } = await supabase.from('file_receipts').insert({ ...form, file_id: fileId, user_id: user.id });
    if (error) toast.error('Error al crear recibo');
    else toast.success('Recibo generado');
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('file_receipts').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Recibo eliminado');
    load();
  };

  const downloadReceipt = async (r: Receipt) => {
    // Fetch agency profile for receipt header
    let agency = { name: '', phone: '', address: '', cuit: '', email: '' };
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (data) agency = { name: (data as any).agency_name || '', phone: (data as any).phone || '', address: (data as any).address || '', cuit: (data as any).cuit || '', email: (data as any).email || '' };
    }
    generateReceiptPDF(r, agency);
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo recibo</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Cliente</label>
              <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Monto *</label>
                <Input type="number" min={0} step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Moneda</label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="BRL">BRL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Método de pago</label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
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
