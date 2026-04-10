import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown, Plus, Store, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface SupplierSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  label?: string;
}

let cachedSuppliers: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000;

export function SupplierSelect({ value, onChange, label = 'Operador' }: SupplierSelectProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<string[]>(cachedSuppliers || []);
  const [newSupplier, setNewSupplier] = useState('');
  const [search, setSearch] = useState('');

  const loadSuppliers = useCallback(async () => {
    if (!user) return;
    if (cachedSuppliers && Date.now() - cacheTimestamp < CACHE_TTL) {
      setSuppliers(cachedSuppliers);
      return;
    }
    const { data } = await supabase
      .from('suppliers')
      .select('name')
      .order('name');
    if (data) {
      const names = data.map(s => s.name);
      cachedSuppliers = names;
      cacheTimestamp = Date.now();
      setSuppliers(names);
    }
  }, [user]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const addSupplier = async () => {
    const trimmed = newSupplier.trim();
    if (!trimmed || !user) return;
    if (suppliers.includes(trimmed)) {
      onChange(trimmed);
      setNewSupplier('');
      return;
    }
    const { error } = await supabase
      .from('suppliers')
      .insert({ name: trimmed, user_id: user.id });
    if (!error) {
      cachedSuppliers = null;
      const updated = [...suppliers, trimmed].sort();
      setSuppliers(updated);
      cachedSuppliers = updated;
      cacheTimestamp = Date.now();
      onChange(trimmed);
      setNewSupplier('');
    }
  };

  const filtered = suppliers.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Label className="text-xs flex items-center gap-1 text-muted-foreground mb-1">
        <Store className="h-3 w-3" />
        {label}
        {!value && (
          <span className="text-amber-500 flex items-center gap-0.5 ml-1">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-[10px]">Sin asignar</span>
          </span>
        )}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-9 text-sm font-normal",
              !value && "border-amber-400/60 hover:border-amber-500"
            )}
          >
            {value ? (
              <span className="truncate">{value}</span>
            ) : (
              <span className="text-muted-foreground">Sin operador</span>
            )}
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-2" align="start">
          <Input
            placeholder="Buscar operador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm mb-2"
          />
          <div className="max-h-[150px] overflow-y-auto">
            {value && (
              <button
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent text-destructive"
                onClick={() => { onChange(undefined); setOpen(false); }}
              >
                <X className="h-3 w-3" />
                Quitar operador
              </button>
            )}
            {filtered.map(s => (
              <button
                key={s}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent",
                  value === s && "bg-accent"
                )}
                onClick={() => { onChange(s); setOpen(false); setSearch(''); }}
              >
                <Check className={cn("h-3 w-3", value === s ? "opacity-100" : "opacity-0")} />
                {s}
              </button>
            ))}
            {filtered.length === 0 && suppliers.length > 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">Sin resultados</p>
            )}
          </div>
          <div className="border-t mt-2 pt-2 flex gap-1">
            <Input
              placeholder="Nuevo operador..."
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSupplier(); }}}
            />
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={addSupplier} disabled={!newSupplier.trim()}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
