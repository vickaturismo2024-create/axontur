import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Receipt, ExternalLink } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { NewMovementDialog } from './NewMovementDialog';

interface Movement {
  id: string;
  movement_type: string;
  amount: number;
  currency: string;
  concept: string;
  reference: string | null;
  movement_date: string;
  notes: string | null;
  file_id: string | null;
  receipt_id: string | null;
  created_at: string;
}

interface Props {
  accountId: string;
  accountName: string;
  accountType: 'client' | 'supplier';
  open: boolean;
  onClose: () => void;
}

export function AccountDetail({ accountId, accountName, accountType, open, onClose }: Props) {
  const { user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('account_movements' as any)
      .select('*')
      .eq('account_type', accountType)
      .eq('account_id', accountId)
      .order('movement_date', { ascending: true });
    setMovements((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, accountId]);

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('account_movements' as any).delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Movimiento eliminado');
    load();
  };

  // Calculate progressive balance per currency
  const balances: Record<string, number> = {};
  const movementsWithBalance = movements.map(m => {
    const curr = m.currency;
    if (!balances[curr]) balances[curr] = 0;
    balances[curr] += m.movement_type === 'credit' ? m.amount : -m.amount;
    return { ...m, runningBalance: balances[curr] };
  });

  // Final balances
  const finalBalances = Object.entries(balances);

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{accountName} — Cuenta Corriente</span>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="mr-1 h-3 w-3" /> Movimiento
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Balance summary */}
          {finalBalances.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {finalBalances.map(([curr, bal]) => (
                <Badge key={curr} variant={bal > 0 ? 'default' : bal < 0 ? 'destructive' : 'secondary'} className="text-sm px-3 py-1">
                  Saldo {curr}: {bal >= 0 ? '+' : ''}{bal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Badge>
              ))}
            </div>
          )}

          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : movementsWithBalance.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos registrados</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[90px_1fr_100px_100px_40px] gap-2 text-xs font-medium text-muted-foreground px-2">
                <span>Fecha</span><span>Concepto</span><span className="text-right">Monto</span><span className="text-right">Saldo</span><span />
              </div>
              {[...movementsWithBalance].reverse().map(m => (
                <div key={m.id} className="grid grid-cols-[90px_1fr_100px_100px_40px] gap-2 items-center rounded-md border px-2 py-1.5 text-sm">
                  <span className="text-xs text-muted-foreground">{new Date(m.movement_date).toLocaleDateString('es-AR')}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      {m.movement_type === 'credit' ? (
                        <ArrowUpRight className="h-3 w-3 flex-shrink-0 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 flex-shrink-0 text-red-600" />
                      )}
                      <span className="truncate">{m.concept}</span>
                    </div>
                    {m.reference && <span className="text-xs text-muted-foreground">Ref: {m.reference}</span>}
                  </div>
                  <span className={`text-right font-mono text-xs ${m.movement_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {m.movement_type === 'credit' ? '+' : '-'}{m.currency} {m.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-right font-mono text-xs">
                    {m.currency} {m.runningBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(m.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <NewMovementDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        accountId={accountId}
        accountType={accountType}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
