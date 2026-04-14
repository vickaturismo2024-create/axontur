import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { Search, Users, Truck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AccountDetail } from '@/components/accounts/AccountDetail';

interface AccountSummary {
  id: string;
  name: string;
  type: 'client' | 'supplier';
  balances: Record<string, number>; // currency -> balance
}

export default function Accounts() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<{ id: string; name: string; type: 'client' | 'supplier' } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAllPaged = async (table: 'clients' | 'suppliers', fields: string, userId: string) => {
    const PAGE = 1000;
    let from = 0;
    const all: any[] = [];
    while (true) {
      const { data } = await supabase.from(table).select(fields).eq('user_id', userId).order('name').range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  };

  const load = async () => {
    if (!user) return;
    const [c, s, m] = await Promise.all([
      fetchAllPaged('clients', 'id, name', user.id),
      fetchAllPaged('suppliers', 'id, name', user.id),
      supabase.from('account_movements' as any).select('*').eq('user_id', user.id),
    ]);
    setClients(c);
    setSuppliers(s);
    setMovements((m.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const buildSummaries = (type: 'client' | 'supplier', entities: any[]): AccountSummary[] => {
    return entities.map(e => {
      const acctMovements = movements.filter((m: any) => m.account_type === type && m.account_id === e.id);
      const balances: Record<string, number> = {};
      acctMovements.forEach((m: any) => {
        const curr = m.currency || 'USD';
        if (!balances[curr]) balances[curr] = 0;
        balances[curr] += m.movement_type === 'credit' ? Number(m.amount) : -Number(m.amount);
      });
      return { id: e.id, name: e.name, type, balances };
    });
  };

  const clientSummaries = useMemo(() => buildSummaries('client', clients), [clients, movements]);
  const supplierSummaries = useMemo(() => buildSummaries('supplier', suppliers), [suppliers, movements]);

  const filterBySearch = (list: AccountSummary[]) =>
    list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  const renderList = (list: AccountSummary[]) => {
    const filtered = filterBySearch(list);
    if (filtered.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">Sin resultados</p>;
    return (
      <div className="space-y-2">
        {filtered.map(a => {
          const currencies = Object.entries(a.balances);
          const hasBalance = currencies.some(([, v]) => v !== 0);
          return (
            <Card key={a.id} className="cursor-pointer transition-colors hover:bg-accent/50" onClick={() => setSelectedAccount({ id: a.id, name: a.name, type: a.type })}>
              <CardContent className="flex items-center justify-between p-3">
                <span className="font-medium">{a.name}</span>
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
    );
  };

  if (loading) return <><Header /><div className="container mx-auto p-6 text-center text-muted-foreground">Cargando cuentas...</div></>;

  return (
    <>
      <Header />
      <div className="container mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cuentas Corrientes</h1>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Tabs defaultValue="clients">
          <TabsList>
            <TabsTrigger value="clients" className="gap-2"><Users className="h-4 w-4" />Clientes</TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2"><Truck className="h-4 w-4" />Proveedores</TabsTrigger>
          </TabsList>
          <TabsContent value="clients">{renderList(clientSummaries)}</TabsContent>
          <TabsContent value="suppliers">{renderList(supplierSummaries)}</TabsContent>
        </Tabs>
      </div>

      {selectedAccount && (
        <AccountDetail
          accountId={selectedAccount.id}
          accountName={selectedAccount.name}
          accountType={selectedAccount.type}
          open={!!selectedAccount}
          onClose={() => { setSelectedAccount(null); load(); }}
        />
      )}
    </>
  );
}
