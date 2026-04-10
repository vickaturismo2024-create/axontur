import { Quote } from '@/types/quote';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plane, Building, Bus, Train, Ship, Car, Compass, Anchor, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface QuoteComparatorProps {
  quotes: [Quote, Quote];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CategoryBreakdown {
  label: string;
  icon: React.ReactNode;
  getCost: (q: Quote) => number;
  getPrice: (q: Quote) => number;
}

const categories: CategoryBreakdown[] = [
  {
    label: 'Vuelos',
    icon: <Plane className="h-4 w-4" />,
    getCost: (q) => q.pricing.breakdown?.flights.cost ?? q.flights.reduce((s, f) => s + (f.cost || 0), 0),
    getPrice: (q) => q.pricing.breakdown?.flights.price ?? q.flights.reduce((s, f) => s + (f.price || 0), 0),
  },
  {
    label: 'Alojamiento',
    icon: <Building className="h-4 w-4" />,
    getCost: (q) => {
      const lodgings = q.lodgings?.length ? q.lodgings : [q.lodging];
      return lodgings.reduce((s, l) => s + (l.totalCost || 0), 0);
    },
    getPrice: (q) => {
      const lodgings = q.lodgings?.length ? q.lodgings : [q.lodging];
      return lodgings.reduce((s, l) => s + (l.totalPrice || 0), 0);
    },
  },
  {
    label: 'Traslados',
    icon: <Bus className="h-4 w-4" />,
    getCost: (q) => q.pricing.breakdown?.transfers.cost ?? q.transfers.reduce((s, t) => s + (t.cost || 0), 0),
    getPrice: (q) => q.pricing.breakdown?.transfers.price ?? q.transfers.reduce((s, t) => s + (t.price || 0), 0),
  },
  {
    label: 'Trenes',
    icon: <Train className="h-4 w-4" />,
    getCost: (q) => q.pricing.breakdown?.trains.cost ?? (q.trains || []).reduce((s, t) => s + (t.cost || 0), 0),
    getPrice: (q) => q.pricing.breakdown?.trains.price ?? (q.trains || []).reduce((s, t) => s + (t.price || 0), 0),
  },
  {
    label: 'Ferrys',
    icon: <Ship className="h-4 w-4" />,
    getCost: (q) => q.pricing.breakdown?.ferries.cost ?? (q.ferries || []).reduce((s, f) => s + (f.cost || 0), 0),
    getPrice: (q) => q.pricing.breakdown?.ferries.price ?? (q.ferries || []).reduce((s, f) => s + (f.price || 0), 0),
  },
  {
    label: 'Autos',
    icon: <Car className="h-4 w-4" />,
    getCost: (q) => q.pricing.breakdown?.rentalCars.cost ?? (q.rentalCars || []).reduce((s, r) => s + (r.cost || 0), 0),
    getPrice: (q) => q.pricing.breakdown?.rentalCars.price ?? (q.rentalCars || []).reduce((s, r) => s + (r.price || 0), 0),
  },
  {
    label: 'Actividades',
    icon: <Compass className="h-4 w-4" />,
    getCost: (q) => q.pricing.breakdown?.activities.cost ?? (q.activities || []).reduce((s, a) => s + (a.cost || 0), 0),
    getPrice: (q) => q.pricing.breakdown?.activities.price ?? (q.activities || []).reduce((s, a) => s + (a.price || 0), 0),
  },
  {
    label: 'Crucero',
    icon: <Anchor className="h-4 w-4" />,
    getCost: (q) => q.pricing.breakdown?.cruise.cost ?? (q.cruise?.cost || 0),
    getPrice: (q) => q.pricing.breakdown?.cruise.price ?? (q.cruise?.price || 0),
  },
  {
    label: 'Seguro',
    icon: <ShieldCheck className="h-4 w-4" />,
    getCost: (q) => q.pricing.breakdown?.insurance.cost ?? (q.insurance.cost || 0),
    getPrice: (q) => q.pricing.breakdown?.insurance.price ?? (q.insurance.price || 0),
  },
];

function fmtDate(d: string) {
  if (!d) return '-';
  try { return format(new Date(d), 'd MMM yyyy', { locale: es }); } catch { return d; }
}

function fmtNum(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function DiffCell({ valA, valB, value, better = 'lower' }: { valA: number; valB: number; value: number; better?: 'lower' | 'higher' }) {
  const isThis = value === valA;
  const other = isThis ? valB : valA;
  if (value === 0 && other === 0) return <span className="text-muted-foreground">-</span>;
  const isBetter = better === 'lower' ? value < other : value > other;
  const isWorse = better === 'lower' ? value > other : value < other;
  return (
    <span className={isBetter ? 'text-green-600 dark:text-green-400 font-semibold' : isWorse ? 'text-red-600 dark:text-red-400' : ''}>
      {fmtNum(value)}
    </span>
  );
}

export function QuoteComparator({ quotes, open, onOpenChange }: QuoteComparatorProps) {
  const [a, b] = quotes;

  const totalCostA = a.pricing.totalCost || 0;
  const totalCostB = b.pricing.totalCost || 0;
  const totalPriceA = a.pricing.totalPrice || 0;
  const totalPriceB = b.pricing.totalPrice || 0;
  const marginA = totalPriceA - totalCostA;
  const marginB = totalPriceB - totalCostB;
  const marginPctA = totalCostA > 0 ? ((totalPriceA - totalCostA) / totalCostA) * 100 : 0;
  const marginPctB = totalCostB > 0 ? ((totalPriceB - totalCostB) / totalCostB) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Comparador de Presupuestos</DialogTitle>
        </DialogHeader>

        {/* Trip Info */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {[a, b].map((q, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-lg">{q.trip.destination}</h3>
              <p className="text-sm text-muted-foreground">{q.client.name}</p>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>{fmtDate(q.trip.startDate)} — {fmtDate(q.trip.endDate)}</span>
                <Badge variant="outline">{q.trip.travelers} pax</Badge>
                <Badge variant="outline">{q.trip.currency}</Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Category Breakdown */}
        <div className="mt-6">
          <h4 className="font-semibold mb-3">Desglose por categoría</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-medium">Categoría</th>
                  <th className="text-right p-3 font-medium" colSpan={2}>
                    {a.trip.destination}
                  </th>
                  <th className="text-right p-3 font-medium" colSpan={2}>
                    {b.trip.destination}
                  </th>
                </tr>
                <tr className="bg-muted/30 text-xs text-muted-foreground">
                  <th></th>
                  <th className="text-right p-2">Costo</th>
                  <th className="text-right p-2">Precio</th>
                  <th className="text-right p-2">Costo</th>
                  <th className="text-right p-2">Precio</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const costA = cat.getCost(a);
                  const costB = cat.getCost(b);
                  const priceA = cat.getPrice(a);
                  const priceB = cat.getPrice(b);
                  if (costA === 0 && costB === 0 && priceA === 0 && priceB === 0) return null;
                  return (
                    <tr key={cat.label} className="border-t">
                      <td className="p-3 flex items-center gap-2">
                        {cat.icon}
                        {cat.label}
                      </td>
                      <td className="text-right p-3">
                        <DiffCell valA={costA} valB={costB} value={costA} />
                      </td>
                      <td className="text-right p-3">{fmtNum(priceA)}</td>
                      <td className="text-right p-3">
                        <DiffCell valA={costA} valB={costB} value={costB} />
                      </td>
                      <td className="text-right p-3">{fmtNum(priceB)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            { label: a.trip.destination, cost: totalCostA, price: totalPriceA, margin: marginA, pct: marginPctA, otherCost: totalCostB, otherMargin: marginB, otherPct: marginPctB },
            { label: b.trip.destination, cost: totalCostB, price: totalPriceB, margin: marginB, pct: marginPctB, otherCost: totalCostA, otherMargin: marginA, otherPct: marginPctA },
          ].map((t, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <h4 className="font-semibold">{t.label}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Costo total:</span>
                <span className="text-right">
                  <DiffCell valA={totalCostA} valB={totalCostB} value={t.cost} />
                </span>
                <span className="text-muted-foreground">Precio total:</span>
                <span className="text-right font-semibold">{fmtNum(t.price)}</span>
                <span className="text-muted-foreground">Margen:</span>
                <span className="text-right">
                  <DiffCell valA={marginA} valB={marginB} value={t.margin} better="higher" />
                </span>
                <span className="text-muted-foreground">Margen %:</span>
                <span className="text-right">
                  <DiffCell valA={marginPctA} valB={marginPctB} value={t.pct} better="higher" />
                  <span className="text-muted-foreground">%</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
