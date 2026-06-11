import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, ChevronRight as ChevronRightIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  PiggyBank, 
  CreditCard, 
  Search, 
  RefreshCw, 
  SlidersHorizontal,
  DollarSign,
  Activity,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/layout/Header';
import { PageLoadingScreen } from '@/components/ui/PageLoadingScreen';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface LedgerItem {
  id: string;
  type: 'ingreso' | 'egreso';
  date: string;
  concept: string;
  notes: string;
  currency: string;
  amount: number;
  payment_method: string;
  partyName: string;
  file_id?: string | null;
  receipt_id?: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Banco (Transf.)',
  credit_card: 'Tarjeta de Crédito',
  debit_card: 'Tarjeta de Débito',
  check: 'Cheque',
  other: 'Otro',
};

const getMethodLabel = (val: string) => METHOD_LABELS[val] || val || 'Otro';

async function fetchCajaData() {
  // 1. Fetch receipts (incoming items)
  const { data: receiptItems, error: rError } = await supabase
    .from('file_receipt_items')
    .select('id, amount, currency, receipt_id, payment_method, notes, created_at');

  if (rError) throw rError;

  // 2. Fetch receipts to check status and get client details
  const { data: receipts, error: receiptsError } = await supabase
    .from('file_receipts')
    .select('id, status, client_name, concept, payment_date, file_id');

  if (receiptsError) throw receiptsError;

  // 3. Fetch supplier payments (outgoing)
  const { data: supplierPayments, error: pError } = await supabase
    .from('file_supplier_payments' as any)
    .select('id, amount, currency, payment_method, payment_date, supplier_name, reference, notes, file_id');

  if (pError) throw pError;

  // 4. Fetch incident payments (outgoing costs)
  const { data: incidents, error: iError } = await supabase
    .from('file_incidencias' as any)
    .select('id, monto, moneda, descripcion, fecha, file_id')
    .eq('impacto_caja', true);

  if (iError) throw iError;

  // 5. Fetch wallet transfers
  const { data: walletTransfers, error: wtError } = await supabase
    .from('wallet_transfers' as any)
    .select('*');

  if (wtError) throw wtError;

  const ledger: LedgerItem[] = [];

  // Map receipts
  const receiptMap = new Map((receipts || []).map((r: any) => [r.id, r]));

  (receiptItems || []).forEach((item: any) => {
    const parent = receiptMap.get(item.receipt_id);
    if (parent && parent.status !== 'cancelled') {
      ledger.push({
        id: item.id,
        type: 'ingreso',
        date: parent.payment_date || item.created_at.split('T')[0],
        concept: parent.file_id ? `Cobro: ${parent.client_name} - ${parent.concept}` : parent.concept || 'Cobro Extra',
        notes: item.notes || '',
        currency: item.currency || 'USD',
        amount: Number(item.amount) || 0,
        payment_method: item.payment_method || 'other',
        partyName: parent.file_id ? (parent.client_name || '') : 'Ajuste Extra',
        file_id: parent.file_id || null,
        receipt_id: item.receipt_id,
      });
    }
  });

  // Map supplier payments
  (supplierPayments || []).forEach((pay: any) => {
    ledger.push({
      id: pay.id,
      type: 'egreso',
      date: pay.payment_date || pay.created_at?.split('T')[0],
      concept: pay.file_id ? `Pago Proveedor: ${pay.supplier_name}${pay.reference ? ` (${pay.reference})` : ''}` : pay.notes || 'Pago Extra',
      notes: pay.notes || '',
      currency: pay.currency || 'USD',
      amount: Number(pay.amount) || 0,
      payment_method: pay.payment_method || 'transfer',
      partyName: pay.file_id ? (pay.supplier_name || '') : 'Ajuste Extra',
      file_id: pay.file_id || null,
    });
  });

  // Map incidents
  (incidents || []).forEach((inc: any) => {
    ledger.push({
      id: inc.id,
      type: 'egreso',
      date: inc.fecha || inc.created_at?.split('T')[0],
      concept: `Incidencia: ${inc.descripcion}`,
      notes: `Expediente ID: ${inc.file_id}`,
      currency: inc.moneda || 'ARS',
      amount: Number(inc.monto) || 0,
      payment_method: 'cash',
      partyName: 'Ajuste Operativo',
      file_id: inc.file_id || null,
    });
  });

  // Map wallet transfers
  (walletTransfers || []).forEach((wt: any) => {
    // Outgoing from source method
    ledger.push({
      id: wt.id + '-out',
      type: 'egreso',
      date: wt.created_at?.split('T')[0],
      concept: `Transferencia a ${getMethodLabel(wt.to_method)}`,
      notes: wt.notes || 'Movimiento entre billeteras',
      currency: wt.currency,
      amount: Number(wt.amount) || 0,
      payment_method: wt.from_method,
      partyName: 'Transferencia Interna',
      file_id: null,
    });
    // Incoming to dest method
    ledger.push({
      id: wt.id + '-in',
      type: 'ingreso',
      date: wt.created_at?.split('T')[0],
      concept: `Transferencia desde ${getMethodLabel(wt.from_method)}`,
      notes: wt.notes || 'Movimiento entre billeteras',
      currency: wt.currency,
      amount: Number(wt.amount) || 0,
      payment_method: wt.to_method,
      partyName: 'Transferencia Interna',
      file_id: null,
    });
  });

  // Sort by date descending
  ledger.sort((a, b) => b.date.localeCompare(a.date));

  return {
    ledger
  };
}

export default function CashBox() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search & Filters State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [walletFilter, setWalletFilter] = useState('all');

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, currencyFilter, walletFilter]);

  const { data: cajaData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['caja-ledger', user?.id],
    queryFn: fetchCajaData,
    enabled: !!user,
  });

  const ledger = cajaData?.ledger || [];
  const extraMovements = useMemo(() => {
    return ledger.filter(item => item.partyName === 'Ajuste Extra' || item.partyName === 'Transferencia Interna');
  }, [ledger]);

  // Wallet transfer state
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferCurrency, setTransferCurrency] = useState('ARS');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [isSavingTransfer, setIsSavingTransfer] = useState(false);

  // Drill-down state for wallet hierarchy
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const handleSaveTransfer = async () => {
    if (!user) return;
    if (transferFrom === transferTo) {
      toast.error('El origen y destino deben ser diferentes');
      return;
    }
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setIsSavingTransfer(true);
    try {
      const { error } = await supabase.from('wallet_transfers' as any).insert({
        user_id: user.id,
        from_method: transferFrom,
        to_method: transferTo,
        amount: amt,
        currency: transferCurrency,
        notes: transferNotes.trim(),
      });
      if (error) throw error;
      toast.success('Transferencia entre billeteras registrada');
      setIsTransferDialogOpen(false);
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al registrar la transferencia');
    } finally {
      setIsSavingTransfer(false);
    }
  };

  // Extra movements CRUD state
  const [isExtraDialogOpen, setIsExtraDialogOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<any | null>(null);
  const [extraConcepto, setExtraConcepto] = useState('');
  const [extraMonto, setExtraMonto] = useState('');
  const [extraMoneda, setExtraMoneda] = useState('ARS');
  const [extraMedioPago, setExtraMedioPago] = useState('cash');
  const [extraFecha, setExtraFecha] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [isSavingExtra, setIsSavingExtra] = useState(false);

  const openNewExtraDialog = () => {
    setEditingExtra(null);
    setExtraConcepto('');
    setExtraMonto('');
    setExtraMoneda('ARS');
    setExtraMedioPago('cash');
    setExtraFecha(new Date().toISOString().split('T')[0]);
    setExtraNotes('');
    setIsExtraDialogOpen(true);
  };

  const openEditExtraDialog = (item: LedgerItem) => {
    setEditingExtra(item);
    setExtraConcepto(item.concept);
    setExtraMonto(item.type === 'ingreso' ? String(item.amount) : String(-item.amount));
    setExtraMoneda(item.currency);
    setExtraMedioPago(item.payment_method);
    setExtraFecha(item.date);
    setExtraNotes(item.notes || '');
    setIsExtraDialogOpen(true);
  };

  const handleSaveExtra = async () => {
    if (!user) return;
    if (!extraConcepto.trim()) {
      toast.error('El concepto es obligatorio');
      return;
    }
    const parsedMonto = parseFloat(extraMonto);
    if (isNaN(parsedMonto)) {
      toast.error('El monto debe ser un número válido');
      return;
    }

    setIsSavingExtra(true);

    try {
      const { data: profile } = await supabase
        .from('agency_members')
        .select('agency_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const agencyId = (profile as any)?.agency_id || null;
      if (!agencyId) {
        toast.error('No se encontró la agencia del usuario');
        setIsSavingExtra(false);
        return;
      }

      if (parsedMonto >= 0) {
        // Ingreso (positivo): guardar en file_receipts + file_receipt_items
        if (editingExtra) {
          if (editingExtra.type === 'ingreso') {
            // Actualizar item
            const { error: itemErr } = await supabase
              .from('file_receipt_items')
              .update({
                amount: parsedMonto,
                currency: extraMoneda,
                payment_method: extraMedioPago,
                notes: extraNotes.trim() || null,
              } as any)
              .eq('id', editingExtra.id);
            if (itemErr) throw itemErr;

            // Actualizar padre
            if (editingExtra.receipt_id) {
              const { error: receiptErr } = await supabase
                .from('file_receipts')
                .update({
                  concept: extraConcepto.trim(),
                  payment_date: extraFecha,
                } as any)
                .eq('id', editingExtra.receipt_id);
              if (receiptErr) throw receiptErr;
            }
            toast.success('Movimiento extra (ingreso) actualizado');
          } else {
            // Antes era egreso, ahora es ingreso: borrar egreso e insertar ingreso
            const { error: delErr } = await supabase
              .from('file_supplier_payments')
              .delete()
              .eq('id', editingExtra.id);
            if (delErr) throw delErr;

            // Insertar recibo padre
            const { data: receiptData, error: receiptErr } = await supabase
              .from('file_receipts')
              .insert({
                concept: extraConcepto.trim(),
                payment_date: extraFecha,
                client_name: 'Ajuste Extra',
                status: 'confirmed',
                user_id: user.id,
                agency_id: agencyId,
                amount: parsedMonto,
                currency: extraMoneda,
                payment_method: extraMedioPago,
                file_id: null,
              } as any)
              .select('id')
              .single();
            if (receiptErr) throw receiptErr;

            // Insertar recibo item
            const { error: itemErr } = await supabase
              .from('file_receipt_items')
              .insert({
                receipt_id: receiptData.id,
                amount: parsedMonto,
                currency: extraMoneda,
                payment_method: extraMedioPago,
                notes: extraNotes.trim() || null,
                user_id: user.id,
                agency_id: agencyId,
              } as any);
            if (itemErr) throw itemErr;
            toast.success('Movimiento extra (ingreso) registrado');
          }
        } else {
          // Crear recibo padre nuevo sin expediente (file_id = null)
          const { data: receiptData, error: receiptErr } = await supabase
            .from('file_receipts')
            .insert({
              concept: extraConcepto.trim(),
              payment_date: extraFecha,
              client_name: 'Ajuste Extra',
              status: 'confirmed',
              user_id: user.id,
              agency_id: agencyId,
              amount: parsedMonto,
              currency: extraMoneda,
              payment_method: extraMedioPago,
              file_id: null,
            } as any)
            .select('id')
            .single();
          if (receiptErr) throw receiptErr;

          // Crear recibo item nuevo
          const { error: itemErr } = await supabase
            .from('file_receipt_items')
            .insert({
              receipt_id: receiptData.id,
              amount: parsedMonto,
              currency: extraMoneda,
              payment_method: extraMedioPago,
              notes: extraNotes.trim() || null,
              user_id: user.id,
              agency_id: agencyId,
            } as any);
          if (itemErr) throw itemErr;
          toast.success('Movimiento extra (ingreso) registrado');
        }
      } else {
        // Egreso (negativo): guardar en file_supplier_payments con file_id = null
        const positiveAmount = Math.abs(parsedMonto);

        if (editingExtra) {
          if (editingExtra.type === 'egreso') {
            const { error: payErr } = await supabase
              .from('file_supplier_payments')
              .update({
                amount: positiveAmount,
                currency: extraMoneda,
                payment_method: extraMedioPago,
                payment_date: extraFecha,
                notes: extraConcepto.trim() + (extraNotes.trim() ? ` - ${extraNotes.trim()}` : ''),
              } as any)
              .eq('id', editingExtra.id);
            if (payErr) throw payErr;
            toast.success('Movimiento extra (egreso) actualizado');
          } else {
            // Antes era ingreso, ahora es egreso: borrar recibo e insertar pago
            if (editingExtra.receipt_id) {
              const { error: delItemErr } = await supabase
                .from('file_receipt_items')
                .delete()
                .eq('receipt_id', editingExtra.receipt_id);
              if (delItemErr) throw delItemErr;

              const { error: delRecErr } = await supabase
                .from('file_receipts')
                .delete()
                .eq('id', editingExtra.receipt_id);
              if (delRecErr) throw delRecErr;
            }

            // Insertar pago
            const { error: payErr } = await supabase
              .from('file_supplier_payments')
              .insert({
                supplier_name: 'Ajuste Extra',
                amount: positiveAmount,
                currency: extraMoneda,
                payment_method: extraMedioPago,
                payment_date: extraFecha,
                reference: 'Mov. Extra',
                notes: extraConcepto.trim() + (extraNotes.trim() ? ` - ${extraNotes.trim()}` : ''),
                user_id: user.id,
                agency_id: agencyId,
                file_id: null,
              } as any);
            if (payErr) throw payErr;
            toast.success('Movimiento extra (egreso) registrado');
          }
        } else {
          // Crear pago nuevo sin expediente (file_id = null)
          const { error: payErr } = await supabase
            .from('file_supplier_payments')
            .insert({
              supplier_name: 'Ajuste Extra',
              amount: positiveAmount,
              currency: extraMoneda,
              payment_method: extraMedioPago,
              payment_date: extraFecha,
              reference: 'Mov. Extra',
              notes: extraConcepto.trim() + (extraNotes.trim() ? ` - ${extraNotes.trim()}` : ''),
              user_id: user.id,
              agency_id: agencyId,
              file_id: null,
            } as any);
          if (payErr) throw payErr;
          toast.success('Movimiento extra (egreso) registrado');
        }
      }

      setIsExtraDialogOpen(false);
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error al guardar el movimiento extra');
    } finally {
      setIsSavingExtra(false);
    }
  };

  const handleDeleteExtra = async (item: LedgerItem) => {
    const ok = window.confirm('¿Estás seguro de que deseas eliminar este movimiento extra?');
    if (!ok) return;

    try {
      if (item.type === 'ingreso') {
        if (item.receipt_id) {
          const { error: itemErr } = await supabase
            .from('file_receipt_items')
            .delete()
            .eq('receipt_id', item.receipt_id);
          if (itemErr) throw itemErr;

          const { error: recErr } = await supabase
            .from('file_receipts')
            .delete()
            .eq('id', item.receipt_id);
          if (recErr) throw recErr;
        }
        toast.success('Movimiento extra (ingreso) eliminado');
      } else {
        const { error: payErr } = await supabase
          .from('file_supplier_payments')
          .delete()
          .eq('id', item.id);
        if (payErr) throw payErr;
        toast.success('Movimiento extra (egreso) eliminado');
      }
      refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error al eliminar el movimiento extra');
    }
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Movimientos de caja actualizados');
    } catch {
      toast.error('Error al actualizar caja');
    }
  };

  // Calculate wallet balances dynamically based on ALL data
  const wallets = useMemo(() => {
    const balances: Record<string, { incoming: number; outgoing: number; balance: number }> = {};
    
    ledger.forEach((item) => {
      let method = item.payment_method;
      if (method === 'credit_card' || method === 'debit_card') {
        method = 'card';
      }
      
      const key = `${method}_${item.currency}`;
      if (!balances[key]) {
        balances[key] = { incoming: 0, outgoing: 0, balance: 0 };
      }
      
      if (item.type === 'ingreso') {
        balances[key].incoming += item.amount;
      } else {
        balances[key].outgoing += item.amount;
      }
    });

    Object.keys(balances).forEach((key) => {
      balances[key].balance = balances[key].incoming - balances[key].outgoing;
    });

    return balances;
  }, [ledger]);

  // Wallet data grouped by currency (Level 1)
  const currencyWallets = useMemo(() => {
    const currencies: Record<string, { balance: number; incoming: number; outgoing: number; methods: { method: string; balance: number; incoming: number; outgoing: number }[] }> = {};
    
    Object.entries(wallets).forEach(([key, data]) => {
      const parts = key.split('_');
      const method = parts.slice(0, -1).join('_');
      const currency = parts[parts.length - 1];
      
      if (!currencies[currency]) {
        currencies[currency] = { balance: 0, incoming: 0, outgoing: 0, methods: [] };
      }
      currencies[currency].balance += data.balance;
      currencies[currency].incoming += data.incoming;
      currencies[currency].outgoing += data.outgoing;
      if (data.incoming > 0 || data.outgoing > 0) {
        currencies[currency].methods.push({ method, ...data });
      }
    });

    // Sort methods by absolute balance descending
    Object.values(currencies).forEach(c => {
      c.methods.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    });

    return currencies;
  }, [wallets]);

  // Movements filtered for drill-down Level 3 (by currency + method)
  const drillDownMovements = useMemo(() => {
    if (!selectedCurrency || !selectedMethod) return [];
    return ledger.filter(item => {
      const itemMethod = (item.payment_method === 'credit_card' || item.payment_method === 'debit_card') ? 'card' : item.payment_method;
      return item.currency === selectedCurrency && itemMethod === selectedMethod;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [ledger, selectedCurrency, selectedMethod]);

  // Filter ledger
  const filteredLedger = useMemo(() => {
    return ledger.filter((item) => {
      // 1. Text Search
      const matchesSearch = 
        item.concept.toLowerCase().includes(search.toLowerCase()) ||
        item.notes.toLowerCase().includes(search.toLowerCase()) ||
        item.partyName.toLowerCase().includes(search.toLowerCase());

      // 2. Type Filter
      const matchesType = typeFilter === 'all' || item.type === typeFilter;

      // 3. Currency Filter
      const matchesCurrency = currencyFilter === 'all' || item.currency === currencyFilter;

      // 4. Wallet / Method Filter
      let matchesWallet = true;
      if (walletFilter !== 'all') {
        if (walletFilter === 'card') {
          matchesWallet = item.payment_method === 'credit_card' || item.payment_method === 'debit_card';
        } else {
          matchesWallet = item.payment_method === walletFilter;
        }
      }

      return matchesSearch && matchesType && matchesCurrency && matchesWallet;
    });
  }, [ledger, search, typeFilter, currencyFilter, walletFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLedger.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLedger = useMemo(() => {
    return filteredLedger.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredLedger, currentPage]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getCurrencySymbol = (cur: string) => {
    if (cur === 'ARS') return '$';
    if (cur === 'EUR') return '€';
    return 'u$s';
  };

  const getWalletDetails = (method: string, currency: string) => {
    const key = `${method}_${currency}`;
    return wallets[key] || { incoming: 0, outgoing: 0, balance: 0 };
  };

  return (
    <>
      <Header />
      <div className="container mx-auto p-4 md:p-6 space-y-6 animate-fadeInUp">
        {/* Botón Volver al Dashboard */}
        <Button asChild variant="ghost" className="gap-2 mb-2 hover:bg-muted/50 shrink-0">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
          </Link>
        </Button>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-[hsl(var(--gold))]" />
              Caja de la Agencia
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Flujo de caja consolidado, ingresos de recibos de clientes, egresos a proveedores e incidencias.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTransferAmount('');
                setTransferCurrency('ARS');
                setTransferFrom('');
                setTransferTo('');
                setTransferNotes('');
                setIsTransferDialogOpen(true);
              }}
              className="h-9 px-3 gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" /> Transferencia Interna
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-9 px-3 gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive font-medium">
              Error de conexión con el servidor al calcular el flujo de caja.
            </p>
            <Button size="sm" variant="outline" className="mt-4" onClick={handleRefresh}>
              Reintentar
            </Button>
          </div>
        ) : isLoading ? (
          <PageLoadingScreen message="Cargando caja y flujo financiero..." />
        ) : (
          <>
            {/* Currency Wallet Cards — Level 1 */}
            <div className="space-y-3">
              <p className="section-title">Billeteras por Moneda</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(['ARS', 'USD', 'EUR'] as const).map(cur => {
                  const data = currencyWallets[cur];
                  if (!data || (data.incoming === 0 && data.outgoing === 0)) return null;
                  const currencyColors: Record<string, { border: string; text: string; icon: string; bg: string }> = {
                    ARS: { border: 'border-t-emerald-500', text: 'text-emerald-500', icon: 'text-emerald-500', bg: 'from-emerald-500/10 to-transparent' },
                    USD: { border: 'border-t-amber-500', text: 'text-amber-500', icon: 'text-amber-500', bg: 'from-amber-500/10 to-transparent' },
                    EUR: { border: 'border-t-blue-500', text: 'text-blue-500', icon: 'text-blue-500', bg: 'from-blue-500/10 to-transparent' },
                  };
                  const colors = currencyColors[cur] || currencyColors.USD;
                  const currencyFlags: Record<string, string> = { ARS: '🇦🇷', USD: '🇺🇸', EUR: '🇪🇺' };
                  const currencyNames: Record<string, string> = { ARS: 'Pesos Argentinos', USD: 'Dólares Estadounidenses', EUR: 'Euros' };
                  
                  return (
                    <Card
                      key={cur}
                      className={`${colors.border} border-t-4 hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden bg-card/50 group`}
                      onClick={() => setSelectedCurrency(cur)}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                      <CardContent className="p-5 relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{currencyFlags[cur]}</span>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cur}</p>
                              <p className="text-[10px] text-muted-foreground/70">{currencyNames[cur]}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground/50 group-hover:text-foreground/70 transition-colors">
                            <span className="text-[10px]">{data.methods.length} {data.methods.length === 1 ? 'método' : 'métodos'}</span>
                            <ChevronRightIcon className="h-4 w-4" />
                          </div>
                        </div>
                        
                        {/* BIG BALANCE — Most important element */}
                        <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${data.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                          {getCurrencySymbol(cur)} {formatMoney(Math.abs(data.balance))}
                        </h2>
                        {data.balance < 0 && <span className="text-[10px] text-destructive font-medium">SALDO NEGATIVO</span>}
                        
                        {/* Ingresos / Egresos */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3 mt-4">
                          <span className="flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{getCurrencySymbol(cur)} {formatMoney(data.incoming)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <ArrowDownRight className="h-3 w-3 text-destructive" />
                            <span className="text-destructive font-semibold">{getCurrencySymbol(cur)} {formatMoney(data.outgoing)}</span>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Sheet Level 2: Payment Methods for a Currency */}
            <Sheet open={!!selectedCurrency && !selectedMethod} onOpenChange={(open) => { if (!open) setSelectedCurrency(null); }}>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                {selectedCurrency && (() => {
                  const data = currencyWallets[selectedCurrency];
                  if (!data) return null;
                  const currencyFlags: Record<string, string> = { ARS: '🇦🇷', USD: '🇺🇸', EUR: '🇪🇺' };
                  const methodIcons: Record<string, React.ReactNode> = {
                    cash: <Wallet className="h-5 w-5 text-emerald-500" />,
                    transfer: <PiggyBank className="h-5 w-5 text-blue-500" />,
                    card: <CreditCard className="h-5 w-5 text-cyan-500" />,
                    check: <FileText className="h-5 w-5 text-orange-500" />,
                    other: <Activity className="h-5 w-5 text-gray-500" />,
                  };
                  const methodLabels: Record<string, string> = {
                    cash: 'Efectivo',
                    transfer: 'Banco (Transferencia)',
                    card: 'Tarjetas',
                    check: 'Cheques',
                    other: 'Otros',
                  };
                  return (
                    <>
                      <SheetHeader className="pb-4 border-b">
                        <SheetTitle className="flex items-center gap-2 text-xl">
                          <span className="text-2xl">{currencyFlags[selectedCurrency]}</span>
                          Billetera {selectedCurrency}
                        </SheetTitle>
                        <SheetDescription>
                          <span className="text-3xl font-black text-foreground block mt-2">
                            {getCurrencySymbol(selectedCurrency)} {formatMoney(Math.abs(data.balance))}
                          </span>
                          <span className={`text-xs font-medium ${data.balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                            {data.balance >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
                          </span>
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Métodos de Pago</p>
                        {data.methods.map(m => (
                          <Card
                            key={m.method}
                            className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 group bg-card/60"
                            onClick={() => setSelectedMethod(m.method)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-muted/50">
                                    {methodIcons[m.method] || methodIcons.other}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm text-foreground">{methodLabels[m.method] || m.method}</p>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                      <span className="text-emerald-600">+{getCurrencySymbol(selectedCurrency)} {formatMoney(m.incoming)}</span>
                                      <span className="text-destructive">-{getCurrencySymbol(selectedCurrency)} {formatMoney(m.outgoing)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xl font-black ${m.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                                    {getCurrencySymbol(selectedCurrency)} {formatMoney(Math.abs(m.balance))}
                                  </span>
                                  <ChevronRightIcon className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/70 transition-colors" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {data.methods.length === 0 && (
                          <div className="text-center py-8 text-sm text-muted-foreground">
                            No hay movimientos en esta moneda.
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </SheetContent>
            </Sheet>

            {/* Sheet Level 3: Movements for a specific Currency + Method */}
            <Sheet open={!!selectedCurrency && !!selectedMethod} onOpenChange={(open) => { if (!open) setSelectedMethod(null); }}>
              <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                {selectedCurrency && selectedMethod && (() => {
                  const methodLabels: Record<string, string> = {
                    cash: 'Efectivo', transfer: 'Banco (Transferencia)', card: 'Tarjetas', check: 'Cheques', other: 'Otros',
                  };
                  const key = `${selectedMethod}_${selectedCurrency}`;
                  const methodData = wallets[key] || { incoming: 0, outgoing: 0, balance: 0 };
                  return (
                    <>
                      <SheetHeader className="pb-4 border-b">
                        <SheetTitle className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2" onClick={() => setSelectedMethod(null)}>
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          {methodLabels[selectedMethod] || selectedMethod} — {selectedCurrency}
                        </SheetTitle>
                        <SheetDescription>
                          <span className={`text-4xl font-black block mt-2 ${methodData.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                            {getCurrencySymbol(selectedCurrency)} {formatMoney(Math.abs(methodData.balance))}
                          </span>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <ArrowUpRight className="h-3 w-3" /> Ingresos: {getCurrencySymbol(selectedCurrency)} {formatMoney(methodData.incoming)}
                            </span>
                            <span className="text-destructive font-semibold flex items-center gap-1">
                              <ArrowDownRight className="h-3 w-3" /> Egresos: {getCurrencySymbol(selectedCurrency)} {formatMoney(methodData.outgoing)}
                            </span>
                          </div>
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                          {drillDownMovements.length} movimientos
                        </p>
                        {drillDownMovements.length === 0 ? (
                          <div className="text-center py-8 text-sm text-muted-foreground">Sin movimientos</div>
                        ) : (
                          <div className="space-y-2">
                            {drillDownMovements.map(item => (
                              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/40 hover:bg-card/70 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{item.concept}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(item.date + 'T12:00:00').toLocaleDateString('es-AR')}
                                    </span>
                                    {item.notes && <span className="text-[10px] text-muted-foreground/70 truncate max-w-[200px]">{item.notes}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 font-bold text-base shrink-0 ml-3">
                                  {item.type === 'ingreso' ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      +{getCurrencySymbol(item.currency)} {formatMoney(item.amount)}
                                    </span>
                                  ) : (
                                    <span className="text-destructive">
                                      -{getCurrencySymbol(item.currency)} {formatMoney(item.amount)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </SheetContent>
            </Sheet>

            {/* Tabs container for Ledger / Extra Movements */}
            <Tabs defaultValue="flujo" className="w-full space-y-6 pt-2">
              <div className="flex border-b pb-1">
                <TabsList className="bg-muted/50 p-0.5 h-10 w-fit">
                  <TabsTrigger value="flujo" className="text-xs px-4 h-9">
                    Flujo de Caja Consolidado
                  </TabsTrigger>
                  <TabsTrigger value="extra" className="text-xs px-4 h-9">
                    Movimientos Extra (No Operativos)
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: Consolidated Ledger */}
              <TabsContent value="flujo" className="space-y-4 outline-none">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <p className="section-title mb-0 font-semibold">Historial de Movimientos de Caja</p>
                  <span className="text-xs text-muted-foreground">
                    Mostrando {filteredLedger.length} de {ledger.length} movimientos
                  </span>
                </div>

                {/* Filters Panel */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5 bg-card/45 border p-3 rounded-xl">
                  {/* Search Concept */}
                  <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por concepto, cliente, proveedor..." 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                      className="pl-9 h-9 text-xs" 
                    />
                  </div>

                  {/* Type Filter */}
                  <div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Tipo de Movimiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">Todos los Tipos</SelectItem>
                        <SelectItem value="ingreso" className="text-xs">Ingresos (+)</SelectItem>
                        <SelectItem value="egreso" className="text-xs">Egresos (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Currency Filter */}
                  <div>
                    <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">Todas las Monedas</SelectItem>
                        <SelectItem value="ARS" className="text-xs">Pesos ($)</SelectItem>
                        <SelectItem value="USD" className="text-xs">Dólares (u$s)</SelectItem>
                        <SelectItem value="EUR" className="text-xs">Euros (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Wallet Filter */}
                  <div>
                    <Select value={walletFilter} onValueChange={setWalletFilter}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Medio / Caja" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">Todos los Medios</SelectItem>
                        <SelectItem value="cash" className="text-xs">Efectivo</SelectItem>
                        <SelectItem value="transfer" className="text-xs">Banco (Transf.)</SelectItem>
                        <SelectItem value="card" className="text-xs">Tarjetas</SelectItem>
                        <SelectItem value="check" className="text-xs">Cheques</SelectItem>
                        <SelectItem value="other" className="text-xs">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Transactions Table */}
                {filteredLedger.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center bg-card/10">
                    <p className="text-sm text-muted-foreground">No se encontraron movimientos con los filtros aplicados.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-card/35 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse stack-table">
                          <thead>
                            <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                              <th className="p-3 w-36">Fecha</th>
                              <th className="p-3">Detalle / Concepto</th>
                              <th className="p-3 w-40">Medio / Caja</th>
                              <th className="p-3 text-right w-44">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedLedger.map((item) => (
                              <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">
                                {/* Date */}
                                <td className="p-3 text-muted-foreground whitespace-nowrap" data-label="Fecha">
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3 text-muted-foreground/60" />
                                    {new Date(item.date + 'T12:00:00').toLocaleDateString('es-AR')}
                                  </span>
                                </td>

                                {/* Concept & Notes */}
                                <td className="p-3 font-medium" data-label="Concepto">
                                  <div className="flex flex-col gap-0.5 max-w-lg">
                                    <span className="text-foreground">{item.concept}</span>
                                    {item.notes && (
                                      <span className="text-[10px] text-muted-foreground font-light truncate" title={item.notes}>
                                        {item.notes}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Wallet / Medium */}
                                <td className="p-3" data-label="Medio">
                                  <Badge variant="secondary" className="font-semibold text-[10px] flex items-center gap-1 w-fit">
                                    {item.payment_method === 'cash' && <Wallet className="h-2.5 w-2.5" />}
                                    {item.payment_method === 'transfer' && <PiggyBank className="h-2.5 w-2.5" />}
                                    {(item.payment_method === 'credit_card' || item.payment_method === 'debit_card') && <CreditCard className="h-2.5 w-2.5" />}
                                    {getMethodLabel(item.payment_method)}
                                  </Badge>
                                </td>

                                {/* Amount */}
                                <td className="p-3 text-right" data-label="Monto">
                                  <div className="flex items-center justify-end gap-1 font-bold text-sm">
                                    {item.type === 'ingreso' ? (
                                      <>
                                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="text-emerald-600 dark:text-emerald-400">
                                          + {getCurrencySymbol(item.currency)} {formatMoney(item.amount)}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <ArrowDownRight className="h-3.5 w-3.5 text-destructive shrink-0" />
                                        <span className="text-destructive">
                                          - {getCurrencySymbol(item.currency)} {formatMoney(item.amount)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground sm:text-sm">
                          {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLedger.length)} de {filteredLedger.length}
                        </p>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-8 px-2 sm:px-3"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Anterior</span>
                          </Button>
                          <span className="text-xs sm:text-sm px-1">
                            {currentPage} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="h-8 px-2 sm:px-3"
                          >
                            <span className="hidden sm:inline mr-1">Siguiente</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Extra Movements CRUD */}
              <TabsContent value="extra" className="space-y-4 outline-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 border p-4 rounded-xl">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Registro de Movimientos Extra de la Agencia</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ingresos (número positivo) o egresos (número negativo) fuera del operativo comercial de la agencia.
                    </p>
                  </div>
                  <Button 
                    onClick={openNewExtraDialog} 
                    className="shrink-0 gap-2 text-xs bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))/80] text-black font-semibold"
                  >
                    <Plus className="h-4 w-4 text-black" />
                    Registrar Movimiento Extra
                  </Button>
                </div>

                {extraMovements.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center bg-card/10">
                    <p className="text-sm text-muted-foreground">No hay movimientos extra registrados.</p>
                    <Button onClick={openNewExtraDialog} variant="outline" size="sm" className="mt-4 text-xs gap-2">
                      <Plus className="h-3.5 w-3.5" /> Registrar el primero
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border bg-card/35 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse stack-table">
                        <thead>
                          <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                            <th className="p-3 w-36">Fecha</th>
                            <th className="p-3">Detalle / Concepto</th>
                            <th className="p-3 w-40">Medio / Caja</th>
                            <th className="p-3 w-28 text-center">Moneda</th>
                            <th className="p-3 text-right w-44">Monto</th>
                            <th className="p-3 text-center w-28">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...extraMovements].sort((a, b) => b.date.localeCompare(a.date)).map((item) => (
                            <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">
                              {/* Date */}
                              <td className="p-3 text-muted-foreground whitespace-nowrap" data-label="Fecha">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3 text-muted-foreground/60" />
                                  {new Date(item.date + 'T12:00:00').toLocaleDateString('es-AR')}
                                </span>
                              </td>

                              {/* Concept & Notes */}
                              <td className="p-3 font-medium" data-label="Concepto">
                                <div className="flex flex-col gap-0.5 max-w-lg">
                                  <span className="text-foreground">{item.concept}</span>
                                  {item.notes && (
                                    <span className="text-[10px] text-muted-foreground font-light truncate" title={item.notes}>
                                      {item.notes}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Medio de pago */}
                              <td className="p-3" data-label="Medio">
                                <Badge variant="secondary" className="font-semibold text-[10px] flex items-center gap-1 w-fit">
                                  {item.payment_method === 'cash' && <Wallet className="h-2.5 w-2.5" />}
                                  {item.payment_method === 'transfer' && <PiggyBank className="h-2.5 w-2.5" />}
                                  {(item.payment_method === 'credit_card' || item.payment_method === 'debit_card') && <CreditCard className="h-2.5 w-2.5" />}
                                  {getMethodLabel(item.payment_method)}
                                </Badge>
                              </td>

                              {/* Moneda */}
                              <td className="p-3 text-center font-medium" data-label="Moneda">
                                <Badge variant="outline" className="font-semibold text-[10px] uppercase">
                                  {item.currency}
                                </Badge>
                              </td>

                              {/* Amount */}
                              <td className="p-3 text-right" data-label="Monto">
                                <div className="flex items-center justify-end gap-1 font-bold text-sm">
                                  {item.type === 'ingreso' ? (
                                    <>
                                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <span className="text-emerald-600 dark:text-emerald-400">
                                        + {getCurrencySymbol(item.currency)} {formatMoney(item.amount)}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowDownRight className="h-3.5 w-3.5 text-destructive shrink-0" />
                                      <span className="text-destructive">
                                        - {getCurrencySymbol(item.currency)} {formatMoney(item.amount)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="p-3" data-label="Acciones">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditExtraDialog(item)}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title="Editar"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteExtra(item)}
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* CRUD Dialog for Extra Movements */}
            <Dialog open={isExtraDialogOpen} onOpenChange={setIsExtraDialogOpen}>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-[hsl(var(--gold))]" />
                    {editingExtra ? 'Editar Movimiento Extra' : 'Registrar Movimiento Extra'}
                  </DialogTitle>
                  <DialogDescription>
                    Registra ingresos o egresos ajenos al operativo comercial de la agencia.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-3">
                  {/* Concepto */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="extra-concepto" className="text-xs font-semibold">Concepto / Nombre del movimiento *</Label>
                    <Input
                      id="extra-concepto"
                      placeholder="Ej: Pago de alquiler, Almuerzo de equipo, Suscripción mensual"
                      value={extraConcepto}
                      onChange={(e) => setExtraConcepto(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Monto */}
                    <div className="grid gap-1.5">
                      <Label htmlFor="extra-monto" className="text-xs font-semibold">Monto *</Label>
                      <Input
                        id="extra-monto"
                        type="number"
                        step="any"
                        placeholder="Ej: 15000 o -8500"
                        value={extraMonto}
                        onChange={(e) => setExtraMonto(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        Ingreso: número <strong>positivo</strong> (+)<br />
                        Egreso: número <strong>negativo</strong> (-)
                      </span>
                    </div>

                    {/* Moneda */}
                    <div className="grid gap-1.5">
                      <Label htmlFor="extra-moneda" className="text-xs font-semibold">Moneda *</Label>
                      <Select value={extraMoneda} onValueChange={setExtraMoneda}>
                        <SelectTrigger id="extra-moneda" className="h-9 text-xs">
                          <SelectValue placeholder="Moneda" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARS" className="text-xs">Pesos ($)</SelectItem>
                          <SelectItem value="USD" className="text-xs">Dólares (u$s)</SelectItem>
                          <SelectItem value="EUR" className="text-xs">Euros (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Medio de Pago */}
                    <div className="grid gap-1.5">
                      <Label htmlFor="extra-medio-pago" className="text-xs font-semibold">Medio de Pago *</Label>
                      <Select value={extraMedioPago} onValueChange={setExtraMedioPago}>
                        <SelectTrigger id="extra-medio-pago" className="h-9 text-xs">
                          <SelectValue placeholder="Medio de pago" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash" className="text-xs">Efectivo</SelectItem>
                          <SelectItem value="transfer" className="text-xs">Banco (Transf.)</SelectItem>
                          <SelectItem value="credit_card" className="text-xs">Tarjeta de Crédito</SelectItem>
                          <SelectItem value="debit_card" className="text-xs">Tarjeta de Débito</SelectItem>
                          <SelectItem value="check" className="text-xs">Cheque</SelectItem>
                          <SelectItem value="other" className="text-xs">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Fecha */}
                    <div className="grid gap-1.5">
                      <Label htmlFor="extra-fecha" className="text-xs font-semibold">Fecha *</Label>
                      <Input
                        id="extra-fecha"
                        type="date"
                        value={extraFecha}
                        onChange={(e) => setExtraFecha(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="extra-notes" className="text-xs font-semibold">Notas / Detalles adicionales</Label>
                    <Textarea
                      id="extra-notes"
                      placeholder="Detalles opcionales del movimiento..."
                      value={extraNotes}
                      onChange={(e) => setExtraNotes(e.target.value)}
                      className="min-h-[70px] text-xs resize-none"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExtraDialogOpen(false)}
                    disabled={isSavingExtra}
                    className="h-9 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveExtra}
                    disabled={isSavingExtra}
                    className="h-9 text-xs bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))/80] text-black font-semibold"
                  >
                    {isSavingExtra ? 'Guardando...' : 'Guardar Movimiento'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferencia entre Billeteras (Caja)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input type="number" step="0.01" min={0.01} value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={transferCurrency} onValueChange={setTransferCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['ARS', 'USD', 'EUR', 'BRL'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desde Billetera</Label>
                <Select value={transferFrom} onValueChange={setTransferFrom} required>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Banco (Transf.)</SelectItem>
                    <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="debit_card">Tarjeta de Débito</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hacia Billetera</Label>
                <Select value={transferTo} onValueChange={setTransferTo} required>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Banco (Transf.)</SelectItem>
                    <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                    <SelectItem value="debit_card">Tarjeta de Débito</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input value={transferNotes} onChange={e => setTransferNotes(e.target.value)} placeholder="Ej. Depósito en banco" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTransfer} disabled={isSavingTransfer}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
