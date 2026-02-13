import { DemoStep } from '../TutorialDemo';
import { Plane, Plus, ArrowRight, Luggage } from 'lucide-react';

function MockInput({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <div className="h-8 rounded-md border border-border bg-card px-2 flex items-center text-xs text-foreground">
        {value}
      </div>
    </div>
  );
}

export const flightDemoSteps: DemoStep[] = [
  {
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Plane className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">Sección de Vuelos</p>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-2 text-xs text-primary font-medium animate-scale-in">
          <Plus className="h-3.5 w-3.5" /> Agregar vuelo
        </div>
      </div>
    ),
    description: 'Hacé clic en "Agregar vuelo" para crear un nuevo tramo. Podés agregar todos los que necesites.',
  },
  {
    visual: (
      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        <MockInput label="Origen" value="Buenos Aires (EZE)" />
        <MockInput label="Destino" value="Madrid (MAD)" />
        <MockInput label="Fecha" value="15/03/2025" />
        <MockInput label="Aerolínea" value="Iberia" />
      </div>
    ),
    description: 'Completá los datos del vuelo: origen, destino, fecha y aerolínea.',
  },
  {
    visual: (
      <div className="flex items-center justify-center gap-4">
        <div className="rounded-lg border border-border bg-card p-3 text-center text-xs">
          <p className="font-medium text-foreground">EZE → MAD</p>
          <p className="text-muted-foreground">15 Mar - Iberia</p>
        </div>
        <div className="flex flex-col items-center">
          <ArrowRight className="h-5 w-5 text-primary" />
          <span className="text-[10px] text-muted-foreground">Ida y vuelta</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center text-xs">
          <p className="font-medium text-foreground">MAD → EZE</p>
          <p className="text-muted-foreground">28 Mar - Iberia</p>
        </div>
      </div>
    ),
    description: 'Podés vincular vuelos como ida y vuelta. El sistema los agrupa automáticamente en el presupuesto.',
  },
  {
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Luggage className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Equipaje incluido</span>
        </div>
        <div className="flex gap-2">
          {['Carry-on 10kg', 'Bodega 23kg'].map(label => (
            <span key={label} className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-foreground">
              {label}
            </span>
          ))}
        </div>
      </div>
    ),
    description: 'Configurá el equipaje incluido en cada vuelo para que aparezca en el detalle del presupuesto.',
  },
];
