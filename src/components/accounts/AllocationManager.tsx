import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Link2, Trash2, ArrowRight, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Allocation {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  notes: string | null;
  created_at: string;
}

interface FileOption {
  id: string;
  file_number: number;
  client_name: string;
}

interface Props {
  accountId: string;
  accountType: 'client' | 'supplier';
  accountName: string;
  open: boolean;
  onClose: () => void;
}

export function AllocationManager({ accountId, accountType, accountName, open, onClose }: Props) {
  const { user, agencyId } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileOption[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // New allocation form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    source_type: accountType === 'client' ? 'receipt' : 'supplier_payment',
    source_id: '',
    target_type: 'file',
    target_id: '',
    amount: 0,
    currency: 'USD',
    exchange_rate: 1,
    notes: '',
  });

  // Load allocations for this account
  const loadAllocations = async () => {
    setLoading(true);
    const sourceType = accountType === 'client' ? 'receipt' : 'supplier_payment';
    const { data } = await supabase
      .from('financial_allocations' as any)
      .select('*')
      .eq('source_type', sourceType)
      .eq('source_id', accountId)
      .order('created_at', { ascending: false });

    setAllocations((data as any[] || []) as Allocation[]);
    setLoading(false);
  };

  // Load files for the target selector
  const loadFiles = async () => {
    const q = supabase
      .from('files')
      .select('id, file_number, client_name')
      .order('file_number', { ascending: false })
      .limit(200);
    const { data } = await q;
    setFiles((data as any[] || []) as FileOption[]);
  };

  useEffect(() => {
    if (open) {
      loadAllocations();
      loadFiles();
    }
  }, [open]);

  const handleSave = async () => {
    if (!user || !agencyId) return;
    if (form.amount <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    if (!form.target_id) {
      toast.error('Seleccioná un expediente destino');
      return;
    }

    const { error } = await supabase.from('financial_allocations' as any).insert({
      agency_id: agencyId,
      source_type: form.source_type,
      source_id: form.source_id || accountId,
      target_type: form.target_type,
      target_id: form.target_id,
      amount: form.amount,
      currency: form.currency,
      exchange_rate: form.exchange_rate,
      notes: form.notes || null,
      created_by: user.id,
    } as any);

    if (error) {
      toast.error('Error al guardar aplicación');
      console.error(error);
      return;
    }
    toast.success('Aplicación registrada');
    setForm({
      source_type: accountType === 'client' ? 'receipt' : 'supplier_payment',
      source_id: '',
      target_type: 'file',
      target_id: '',
      amount: 0,
      currency: 'USD',
      exchange_rate: 1,
      notes: '',
    });
    setShowForm(false);
    loadAllocations();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('financial_allocations' as any).delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Aplicación eliminada');
    loadAllocations();
  };

  const sourceLabel = accountType === 'client' ? 'Cobro / Recibo' : 'Pago a Proveedor';
  const targetLabel = 'Expediente';

  // Summary by currency
  const totals = useMemo(() => {
    const map: Record<string, number> = {};
    allocations.forEach(a => {
      if (!map[a.currency]) map[a.currency] = 0;
      map[a.currency] += Number(a.amount);
    });
    return Object.entries(map);
  }, [allocations]);

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="truncate text-base sm:text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Aplicaciones — {accountName}
              </span>
              <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Cancelar' : '+ Nueva Aplicación'}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Totals */}
          {totals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {totals.map(([curr, total]) => (
                <Badge key={curr} variant="outline" className="text-sm px-3 py-1">
                  Aplicado {curr}: {total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Badge>
              ))}
            </div>
          )}

          {/* New allocation form */}
          {showForm && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Nueva aplicación de {sourceLabel.toLowerCase()}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Expediente destino *</Label>
                  <Select value={form.target_id} onValueChange={v => setForm(p => ({ ...p, target_id: v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar expediente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {files.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          EXP-{String(f.file_number).padStart(3, '0')} — {f.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Monto a aplicar *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount || ''}
                    onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))}
                    className="h-8 text-xs font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-xs">Moneda</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="ARS">ARS ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tipo de cambio</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.exchange_rate}
                    onChange={e => setForm(p => ({ ...p, exchange_rate: Number(e.target.value) }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Notas (opcional)</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="text-xs"
                  rows={2}
                  placeholder="Ej: Pago parcial correspondiente a servicios de hotelería"
                />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave}>
                  Guardar Aplicación
                </Button>
              </div>
            </div>
          )}

          {/* Allocations list */}
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : allocations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay aplicaciones registradas para esta cuenta.
            </p>
          ) : (
            <div className="space-y-2">
              {allocations.map(a => {
                const file = files.find(f => f.id === a.target_id);
                const fileLabel = file
                  ? `EXP-${String(file.file_number).padStart(3, '0')} — ${file.client_name}`
                  : `${a.target_id.slice(0, 8)}...`;
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {a.source_type === 'receipt' ? 'Cobro' : a.source_type === 'supplier_payment' ? 'Pago' : a.source_type}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="flex items-center gap-1 text-xs">
                          <FolderOpen className="h-3 w-3" />
                          {fileLabel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(a.created_at).toLocaleDateString('es-AR')}
                        {a.notes ? ` · ${a.notes}` : ''}
                        {a.exchange_rate !== 1 ? ` · TC: ${a.exchange_rate}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-sm font-medium">
                        {a.currency} {Number(a.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDeleteId(a.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar aplicación?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción desvinculará el pago del expediente. El movimiento original no se elimina.</AlertDialogDescription>
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
