import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Receipt, ExternalLink, Filter, FileSpreadsheet, FileDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';
import { NewMovementDialog } from './NewMovementDialog';
import {
  exportStatementExcel,
  exportStatementPDF,
  type StatementMovement,
} from '@/lib/exportAccountStatement';

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
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filtros
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  const load = async () => {
    setLoading(true);
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

  // Monedas disponibles
  const availableCurrencies = useMemo(() => {
    const set = new Set(movements.map(m => m.currency));
    return Array.from(set);
  }, [movements]);

  // Aplicar filtros
  const filtered = useMemo(() => {
    return movements.filter(m => {
      if (dateFrom && m.movement_date < dateFrom) return false;
      if (dateTo && m.movement_date > dateTo) return false;
      if (typeFilter !== 'all' && m.movement_type !== typeFilter) return false;
      if (currencyFilter !== 'all' && m.currency !== currencyFilter) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const matches =
          m.concept.toLowerCase().includes(q) ||
          (m.reference || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [movements, dateFrom, dateTo, typeFilter, currencyFilter, searchText]);

  // Saldo progresivo por moneda (basado en filtrados)
  const { movementsWithBalance, finalBalances } = useMemo(() => {
    const balances: Record<string, number> = {};
    const list = filtered.map(m => {
      const curr = m.currency;
      if (!balances[curr]) balances[curr] = 0;
      balances[curr] += m.movement_type === 'credit' ? m.amount : -m.amount;
      return { ...m, runningBalance: balances[curr] };
    });
    return { movementsWithBalance: list, finalBalances: Object.entries(balances) };
  }, [filtered]);

  const handleExportExcel = () => {
    const currencies = currencyFilter !== 'all' ? [currencyFilter] : availableCurrencies;
    if (currencies.length === 0) {
      toast.error('No hay movimientos para exportar');
      return;
    }
    currencies.forEach(curr => {
      const list = movementsWithBalance.filter(m => m.currency === curr);
      const stmts: StatementMovement[] = list.map(m => ({
        date: m.movement_date,
        concept: m.concept,
        reference: m.reference,
        fileNumber: m.file_id ? m.file_id.slice(0, 8) : null,
        debit: m.movement_type === 'debit' ? m.amount : 0,
        credit: m.movement_type === 'credit' ? m.amount : 0,
        balance: m.runningBalance,
      }));
      exportStatementExcel(
        {
          accountName,
          accountType,
          currency: curr,
          periodFrom: dateFrom,
          periodTo: dateTo,
        },
        stmts,
        {
          name: settings.agency_name,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          cuit: settings.cuit,
          logoUrl: settings.logo_url,
          footerLegal: settings.pdf_footer_legal,
        },
      );
    });
    toast.success('Excel descargado');
  };

  const handleExportPDF = () => {
    const currencies = currencyFilter !== 'all' ? [currencyFilter] : availableCurrencies;
    if (currencies.length === 0) {
      toast.error('No hay movimientos para exportar');
      return;
    }
    currencies.forEach(curr => {
      const list = movementsWithBalance.filter(m => m.currency === curr);
      const stmts: StatementMovement[] = list.map(m => ({
        date: m.movement_date,
        concept: m.concept,
        reference: m.reference,
        fileNumber: m.file_id ? m.file_id.slice(0, 8) : null,
        debit: m.movement_type === 'debit' ? m.amount : 0,
        credit: m.movement_type === 'credit' ? m.amount : 0,
        balance: m.runningBalance,
      }));
      exportStatementPDF(
        {
          accountName,
          accountType,
          currency: curr,
          periodFrom: dateFrom,
          periodTo: dateTo,
        },
        stmts,
        {
          name: settings.agency_name,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          cuit: settings.cuit,
          logoUrl: settings.logo_url,
          footerLegal: settings.pdf_footer_legal,
        },
      );
    });
    toast.success('PDF descargado');
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setTypeFilter('all');
    setCurrencyFilter('all');
    setSearchText('');
  };

  const hasActiveFilters = dateFrom || dateTo || typeFilter !== 'all' || currencyFilter !== 'all' || searchText;

  return (
    <>
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="truncate">{accountName} — Cuenta Corriente</span>
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

          {/* Filtros */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" /> Filtros
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={clearFilters}>
                  Limpiar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={typeFilter} onValueChange={v => setTypeFilter(v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="credit">Haber</SelectItem>
                    <SelectItem value="debit">Debe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {availableCurrencies.length > 1 && (
                <div>
                  <Label className="text-xs">Moneda</Label>
                  <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Input
              placeholder="Buscar concepto o referencia..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Acciones de exportación */}
          {movementsWithBalance.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-1 h-3 w-3" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileDown className="mr-1 h-3 w-3" /> PDF
              </Button>
            </div>
          )}

          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : movementsWithBalance.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {movements.length === 0 ? 'Sin movimientos registrados' : 'Ningún movimiento coincide con los filtros'}
            </p>
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
                      {m.receipt_id ? (
                        <Receipt className="h-3 w-3 flex-shrink-0 text-primary" />
                      ) : m.movement_type === 'credit' ? (
                        <ArrowUpRight className="h-3 w-3 flex-shrink-0 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 flex-shrink-0 text-red-600" />
                      )}
                      <span className="truncate">{m.concept}</span>
                      {m.file_id && (
                        <button
                          type="button"
                          onClick={() => { onClose(); navigate(`/files/${m.file_id}`); }}
                          className="text-primary hover:underline ml-1"
                          title="Ver expediente"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
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
