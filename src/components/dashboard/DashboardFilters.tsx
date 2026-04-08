import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SlidersHorizontal, X } from 'lucide-react';

export interface DashboardFilterValues {
  dateFrom: string;
  dateTo: string;
  destination: string;
  priceMin: string;
  priceMax: string;
  currency: string;
  clientName: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const defaultFilters: DashboardFilterValues = {
  dateFrom: '', dateTo: '', destination: '', priceMin: '', priceMax: '',
  currency: 'all', clientName: '', sortBy: 'date', sortOrder: 'desc',
};

interface DashboardFiltersProps {
  filters: DashboardFilterValues;
  onChange: (filters: DashboardFilterValues) => void;
}

export function DashboardFilters({ filters, onChange }: DashboardFiltersProps) {
  const [open, setOpen] = useState(false);

  const hasFilters = filters.dateFrom || filters.dateTo || filters.destination || filters.priceMin || filters.priceMax || filters.currency !== 'all';

  const clearFilters = () => onChange(defaultFilters);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {hasFilters && <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">!</span>}
          </Button>
        </CollapsibleTrigger>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3 w-3" /> Limpiar
          </Button>
        )}
      </div>
      <CollapsibleContent className="mt-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <Label className="text-xs">Fecha desde</Label>
              <Input type="date" value={filters.dateFrom} onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Fecha hasta</Label>
              <Input type="date" value={filters.dateTo} onChange={(e) => onChange({ ...filters, dateTo: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Destino</Label>
              <Input placeholder="Ej: Europa" value={filters.destination} onChange={(e) => onChange({ ...filters, destination: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Moneda</Label>
              <select value={filters.currency} onChange={(e) => onChange({ ...filters, currency: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="all">Todas</option>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Precio mínimo</Label>
              <Input type="number" placeholder="0" value={filters.priceMin} onChange={(e) => onChange({ ...filters, priceMin: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Precio máximo</Label>
              <Input type="number" placeholder="∞" value={filters.priceMax} onChange={(e) => onChange({ ...filters, priceMax: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Ordenar por</Label>
              <select value={filters.sortBy} onChange={(e) => onChange({ ...filters, sortBy: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="date">Fecha creación</option>
                <option value="price">Precio</option>
                <option value="client">Cliente</option>
                <option value="destination">Destino</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Orden</Label>
              <select value={filters.sortOrder} onChange={(e) => onChange({ ...filters, sortOrder: e.target.value as 'asc' | 'desc' })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { defaultFilters };
