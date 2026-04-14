import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useQuotesSafe } from '@/contexts/QuotesContext';
import { Search, FileText, Users, Truck, MapPin } from 'lucide-react';

interface SearchResult {
  type: 'quote' | 'client' | 'supplier';
  id: string;
  title: string;
  subtitle: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const quotesContext = useQuotesSafe();
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setQuery('');
      const fetchAll = async (table: 'clients' | 'suppliers', fields: string) => {
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
      };
      fetchAll('clients', 'id, name, email, phone').then(setClients);
      fetchAll('suppliers', 'id, name, type, email').then(setSuppliers);
    }
  }, [open]);

  // Listen for CMD+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const results: SearchResult[] = [];
  const q = query.toLowerCase().trim();

  if (q && quotesContext) {
    // Quotes
    quotesContext.quotes
      .filter(quote =>
        quote.client.name.toLowerCase().includes(q) ||
        quote.trip.destination.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach(quote => results.push({
        type: 'quote',
        id: quote.id,
        title: `${quote.trip.destination} — ${quote.client.name}`,
        subtitle: `${quote.trip.currency} ${quote.pricing.totalPrice?.toLocaleString() || 0}`,
      }));

    // Clients
    clients
      .filter((c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((c: any) => results.push({
        type: 'client',
        id: c.id,
        title: c.name,
        subtitle: c.email || c.phone || '',
      }));

    // Suppliers
    suppliers
      .filter((s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.type?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((s: any) => results.push({
        type: 'supplier',
        id: s.id,
        title: s.name,
        subtitle: s.type || '',
      }));
  }

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    switch (result.type) {
      case 'quote': navigate(`/quote/${result.id}`); break;
      case 'client': navigate('/clients'); break;
      case 'supplier': navigate('/suppliers'); break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'quote': return <FileText className="h-4 w-4 text-primary" />;
      case 'client': return <Users className="h-4 w-4 text-blue-500" />;
      case 'supplier': return <Truck className="h-4 w-4 text-orange-500" />;
      default: return null;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'quote': return 'Presupuestos';
      case 'client': return 'Clientes';
      case 'supplier': return 'Proveedores';
      default: return '';
    }
  };

  // Group results by type
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg top-[20%] translate-y-0">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Buscar presupuestos, clientes, proveedores..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 h-12"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {!q && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Escribí para buscar...
            </p>
          )}
          {q && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Sin resultados para "{query}"
            </p>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="mb-2">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">{getLabel(type)}</p>
              {items.map(item => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors"
                >
                  {getIcon(item.type)}
                  <div className="flex-1 text-left">
                    <p className="font-medium truncate">{item.title}</p>
                    {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
