import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuotesSafe } from '@/contexts/QuotesContext';
import { Search, FileText, Users, Truck, ArrowRight } from 'lucide-react';

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
      case 'quote': return <FileText className="h-4 w-4" />;
      case 'client': return <Users className="h-4 w-4" />;
      case 'supplier': return <Truck className="h-4 w-4" />;
      default: return null;
    }
  };

  const getIconStyle = (type: string) => {
    switch (type) {
      case 'quote': return 'bg-primary/10 text-primary group-hover:bg-primary/20';
      case 'client': return 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20';
      case 'supplier': return 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20';
      default: return '';
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

  const handleQuickNav = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="p-0 gap-0 max-w-xl top-[15%] translate-y-0 border-border/30 bg-card/98 backdrop-blur-xl shadow-2xl overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border/40 bg-muted/10 px-4 py-3.5">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            placeholder="Buscar presupuestos, clientes, proveedores..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex h-10 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/50 border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0"
            autoFocus
          />
          <button 
            type="button"
            onClick={() => onOpenChange(false)} 
            className="text-xs font-medium text-muted-foreground/60 hover:text-foreground md:hidden shrink-0 transition-colors px-1"
          >
            Cancelar
          </button>
          <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-border/80 bg-muted/50 px-1.5 text-[9px] font-semibold text-muted-foreground select-none pointer-events-none">
            ESC
          </kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-3">
          {!q && (
            <div className="py-2 space-y-4">
              <p className="text-center text-xs text-muted-foreground/60 py-2">
                Escribí para iniciar la búsqueda en toda la plataforma...
              </p>
              
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold text-muted-foreground/60 tracking-wider uppercase px-2 mb-1">
                  Navegación Rápida
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickNav('/quotes')}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/20 bg-muted/5 hover:bg-primary/5 hover:border-primary/20 transition-all text-center group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/25 transition-colors">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-foreground">Presupuestos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickNav('/clients')}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/20 bg-muted/5 hover:bg-blue-500/5 hover:border-blue-500/20 transition-all text-center group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/25 transition-colors">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-foreground">Clientes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickNav('/suppliers')}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/20 bg-muted/5 hover:bg-orange-500/5 hover:border-orange-500/20 transition-all text-center group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/25 transition-colors">
                      <Truck className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-foreground">Proveedores</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {q && results.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Sin resultados para "<span className="text-foreground">{query}</span>"
              </p>
              <p className="text-xs text-muted-foreground/60">
                Probá buscando por nombre de cliente, destino, email o tipo.
              </p>
            </div>
          )}

          {q && Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="mb-4 last:mb-0">
              <div className="text-[10px] font-semibold text-muted-foreground/60 tracking-wider uppercase px-2 py-1 mb-1">
                {getLabel(type)}
              </div>
              <div className="space-y-1">
                {items.map(item => (
                  <button
                    type="button"
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    className="flex items-center gap-3.5 w-full rounded-xl px-3 py-2.5 text-sm text-left hover:bg-muted/60 transition-all duration-150 group"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors ${getIconStyle(item.type)}`}>
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:text-primary translate-x-[-4px] group-hover:translate-x-0 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
