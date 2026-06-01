import { Wallet, DollarSign } from 'lucide-react';
import { QuickCashWidget } from './QuickCashWidget';
import { CurrencyRatesWidget } from './CurrencyRatesWidget';

export function FinancialCenter() {
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-premium overflow-hidden transition-all duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/40 items-stretch">
        
        {/* Left Side: Caja Rápida */}
        <div className="p-5 flex flex-col justify-between relative min-h-full">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-muted-foreground">
                <Wallet className="h-4.5 w-4.5 text-[hsl(var(--gold))]" />
              </span>
              <h2 className="text-sm font-bold text-foreground">Caja Rápida de la Agencia</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Saldos netos consolidados de la caja operativa</p>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <QuickCashWidget raw />
          </div>
        </div>

        {/* Right Side: Cotizaciones */}
        <div className="p-5 flex flex-col justify-between relative min-h-full">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-muted-foreground">
                <DollarSign className="h-4.5 w-4.5 text-[hsl(var(--gold))]" />
              </span>
              <h2 className="text-sm font-bold text-foreground">Cotizaciones del Mercado</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Tipos de cambio oficiales y paralelos en tiempo real</p>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <CurrencyRatesWidget raw />
          </div>
        </div>

      </div>
    </div>
  );
}
