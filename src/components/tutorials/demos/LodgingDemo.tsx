import { useState } from 'react';
import { Hotel, Plus, Star } from 'lucide-react';

function InteractiveLodgingDemo() {
  const [pricingMode, setPricingMode] = useState<'perNight' | 'total'>('perNight');
  const [showOption, setShowOption] = useState(false);
  const nights = 5;
  const pricePerNight = 120;

  return (
    <div className="space-y-4">
      {/* Hotel card */}
      <div className="max-w-xs mx-auto">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <Hotel className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Hotel Catalonia</span>
            <div className="flex ml-auto">
              {[1, 2, 3, 4].map(i => <Star key={i} className="h-3 w-3 fill-accent text-accent" />)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Barcelona, España</p>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Check-in: 15 Mar</span>
            <span>Check-out: 20 Mar</span>
          </div>

          {/* Pricing toggle */}
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground mb-2">Hacé clic para cambiar el modo:</p>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setPricingMode('perNight')}
                className={`flex-1 rounded-lg border p-2 text-center text-xs transition-all cursor-pointer ${
                  pricingMode === 'perNight'
                    ? 'border-2 border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <p className="text-[10px] text-muted-foreground">Por noche</p>
                <p className={`font-semibold ${pricingMode === 'perNight' ? 'text-primary' : 'text-foreground'}`}>
                  USD {pricePerNight}
                </p>
                {pricingMode === 'perNight' && (
                  <p className="text-[10px] text-muted-foreground animate-fade-in">
                    × {nights} noches = USD {pricePerNight * nights}
                  </p>
                )}
              </button>
              <button
                onClick={() => setPricingMode('total')}
                className={`flex-1 rounded-lg border p-2 text-center text-xs transition-all cursor-pointer ${
                  pricingMode === 'total'
                    ? 'border-2 border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <p className="text-[10px] text-muted-foreground">Total estadía</p>
                <p className={`font-semibold ${pricingMode === 'total' ? 'text-primary' : 'text-foreground'}`}>
                  USD {pricePerNight * nights}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add alternative option */}
      <div className="max-w-xs mx-auto">
        {!showOption ? (
          <button
            onClick={() => setShowOption(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 px-4 py-2.5 text-xs text-accent font-medium hover:bg-accent/10 hover:border-accent/60 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar opción alternativa
          </button>
        ) : (
          <div className="rounded-lg border border-dashed border-accent bg-accent/5 p-3 animate-scale-in">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] rounded-full bg-accent/20 text-accent px-2 py-0.5 font-medium">Opción 2</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Hotel className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Hotel NH Collection</span>
              <div className="flex ml-auto">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-3 w-3 fill-accent text-accent" />)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Barcelona, España</p>
            <div className="mt-1 text-xs text-accent font-medium">
              USD 180/noche • Total: USD {180 * nights}
            </div>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          {showOption ? 'El cliente podrá elegir entre las opciones' : 'Hacé clic para ver cómo funciona'}
        </p>
      </div>
    </div>
  );
}

export default InteractiveLodgingDemo;
