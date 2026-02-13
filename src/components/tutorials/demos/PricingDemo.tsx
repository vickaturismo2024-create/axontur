import { DemoStep } from '../TutorialDemo';
import { Calculator, ArrowDown, DollarSign } from 'lucide-react';

function PriceField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

export const pricingDemoSteps: DemoStep[] = [
  {
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Calculator className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">Sistema de Precios</p>
        <div className="flex gap-3">
          <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground font-medium">Automático</span>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Manual</span>
        </div>
      </div>
    ),
    description: 'Elegí entre modo automático (con margen) o manual (precio fijo de venta).',
  },
  {
    visual: (
      <div className="max-w-xs mx-auto space-y-2">
        <PriceField label="Costo neto" value="USD 1,200" />
        <div className="flex justify-center">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowDown className="h-3 w-3" /> Margen: 15%
          </div>
        </div>
        <PriceField label="Precio de venta" value="USD 1,380" highlight />
      </div>
    ),
    description: 'Ingresá el costo neto y un porcentaje de margen. El precio de venta se calcula automáticamente.',
  },
  {
    visual: (
      <div className="max-w-xs mx-auto space-y-2">
        <PriceField label="Vuelos" value="USD 850" />
        <PriceField label="Hotel (5 noches)" value="USD 600" />
        <PriceField label="Seguro" value="USD 80" />
        <div className="border-t border-border pt-2">
          <PriceField label="Total por persona" value="USD 1,530" highlight />
        </div>
      </div>
    ),
    description: 'El sistema suma todos los componentes y muestra el precio total por persona.',
  },
  {
    visual: (
      <div className="flex flex-col items-center gap-3">
        <DollarSign className="h-8 w-8 text-primary" />
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Single', price: 'USD 1,800' },
            { label: 'Doble', price: 'USD 1,530' },
            { label: 'Triple', price: 'USD 1,420' },
          ].map(o => (
            <div key={o.label} className="rounded-lg border border-border bg-card p-2">
              <p className="text-[10px] text-muted-foreground">{o.label}</p>
              <p className="text-xs font-semibold text-foreground">{o.price}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    description: 'Si configuraste ocupaciones, el presupuesto muestra precios diferenciados para single, doble y triple.',
  },
];
