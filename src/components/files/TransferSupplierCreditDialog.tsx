import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { METHODS } from '@/components/files/receipts/types';
import { Search } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFileId: string;
  supplierId: string;
  supplierName: string;
  maxAmount: number;
  currency: string;
  onSuccess: () => void;
}

export function TransferSupplierCreditDialog({ open, onOpenChange, sourceFileId, supplierId, supplierName, maxAmount, currency, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [destFileId, setDestFileId] = useState('');
  const [amount, setAmount] = useState<number>(maxAmount);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [notes, setNotes] = useState('');
  
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(maxAmount);
      setDestFileId('');
      setNotes('');
      setSearch('');
      setFiles([]);
    }
  }, [open, maxAmount]);

  useEffect(() => {
    if (!search || search.length < 2) {
      setFiles([]);
      return;
    }
    const searchFiles = async () => {
      setSearching(true);
      const { data } = await supabase
        .from('files')
        .select('id, file_number, client_name, destination')
        .neq('id', sourceFileId)
        .ilike('client_name', `%${search}%`)
        .limit(10);
      setFiles(data || []);
      setSearching(false);
    };
    const timer = setTimeout(searchFiles, 300);
    return () => clearTimeout(timer);
  }, [search, sourceFileId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!destFileId) {
      toast.error('Seleccioná un expediente destino');
      return;
    }
    if (amount <= 0 || amount > maxAmount) {
      toast.error(`El monto debe ser entre 0 y el saldo máximo a favor (${maxAmount})`);
      return;
    }

    setLoading(true);
    try {
      // 1. Registrar la transferencia en supplier_credit_transfers
      const { error: transferError } = await supabase
        .from('supplier_credit_transfers' as any)
        .insert({
          supplier_id: supplierId,
          source_file_id: sourceFileId,
          dest_file_id: destFileId,
          amount,
          currency,
          payment_method: paymentMethod,
          user_id: user.id,
          notes: notes || `Crédito a favor de ${supplierName} transferido a otro expediente`,
        });

      if (transferError) throw transferError;

      // 2. Crear un pago a proveedor NEGATIVO en el origen (para descontar el saldo a favor)
      const { error: sourceError } = await supabase
        .from('file_supplier_payments' as any)
        .insert({
          file_id: sourceFileId,
          user_id: user.id,
          supplier_id: supplierId,
          supplier_name: supplierName,
          amount: -amount,
          currency,
          payment_method: paymentMethod,
          reference: 'TRANSF-CREDITO-OUT',
          notes: notes || 'Traspaso de saldo a otro exp.',
        });

      if (sourceError) throw sourceError;

      // 3. Crear un pago a proveedor POSITIVO en el destino (para usar el saldo a favor ahí)
      const { error: destError } = await supabase
        .from('file_supplier_payments' as any)
        .insert({
          file_id: destFileId,
          user_id: user.id,
          supplier_id: supplierId,
          supplier_name: supplierName,
          amount: amount,
          currency,
          payment_method: paymentMethod,
          reference: 'TRANSF-CREDITO-IN',
          notes: notes || `Saldo a favor recibido desde el expediente original`,
        });

      if (destError) throw destError;

      toast.success('Saldo de proveedor transferido exitosamente');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al transferir saldo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transferir Crédito de Proveedor</DialogTitle>
          <DialogDescription>
            Tenés un saldo a favor de <strong className="text-emerald-600">{currency} {maxAmount}</strong> con <strong>{supplierName}</strong> en este expediente. Podés transferirlo para pagar deudas con el mismo proveedor en otro expediente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Buscar Expediente Destino</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente del expediente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {files.length > 0 && (
              <div className="border rounded-md mt-2 max-h-40 overflow-y-auto">
                {files.map(f => (
                  <div
                    key={f.id}
                    className={`p-2 text-sm cursor-pointer hover:bg-accent ${destFileId === f.id ? 'bg-accent font-medium' : ''}`}
                    onClick={() => setDestFileId(f.id)}
                  >
                    Exp. {f.file_number} - {f.client_name} ({f.destination})
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto a transferir</Label>
              <Input
                type="number"
                step="0.01"
                max={maxAmount}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Método Original</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Traspaso de saldo sobrante de tarjeta"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !destFileId}>Transferir Crédito</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
