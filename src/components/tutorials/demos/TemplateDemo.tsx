import { DemoStep } from '../TutorialDemo';
import { Palette, Type, Image } from 'lucide-react';

export const templateDemoSteps: DemoStep[] = [
  {
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Palette className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">Plantillas de diseño</p>
        <div className="flex gap-3">
          {[
            { name: 'Navy', color: 'bg-primary' },
            { name: 'Gold', color: 'bg-accent' },
            { name: 'Rojo', color: 'bg-destructive' },
          ].map(c => (
            <div key={c.name} className="flex flex-col items-center gap-1">
              <div className={`h-8 w-8 rounded-full ${c.color} border-2 border-card shadow`} />
              <span className="text-[10px] text-muted-foreground">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    description: 'Elegí los colores principales de tu presupuesto. Cada plantilla puede tener su propio esquema.',
  },
  {
    visual: (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <Image className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Logo de la agencia</span>
        </div>
        <div className="h-16 w-40 rounded-lg border-2 border-dashed border-border bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
          Arrastrá tu logo aquí
        </div>
      </div>
    ),
    description: 'Subí el logo de tu agencia. Aparecerá en la portada y pie de página del PDF.',
  },
  {
    visual: (
      <div className="flex flex-col items-center gap-3">
        <Type className="h-5 w-5 text-primary" />
        <div className="flex gap-4">
          <div className="text-center">
            <p className="font-serif text-lg text-foreground">Playfair</p>
            <p className="text-[10px] text-muted-foreground">Títulos</p>
          </div>
          <div className="text-center">
            <p className="text-lg text-foreground" style={{ fontFamily: 'Inter' }}>Inter</p>
            <p className="text-[10px] text-muted-foreground">Texto</p>
          </div>
        </div>
      </div>
    ),
    description: 'Seleccioná las tipografías para títulos y cuerpo de texto del presupuesto.',
  },
];
