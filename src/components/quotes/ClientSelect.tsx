import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';

interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  dni: string;
}

interface ClientGroup {
  id: string;
  name: string;
  members: ClientRecord[];
}

interface ClientSelectProps {
  onSelect: (client: { name: string; email: string; phone: string }) => void;
  onSelectGroup?: (members: { name: string; email: string; phone: string }[]) => void;
}

export function ClientSelect({ onSelect, onSelectGroup }: ClientSelectProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!user || !open) return;

    let isMounted = true;
    setLoading(true);

    const fetchClients = async () => {
      let query = supabase
        .from('clients')
        .select('id, name, email, phone, dni')
        .order('name')
        .limit(20);

      if (debouncedSearch.trim()) {
        const q = `%${debouncedSearch.trim()}%`;
        query = query.or(`name.ilike.${q},email.ilike.${q},dni.ilike.${q}`);
      }

      const { data } = await query;
      if (isMounted && data) {
        setClients(
          data.map((c: any) => ({
            id: c.id,
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            dni: c.dni || '',
          }))
        );
      }
      if (isMounted) setLoading(false);
    };

    fetchClients();

    return () => {
      isMounted = false;
    };
  }, [user, open, debouncedSearch]);

  useEffect(() => {
    if (!user || !open) return;

    (async () => {
      const { data: gData } = await supabase.from('client_groups').select('id, name');
      if (gData && gData.length > 0) {
        const { data: mData } = await supabase
          .from('client_group_members')
          .select('group_id, clients(id, name, email, phone, dni)');
        const members = mData || [];
        setGroups(
          gData.map((g: any) => ({
            id: g.id,
            name: g.name,
            members: members
              .filter((m: any) => m.group_id === g.id && m.clients)
              .map((m: any) => ({
                id: m.clients.id,
                name: m.clients.name || '',
                email: m.clients.email || '',
                phone: m.clients.phone || '',
                dni: m.clients.dni || '',
              })),
          }))
        );
      }
    })();
  }, [user, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Users className="mr-1 h-3.5 w-3.5" /> Clientes guardados
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente o grupo..."
            className="h-8 pl-8 text-xs"
          />
        </div>

        <Tabs defaultValue="clients">
          <TabsList className="!grid w-full !grid-cols-2 !h-8">
            <TabsTrigger value="clients" className="text-xs">
              <User className="mr-1 h-3 w-3" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="groups" className="text-xs">
              <Users className="mr-1 h-3 w-3" />
              Grupos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-2">
            <div className="max-h-48 overflow-y-auto space-y-1">
              {loading ? (
                <p className="py-2 text-center text-xs text-muted-foreground">Buscando...</p>
              ) : clients.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">Sin resultados</p>
              ) : (
                clients.map((c) => (
                  <button
                    key={c.id}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                    onClick={() => {
                      onSelect({ name: c.name, email: c.email, phone: c.phone });
                      setOpen(false);
                    }}
                  >
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.dni ? `DNI: ${c.dni}` : c.email || 'Sin datos'}
                    </p>
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="mt-2">
            <div className="max-h-48 overflow-y-auto space-y-1">
              {groups.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">No hay grupos creados</p>
              ) : (
                groups.map((g) => (
                  <button
                    key={g.id}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                    onClick={() => {
                      if (g.members.length > 0) {
                        const first = g.members[0];
                        onSelect({ name: first.name, email: first.email, phone: first.phone });
                        if (onSelectGroup) {
                          onSelectGroup(
                            g.members.map((m) => ({ name: m.name, email: m.email, phone: m.phone }))
                          );
                        }
                      }
                      setOpen(false);
                    }}
                  >
                    <p className="font-medium flex items-center gap-1">
                      <Users className="h-3 w-3" /> {g.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {g.members.length} pasajero(s):{' '}
                      {g.members.map((m) => m.name.split(' ')[0]).join(', ')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
