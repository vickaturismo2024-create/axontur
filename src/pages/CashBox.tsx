import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, 
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
  Trash2 } from 'lucide-react';
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
    .select('id, status, client_name, concept, payment_date');

  if (receiptsError) throw receiptsError;

  // 3. Fetch supplier payments (outgoing)
  const { data: supplierPayments, error: pError } = await supabase
    .from('file_supplier_payments' as any)
    .select('id, amount, currency, payment_method, payment_date, supplier_name, reference, notes');

  if (pError) throw pError;

  // 4. Fetch incident payments (outgoing costs)
  const { data: incidents, error: iError } = await supabase
    .from('file_incidencias' as any)
    .select('id, monto, moneda, descripcion, fecha, file_id')
    .eq('impacto_caja', true);

  if (iError) throw iError;

  // 5. Fetch extra movements (non-operational)
  const { data: extraMovements, error: extraError } = await supabase
    .from('extra_movements' as any)
    .select('id, concepto, monto, moneda, medio_pago, fecha, notes, user_id, agency_id, created_at');

  const extraList = extraError ? [] : (extraMovements || []);

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
        concept: `Cobro: ${parent.client_name} - ${parent.concept}`,
        notes: item.notes || '',
        currency: item.currency || 'USD',
        amount: Number(item.amount) || 0,
        payment_method: item.payment_method || 'other',
        partyName: parent.client_name || '',
      });
    }
  });

  // Map supplier payments
  (supplierPayments || []).forEach((pay: any) => {
    ledger.push({
      id: pay.id,
      type: 'egreso',
      date: pay.payment_date || pay.created_at?.split('T')[0],
      concept: `Pago Proveedor: ${pay.supplier_name}${pay.reference ? ` (${pay.reference})` : ''}`,
      notes: pay.notes || '',
      currency: pay.currency || 'USD',
      amount: Number(pay.amount) || 0,
      payment_method: pay.payment_method || 'transfer',
      partyName: pay.supplier_name || '',
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
    });
  });

  // Map extra movements
  extraList.forEach((item: any) => {
    ledger.push({
      id: item.id,
      type: item.monto >= 0 ? 'ingreso' : 'egreso',
      date: item.fecha || item.created_at?.split('T')[0],
      concept: `Mov. Extra: ${item.concepto}`,
      notes: item.notes || '',
      currency: item.moneda || 'ARS',
      amount: Math.abs(Number(item.monto)) || 0,
      payment_method: item.medio_pago || 'cash',
      partyName: 'Ajuste Extra',
    });
  });

  // Sort by date descending
  ledger.sort((a, b) => b.date.localeCompare(a.date));

  return {
    ledger,
    extraMovements: extraList
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
  const extraMovements = cajaData?.extraMovements || [];

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

  const openEditExtraDialog = (item: any) => {
    setEditingExtra(item);
    setExtraConcepto(item.concepto);
    setExtraMonto(String(item.monto));
    setExtraMoneda(item.moneda);
    setExtraMedioPago(item.medio_pago);
    setExtraFecha(item.fecha);
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

      const payload = {
        concepto: extraConcepto.trim(),
        monto: parsedMonto,
        moneda: extraMoneda,
        medio_pago: extraMedioPago,
        fecha: extraFecha,
        notes: extraNotes.trim() || null,
        user_id: user.id,
        agency_id: agencyId,
      };

      if (editingExtra) {
        const { error } = await supabase
          .from('extra_movements' as any)
          .update(payload)
          .eq('id', editingExtra.id);
        if (error) throw error;
        toast.success('Movimiento extra actualizado');
      } else {
        const { error } = await supabase
          .from('extra_movements' as any)
          .insert(payload);
        if (error) throw error;
        toast.success('Movimiento extra registrado');
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

  const handleDeleteExtra = async (id: string) => {
    const ok = window.confirm('¿Estás seguro de que deseas eliminar este movimiento extra?');
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('extra_movements' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Movimiento extra eliminado');
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
      // Normalize credit card and debit card into a single 'card' wallet group for simplicity or keep separate
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

    // Calculate net balances
    Object.keys(balances).forEach((key) => {
      balances[key].balance = balances[key].incoming - balances[key].outgoing;
    });

    return balances;
  }, [ledger]);

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
          <div className="flex items-center gap-2 shrink-0">
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
            {/* Primary Billeteras/Wallets */}
            <div className="space-y-3">
              <p className="section-title">Billeteras Principales</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Caja Efectivo ARS */}
                <Card className="border-t-4 border-t-emerald-500 hover:shadow-md transition-shadow relative overflow-hidden bg-card/45">
                  <CardContent className="p-4 flex flex-col justify-between h-28">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Efectivo ARS</span>
                      <Wallet className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-2">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        $ {formatMoney(getWalletDetails('cash', 'ARS').balance)}
                      </h2>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-1.5 mt-2">
                      <span className="text-emerald-600 flex items-center">+{formatMoney(getWalletDetails('cash', 'ARS').incoming)}</span>
                      <span className="text-destructive flex items-center">-{formatMoney(getWalletDetails('cash', 'ARS').outgoing)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Caja Efectivo USD */}
                <Card className="border-t-4 border-t-amber-500 hover:shadow-md transition-shadow relative overflow-hidden bg-card/45">
                  <CardContent className="p-4 flex flex-col justify-between h-28">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Efectivo USD</span>
                      <Wallet className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="mt-2">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                        u$s {formatMoney(getWalletDetails('cash', 'USD').balance)}
                      </h2>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-1.5 mt-2">
                      <span className="text-emerald-600 flex items-center">+{formatMoney(getWalletDetails('cash', 'USD').incoming)}</span>
                      <span className="text-destructive flex items-center">-{formatMoney(getWalletDetails('cash', 'USD').outgoing)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Banco ARS */}
                <Card className="border-t-4 border-t-blue-500 hover:shadow-md transition-shadow relative overflow-hidden bg-card/45">
                  <CardContent className="p-4 flex flex-col justify-between h-28">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Banco ARS</span>
                      <PiggyBank className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="mt-2">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                        $ {formatMoney(getWalletDetails('transfer', 'ARS').balance)}
                      </h2>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-1.5 mt-2">
                      <span className="text-emerald-600 flex items-center">+{formatMoney(getWalletDetails('transfer', 'ARS').incoming)}</span>
                      <span className="text-destructive flex items-center">-{formatMoney(getWalletDetails('transfer', 'ARS').outgoing)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Banco USD */}
                <Card className="border-t-4 border-t-violet-500 hover:shadow-md transition-shadow relative overflow-hidden bg-card/45">
                  <CardContent className="p-4 flex flex-col justify-between h-28">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Banco USD</span>
                      <PiggyBank className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="mt-2">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-violet-600 dark:text-violet-400">
                        u$s {formatMoney(getWalletDetails('transfer', 'USD').balance)}
                      </h2>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-1.5 mt-2">
                      <span className="text-emerald-600 flex items-center">+{formatMoney(getWalletDetails('transfer', 'USD').incoming)}</span>
                      <span className="text-destructive flex items-center">-{formatMoney(getWalletDetails('transfer', 'USD').outgoing)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Other Wallet Balances (Cards & Cheques) if they have content */}
            {(getWalletDetails('card', 'ARS').incoming > 0 || getWalletDetails('card', 'USD').incoming > 0 || getWalletDetails('check', 'ARS').incoming > 0 || getWalletDetails('check', 'USD').incoming > 0) && (
              <div className="space-y-3">
                <p className="section-title">Tarjetas y Cheques</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Tarjetas ARS */}
                  {(getWalletDetails('card', 'ARS').incoming > 0 || getWalletDetails('card', 'ARS').outgoing > 0) && (
                    <Card className="bg-card/30 hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex flex-col justify-between h-24">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Tarjetas ARS</span>
                          <CreditCard className="h-4 w-4 text-cyan-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            $ {formatMoney(getWalletDetails('card', 'ARS').balance)}
                          </h3>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground border-t pt-1">
                          <span>Ing: +{formatMoney(getWalletDetails('card', 'ARS').incoming)}</span>
                          <span>Egr: -{formatMoney(getWalletDetails('card', 'ARS').outgoing)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tarjetas USD */}
                  {(getWalletDetails('card', 'USD').incoming > 0 || getWalletDetails('card', 'USD').outgoing > 0) && (
                    <Card className="bg-card/30 hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex flex-col justify-between h-24">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Tarjetas USD</span>
                          <CreditCard className="h-4 w-4 text-cyan-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            u$s {formatMoney(getWalletDetails('card', 'USD').balance)}
                          </h3>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground border-t pt-1">
                          <span>Ing: +{formatMoney(getWalletDetails('card', 'USD').incoming)}</span>
                          <span>Egr: -{formatMoney(getWalletDetails('card', 'USD').outgoing)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Cheques ARS */}
                  {(getWalletDetails('check', 'ARS').incoming > 0 || getWalletDetails('check', 'ARS').outgoing > 0) && (
                    <Card className="bg-card/30 hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex flex-col justify-between h-24">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Cheques ARS</span>
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            $ {formatMoney(getWalletDetails('check', 'ARS').balance)}
                          </h3>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground border-t pt-1">
                          <span>Ing: +{formatMoney(getWalletDetails('check', 'ARS').incoming)}</span>
                          <span>Egr: -{formatMoney(getWalletDetails('check', 'ARS').outgoing)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Cheques USD */}
                  {(getWalletDetails('check', 'USD').incoming > 0 || getWalletDetails('check', 'USD').outgoing > 0) && (
                    <Card className="bg-card/30 hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex flex-col justify-between h-24">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Cheques USD</span>
                          <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            u$s {formatMoney(getWalletDetails('check', 'USD').balance)}
                          </h3>
                        </div>
                        <div className="flex justify-between text-[9px] text-muted-foreground border-t pt-1">
                          <span>Ing: +{formatMoney(getWalletDetails('check', 'USD').incoming)}</span>
                          <span>Egr: -{formatMoney(getWalletDetails('check', 'USD').outgoing)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

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
                          {[...extraMovements].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((item) => (
                            <tr key={item.id} className="border-b hover:bg-muted/20 transition-colors">
                              {/* Date */}
                              <td className="p-3 text-muted-foreground whitespace-nowrap" data-label="Fecha">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3 text-muted-foreground/60" />
                                  {new Date(item.fecha + 'T12:00:00').toLocaleDateString('es-AR')}
                                </span>
                              </td>

                              {/* Concept & Notes */}
                              <td className="p-3 font-medium" data-label="Concepto">
                                <div className="flex flex-col gap-0.5 max-w-lg">
                                  <span className="text-foreground">{item.concepto}</span>
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
                                  {item.medio_pago === 'cash' && <Wallet className="h-2.5 w-2.5" />}
                                  {item.medio_pago === 'transfer' && <PiggyBank className="h-2.5 w-2.5" />}
                                  {(item.medio_pago === 'credit_card' || item.medio_pago === 'debit_card') && <CreditCard className="h-2.5 w-2.5" />}
                                  {getMethodLabel(item.medio_pago)}
                                </Badge>
                              </td>

                              {/* Moneda */}
                              <td className="p-3 text-center font-medium" data-label="Moneda">
                                <Badge variant="outline" className="font-semibold text-[10px] uppercase">
                                  {item.moneda}
                                </Badge>
                              </td>

                              {/* Amount */}
                              <td className="p-3 text-right" data-label="Monto">
                                <div className="flex items-center justify-end gap-1 font-bold text-sm">
                                  {Number(item.monto) >= 0 ? (
                                    <>
                                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <span className="text-emerald-600 dark:text-emerald-400">
                                        + {getCurrencySymbol(item.moneda)} {formatMoney(Number(item.monto))}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowDownRight className="h-3.5 w-3.5 text-destructive shrink-0" />
                                      <span className="text-destructive">
                                        - {getCurrencySymbol(item.moneda)} {formatMoney(Math.abs(Number(item.monto)))}
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
                                    onClick={() => handleDeleteExtra(item.id)}
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
    </>
  );
}
