import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, User, Wallet, Plus, Mail, Phone, MapPin, FolderOpen } from 'lucide-react';
import { NewMovementDialog } from '@/components/accounts/NewMovementDialog';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phone_mobile: string | null;
  address: string | null;
  locality: string | null;
  dni: string | null;
}

interface Movement {
  id: string;
  movement_date: string;
  movement_type: string;
  amount: number;
  currency: string;
  concept: string;
  reference: string | null;
  file_id: string | null;
  receipt_id: string | null;
  source_payment_id: string | null;
  notes: string | null;
}

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [newMovOpen, setNewMovOpen] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data: client, isLoading } = useQuery<Client | null>({
    queryKey: queryKeys.clients.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
      return (data as any) || null;
    },
    enabled: !!id && !!user,
  });

  const { data: movements = [] } = useQuery<Movement[]>({
    queryKey: queryKeys.clients.movements(id ?? ''),
    queryFn: async () => {
      const { data } = await supabase
        .from('account_movements' as any)
        .select('*')
        .eq('account_type', 'client')
        .eq('account_id', id!)
        .order('movement_date', { ascending: false });
      return ((data as any[]) || []) as Movement[];
    },
    enabled: !!id && !!user,
  });

  const { data: fileNumbers = {} } = useQuery<Record<string, number>>({
    queryKey: queryKeys.clients.fileNumbers(id ?? ''),
    queryFn: async () => {
      const fileIds = Array.from(new Set(movements.map(m => m.file_id).filter(Boolean))) as string[];
      if (fileIds.length === 0) return {};
      const { data } = await supabase.from('files').select('id, file_number').in('id', fileIds);
      const map: Record<string, number> = {};
      ((data as any[]) || []).forEach(f => { map[f.id] = f.file_number; });
      return map;
    },
    enabled: movements.length > 0,
  });

  const filtered = useMemo(() => {
    return movements.filter(m => {
      if (currencyFilter !== 'all' && m.currency !== currencyFilter) return false;
      if (fromDate && m.movement_date < fromDate) return false;
      if (toDate && m.movement_date > toDate) return false;
      return true;
    });
  }, [movements, currencyFilter, fromDate, toDate]);

  const currencies = useMemo(
    () => Array.from(new Set(movements.map(m => m.currency))).sort(),
    [movements],
  );

  const balancesByCurrency = useMemo(() => {
    const map: Record<string, { credit: number; debit: number }> = {};
    movements.forEach(m => {
      if (!map[m.currency]) map[m.currency] = { credit: 0, debit: 0 };
      const amt = Number(m.amount) || 0;
      if (m.movement_type === 'credit') map[m.currency].credit += amt;
      else map[m.currency].debit += amt;
    });
    return map;
  }, [movements]);

  const handleSavedMovement = () => {
    qc.invalidateQueries({ queryKey: queryKeys.clients.movements(id!) });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Cliente no encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/clients')}>Volver</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="mb-2">
              <ArrowLeft className="mr-1 h-4 w-4" /> Volver
            </Button>
            <h1 className="font-sans text-3xl font-bold flex items-center gap-2">
              <User className="h-7 w-7 text-primary" /> {client.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {client.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{client.email}</span>}
              {(client.phone_mobile || client.phone) && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{client.phone_mobile || client.phone}</span>}
              {(client.locality || client.address) && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[client.address, client.locality].filter(Boolean).join(', ')}</span>}
            </div>
          </div>
          <Button onClick={() => setNewMovOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Movimiento manual
          </Button>
        </div>

        {/* Saldo por moneda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-sans text-base font-bold text-primary flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Saldo cuenta corriente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(balancesByCurrency).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {Object.entries(balancesByCurrency).map(([c, { credit, debit }]) => {
                  const bal = credit - debit;
                  return (
                    <div key={c} className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{c}</p>
                      <p className={`text-xl font-bold ${bal > 0 ? 'text-green-600 dark:text-green-400' : bal < 0 ? 'text-destructive' : ''}`}>
                        {fmt(bal)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cobrado: {fmt(credit)} · Aplicado: {fmt(debit)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filtros + tabla de movimientos */}
        <Card>
          <CardHeader>
            <CardTitle className="font-sans text-base font-bold text-primary">Movimientos ({filtered.length})</CardTitle>
            <div className="grid gap-2 mt-3 sm:grid-cols-3">
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger><SelectValue placeholder="Moneda" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las monedas</SelectItem>
                  {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="Desde" />
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="Hasta" />
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No hay movimientos para los filtros aplicados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Expediente</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead>Moneda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(m.movement_date + 'T00:00:00').toLocaleDateString('es-AR')}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{m.concept}</p>
                        {m.reference && <p className="text-xs text-muted-foreground">Ref: {m.reference}</p>}
                        {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                      </TableCell>
                      <TableCell>
                        {m.file_id ? (
                          <Link to={`/files/${m.file_id}`} className="text-xs flex items-center gap-1 text-primary hover:underline">
                            <FolderOpen className="h-3 w-3" />
                            FILE-{String(fileNumbers[m.file_id] || '?').padStart(3, '0')}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600 dark:text-green-400">
                        {m.movement_type === 'credit' ? fmt(Number(m.amount)) : ''}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-destructive">
                        {m.movement_type === 'debit' ? fmt(Number(m.amount)) : ''}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{m.currency}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {id && (
        <NewMovementDialog
          open={newMovOpen}
          onClose={() => setNewMovOpen(false)}
          accountId={id}
          accountType="client"
          onSaved={handleSavedMovement}
        />
      )}
    </div>
  );
}
