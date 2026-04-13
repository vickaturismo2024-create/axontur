import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  method: string;
  status: string;
  notes: string;
}

interface PaymentsSectionProps {
  quoteId: string;
  quoteCurrency: string;
  totalPrice: number;
  clientId?: string | null;
}

const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit_card', label: 'Tarjeta de Crédito' },
  { value: 'debit_card', label: 'Tarjeta de Débito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' },
];

const getMethodLabel = (value: string) => PAYMENT_METHODS.find(m => m.value === value)?.label || value || '—';

export function PaymentsSection({ quoteId, quoteCurrency, totalPrice, clientId }: PaymentsSectionProps) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    currency: quoteCurrency || 'USD',
    payment_date: new Date().toISOString().split('T')[0],
    method: 'transfer',
    status: 'confirmed',
    notes: '',
  });

  const fetchPayments = async () => {
    if (!quoteId || !user) return;
    const { data, error } = await supabase
      .from('payments' as any)
      .select('*')
      .eq('quote_id', quoteId)
      .order('payment_date', { ascending: false });
    if (error) { console.error(error); return; }
    setPayments((data || []).map((p: any) => ({
      id: p.id, amount: Number(p.amount), currency: p.currency, payment_date: p.payment_date,
      method: p.method || '', status: p.status, notes: p.notes || '',
    })));
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [quoteId, user]);

  const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
  const pending = totalPrice - totalPaid;
  const progressPercent = totalPrice > 0 ? Math.min(100, Math.round((totalPaid / totalPrice) * 100)) : 0;

  const handleAdd = async () => {
    if (!user || !quoteId) return;
    try {
      const { error } = await supabase.from('payments' as any).insert([{
        ...newPayment,
        quote_id: quoteId,
        user_id: user.id,
      }] as any);
      if (error) throw error;

      // Auto-insert movement if confirmed and client linked
      if (newPayment.status === 'confirmed' && clientId) {
        await supabase.from('account_movements' as any).insert({
          user_id: user.id,
          account_type: 'client',
          account_id: clientId,
          movement_type: 'credit',
          amount: newPayment.amount,
          currency: newPayment.currency || quoteCurrency,
          concept: `Pago presupuesto`,
          movement_date: newPayment.payment_date,
          notes: newPayment.notes || null,
        } as any);
      }

      toast.success('Pago registrado');
      setAdding(false);
      setNewPayment({ amount: 0, currency: quoteCurrency, payment_date: new Date().toISOString().split('T')[0], method: 'transfer', status: 'pending', notes: '' });
      fetchPayments();
    } catch (e) {
      console.error(e);
      toast.error('Error al registrar el pago');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('payments' as any).delete().eq('id', id);
      setPayments(prev => prev.filter(p => p.id !== id));
      toast.success('Pago eliminado');
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusToggle = async (payment: Payment) => {
    const newStatus = payment.status === 'confirmed' ? 'pending' : 'confirmed';
    try {
      await supabase.from('payments' as any).update({ status: newStatus } as any).eq('id', payment.id);
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: newStatus } : p));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Pagos</span>
          <Button variant="outline" size="sm" onClick={() => setAdding(!adding)}>
            <Plus className="mr-1 h-3 w-3" /> Agregar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        {totalPrice > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progressPercent}% cobrado</span>
              <span>{quoteCurrency} {totalPaid.toLocaleString()} / {totalPrice.toLocaleString()}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Summary */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-medium">{quoteCurrency} {totalPrice.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Pagado: </span>
            <span className="font-medium text-green-600">{quoteCurrency} {totalPaid.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Pendiente: </span>
            <span className={`font-medium ${pending > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {quoteCurrency} {pending.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Add form */}
        {adding && (
          <div className="rounded-md border p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs">Monto</Label>
                <Input type="number" value={newPayment.amount || ''} onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={newPayment.payment_date} onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Método</Label>
                <Select value={newPayment.method} onValueChange={(v) => setNewPayment({ ...newPayment, method: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                placeholder="Referencia, detalle del pago..."
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={newPayment.status} onValueChange={(v) => setNewPayment({ ...newPayment, status: v })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd} disabled={!newPayment.amount}>Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Payments list */}
        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando pagos...</p>
        ) : payments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin pagos registrados</p>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="rounded-md border px-3 py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={p.status === 'confirmed' ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleStatusToggle(p)}
                    >
                      {p.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                    </Badge>
                    <span className="font-medium text-sm">{p.currency} {p.amount.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">{p.payment_date}</span>
                    <span className="text-xs text-muted-foreground">· {getMethodLabel(p.method)}</span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará el pago de {p.currency} {p.amount.toLocaleString()} del {p.payment_date}. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(p.id)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {p.notes && (
                  <p className="text-xs text-muted-foreground pl-1">{p.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
