import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus } from 'lucide-react';

interface ClientOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface DuplicateForClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (client: { name: string; email: string; phone: string }) => void;
}

export function DuplicateForClientDialog({ open, onOpenChange, onConfirm }: DuplicateForClientDialogProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      supabase
        .from('clients')
        .select('id, name, email, phone')
        .order('name')
        .then(({ data }) => {
          setClients((data || []) as ClientOption[]);
          setLoading(false);
        });
    }
    if (!open) {
      setSearch('');
      setSelectedClient(null);
    }
  }, [open, user]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleConfirm = () => {
    if (selectedClient) {
      onConfirm({
        name: selectedClient.name,
        email: selectedClient.email || '',
        phone: selectedClient.phone || '',
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Duplicar para otro cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-60 rounded-md border">
            {loading ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Cargando...</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No se encontraron clientes</p>
            ) : (
              <div className="p-1">
                {filtered.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                      selectedClient?.id === client.id ? 'bg-primary/10 text-primary font-medium' : ''
                    }`}
                  >
                    <p className="font-medium">{client.name}</p>
                    {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedClient}>
            <UserPlus className="mr-2 h-4 w-4" />Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
