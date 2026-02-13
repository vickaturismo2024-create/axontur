import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RotateCcw, Play } from 'lucide-react';

export interface DemoStep {
  visual: React.ReactNode;
  description: string;
}

interface TutorialDemoProps {
  title: string;
  steps: DemoStep[];
}

export function TutorialDemo({ title, steps }: TutorialDemoProps) {
  const [active, setActive] = useState(false);
  const [current, setCurrent] = useState(0);

  if (!active) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="mt-3 gap-2"
        onClick={() => { setActive(true); setCurrent(0); }}
      >
        <Play className="h-3.5 w-3.5" /> Ver demo
      </Button>
    );
  }

  const step = steps[current];

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-card">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">
          Paso {current + 1} de {steps.length}
        </span>
      </div>

      {/* Visual area */}
      <div className="p-4 min-h-[140px] flex items-center justify-center" key={current}>
        <div className="w-full animate-fade-in">
          {step.visual}
        </div>
      </div>

      {/* Description */}
      <div className="border-t border-border px-4 py-3 bg-card/50">
        <p className="text-sm text-muted-foreground">{step.description}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="gap-1 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setCurrent(0); }}
          className="gap-1 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
        </Button>
        {current < steps.length - 1 ? (
          <Button
            variant="default"
            size="sm"
            onClick={() => setCurrent(c => c + 1)}
            className="gap-1 text-xs"
          >
            Siguiente <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActive(false)}
            className="text-xs"
          >
            Cerrar demo
          </Button>
        )}
      </div>
    </div>
  );
}
