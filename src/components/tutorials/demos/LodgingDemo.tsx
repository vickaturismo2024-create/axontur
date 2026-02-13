import { DemoStep } from '../TutorialDemo';
import { Hotel, Plus, Star } from 'lucide-react';

export const lodgingDemoSteps: DemoStep[] = [
  {
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Hotel className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">Sección de Alojamiento</p>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2 text-xs text-primary font-medium">
          <Plus className="h-3.5 w-3.5" /> Agregar hotel
        </div>
      </div>
    ),
    description: 'Agregá hoteles al presupuesto. Podés incluir varias opciones para que el cliente elija.',
  },
  {
    visual: (
      <div className="max-w-xs mx-auto space-y-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground">Hotel Catalonia</span>
            <div className="flex">
              {[1, 2, 3, 4].map(i => <Star key={i} className="h-3 w-3 fill-accent text-accent" />)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Barcelona, España</p>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Check-in: 15 Mar</span>
            <span>Check-out: 20 Mar</span>
          </div>
        </div>
      </div>
    ),
    description: 'Completá nombre, ubicación, fechas de check-in/check-out y categoría del hotel.',
  },
  {
    visual: (
      <div className="max-w-xs mx-auto space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border-2 border-primary bg-primary/5 p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Por noche</p>
            <p className="text-sm font-semibold text-primary">USD 120</p>
            <p className="text-[10px] text-muted-foreground">× 5 noches = USD 600</p>
          </div>
          <div className="flex-1 rounded-lg border border-border bg-card p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Total estadía</p>
            <p className="text-sm font-semibold text-foreground">USD 600</p>
          </div>
        </div>
      </div>
    ),
    description: 'Elegí si querés cargar el precio por noche (se calcula el total) o el total directo.',
  },
];
