import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/layout/Header';
import { Search, Users, Truck, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AccountDetail } from '@/components/accounts/AccountDetail';

interface AccountSummary {
  id: string;
  name: string;
  type: 'client' | 'supplier';
  balances: Record<string, number>;
  dni?: string;
}

async function fetchAllPaged(table: 'clients' | 'suppliers', fields: string) {
  const PAGE = 1000;
  let from = 0;
  const all: any[] = [];
  while (true) {
    const { data } = await supabase.from(table).select(fields).order('name').range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export default function Accounts() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; name: string; type: 'client' | 'supplier' } | null>(null);

  const [clientPage, setClientPage] = useState(1);
  const [supplierPage, setSupplierPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    setClientPage(1);
    setSupplierPage(1);
  }, [search]);

  const { data: clients = [], isLoading: lc } = useQuery({
    queryKey: queryKeys.accounts.clients(user?.id),
    queryFn: () => fetchAllPaged('clients', 'id, name, dni'),
    enabled: !!user,
  });
  const { data: suppliers = [], isLoading: ls } = useQuery({
    queryKey: queryKeys.accounts.suppliers(user?.id),
    queryFn: () => fetchAllPaged('suppliers', 'id, name'),
    enabled: !!user,
  });
  const { data: movements = [], isLoading: lm } = useQuery({
    queryKey: queryKeys.accounts.movements(user?.id),
    queryFn: async () => {
      const { data } = await supabase.from('account_movements').select('*');
      return (data as any[]) || [];
    },
    enabled: !!user,
  });

  const loading = lc || ls || lm;

  const buildSummaries = (type: 'client' | 'supplier', entities: any[]): AccountSummary[] => {
    return entities.map(e => {
      const acctMovements = movements.filter((m: any) => m.account_type === type && m.account_id === e.id);
      const balances: Record<string, number> = {};
      acctMovements.forEach((m: any) => {
        const curr = m.currency || 'USD';
        if (!balances[curr]) balances[curr] = 0;
        balances[curr] += m.movement_type === 'credit' ? Number(m.amount) : -Number(m.amount);
      });
      return { id: e.id, name: e.name, type, balances, dni: e.dni };
    });
  };

  const clientSummaries = useMemo(() => buildSummaries('client', clients), [clients, movements]);
  const supplierSummaries = useMemo(() => buildSummaries('supplier', suppliers), [suppliers, movements]);

  const filterBySearch = (list: AccountSummary[]) => {
    const q = search.toLowerCase();
    return list.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.dni && a.dni.toLowerCase().includes(q))
    );
  };

  const filteredClients = useMemo(() => filterBySearch(clientSummaries), [clientSummaries, search]);
  const filteredSuppliers = useMemo(() => filterBySearch(supplierSummaries), [supplierSummaries, search]);

  const renderList = (
    filtered: AccountSummary[],
    page: number,
    setPage: React.Dispatch<React.SetStateAction<number>>
  ) => {
    if (filtered.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados</p>;

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {paginated.map(a => {
            const currencies = Object.entries(a.balances);
            const hasBalance = currencies.some(([, v]) => v !== 0);
            return (
              <Card key={a.id} className="cursor-pointer transition-colors hover:bg-accent/50" onClick={() => setSelectedAccount({ id: a.id, name: a.name, type: a.type })}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{a.name}</span>
                    {a.dni && <span className="text-[10px] text-muted-foreground font-mono">DNI: {a.dni}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasBalance && currencies.length === 0 && <span className="text-xs text-muted-foreground">Sin movimientos</span>}
                    {currencies.map(([curr, bal]) => (
                      <Badge key={curr} variant={bal > 0 ? 'default' : bal < 0 ? 'destructive' : 'secondary'} className="flex items-center gap-1">
                        {bal > 0 ? <ArrowUpRight className="h-3 w-3" /> : bal < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {curr} {Math.abs(bal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
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
    );
  };

  return (
    <>
      <Header />
      <div className="container mx-auto p-4 md:p-6 space-y-4">
        <div className="mb-4 sm:mb-6">
          <h1 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2 sm:text-3xl tracking-tight">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" /> Cuentas Corrientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consolidado de saldos de clientes y proveedores, ingresos, egresos y movimientos de cuenta.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o DNI..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <Tabs defaultValue="clients">
            <TabsList>
              <TabsTrigger value="clients" className="gap-2"><Users className="h-4 w-4" />Clientes</TabsTrigger>
              <TabsTrigger value="suppliers" className="gap-2"><Truck className="h-4 w-4" />Proveedores</TabsTrigger>
            </TabsList>
            <TabsContent value="clients">{renderList(filteredClients, clientPage, setClientPage)}</TabsContent>
            <TabsContent value="suppliers">{renderList(filteredSuppliers, supplierPage, setSupplierPage)}</TabsContent>
          </Tabs>
        )}
      </div>

      {selectedAccount && (
        <AccountDetail
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          accountType={selectedAccount.type}
          open={!!selectedAccount}
          onClose={() => { setSelectedAccount(null); }}
        />
      )}
    </>
  );
}
