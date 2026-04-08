import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface ClientSelectProps {
  onSelect: (client: { name: string; email: string; phone: string }) => void;
}

export function ClientSelect({ onSelect }: ClientSelectProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      const { data } = await supabase.from('clients' as any).select('id, name, email, phone').order('name');
      setClients((data || []).map((c: any) => ({ id: c.id, name: c.name, email: c.email || '', phone: c.phone || '' })));
    })();
  }, [user, open]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }, [clients, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Users className="mr-1 h-3.5 w-3.5" /> Clientes guardados
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." className="h-8 pl-8 text-xs" />
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">Sin resultados</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => { onSelect({ name: c.name, email: c.email, phone: c.phone }); setOpen(false); }}
              >
                <p className="font-medium">{c.name}</p>
                {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
