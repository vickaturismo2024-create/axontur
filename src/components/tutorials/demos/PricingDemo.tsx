import { useState } from 'react';
import { Calculator, DollarSign, Edit3 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

function InteractivePricingDemo() {
  const [mode, setMode] = useState<'automatic' | 'manual'>('automatic');
  const [margin, setMargin] = useState(15);
  const [manualPrice, setManualPrice] = useState(1500);

  const netCost = 1200;
  const salePrice = mode === 'automatic' ? Math.round(netCost * (1 + margin / 100)) : manualPrice;
  const profit = salePrice - netCost;

  const services = [
    { label: 'Vuelos', cost: 850 },
    { label: 'Hotel (5 noches)', cost: 600 },
    { label: 'Seguro', cost: 80 },
  ];
  const totalCost = services.reduce((sum, s) => sum + s.cost, 0);
  const totalSale = Math.round(totalCost * (1 + margin / 100));

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setMode('automatic')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            mode === 'automatic'
              ? 'bg-primary text-primary-foreground'
              : 'border border-border text-muted-foreground hover:border-primary/50'
          }`}
        >
          <Calculator className="h-3.5 w-3.5" /> Automático
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            mode === 'manual'
              ? 'bg-primary text-primary-foreground'
              : 'border border-border text-muted-foreground hover:border-primary/50'
          }`}
        >
          <Edit3 className="h-3.5 w-3.5" /> Manual
        </button>
      </div>

      {mode === 'automatic' ? (
        <div className="space-y-4 animate-fade-in">
          {/* Margin slider */}
          <div className="max-w-xs mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Margen de ganancia</span>
              <span className="font-bold text-primary text-sm">{margin}%</span>
            </div>
            <Slider
              value={[margin]}
              onValueChange={([v]) => setMargin(v)}
              min={5}
              max={40}
              step={1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>5%</span>
              <span>40%</span>
            </div>
          </div>

          {/* Cost -> Sale visualization */}
          <div className="max-w-xs mx-auto space-y-2">
            <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">Costo neto</span>
              <span className="text-sm font-semibold text-foreground">USD {netCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-center">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>+ {margin}% margen</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border-2 border-primary bg-primary/5 px-3 py-2">
              <span className="text-xs text-primary font-medium">Precio de venta</span>
              <span className="text-sm font-bold text-primary">USD {salePrice.toLocaleString()}</span>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              Ganancia: <span className="text-green-600 font-medium">USD {profit.toLocaleString()}</span>
            </div>
          </div>

          {/* Services breakdown */}
          <div className="max-w-xs mx-auto space-y-1.5 pt-2 border-t border-border">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Desglose con {margin}% margen:</p>
            {services.map(s => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium text-foreground">USD {Math.round(s.cost * (1 + margin / 100)).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs border-t pt-1.5 font-semibold">
              <span>Total por persona</span>
              <span className="text-primary">USD {totalSale.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <p className="text-xs text-muted-foreground text-center">En modo manual ingresás directamente el precio de venta:</p>
          <div className="max-w-xs mx-auto space-y-2">
            <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">Costo neto</span>
              <span className="text-sm text-foreground">USD {netCost.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border-2 border-primary bg-primary/5 px-3 py-2">
              <span className="text-xs text-primary font-medium">Precio de venta</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">USD</span>
                <input
                  type="number"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(parseInt(e.target.value) || 0)}
                  className="w-20 bg-transparent text-sm font-bold text-primary text-right outline-none border-b border-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              Ganancia: <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                USD {profit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Occupancy preview */}
      <div className="max-w-xs mx-auto pt-2 border-t border-border">
        <div className="flex items-center gap-1.5 mb-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Precio por tipo de ocupación</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Single', factor: 1.18 },
            { label: 'Doble', factor: 1.0 },
            { label: 'Triple', factor: 0.93 },
          ].map(o => (
            <div key={o.label} className="rounded-lg border border-border bg-card p-2">
              <p className="text-[10px] text-muted-foreground">{o.label}</p>
              <p className="text-xs font-semibold text-foreground">
                USD {Math.round(salePrice * o.factor).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InteractivePricingDemo;
