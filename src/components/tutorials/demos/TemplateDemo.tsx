import { useState } from 'react';
import { Palette, Type, Image } from 'lucide-react';

const colorSchemes = [
  { name: 'Navy', primary: 'hsl(220 70% 30%)', accent: 'hsl(45 80% 55%)', bg: 'hsl(220 30% 95%)' },
  { name: 'Esmeralda', primary: 'hsl(160 60% 30%)', accent: 'hsl(45 80% 55%)', bg: 'hsl(160 20% 95%)' },
  { name: 'Carmesí', primary: 'hsl(0 65% 45%)', accent: 'hsl(0 20% 30%)', bg: 'hsl(0 20% 96%)' },
  { name: 'Violeta', primary: 'hsl(270 55% 45%)', accent: 'hsl(270 40% 70%)', bg: 'hsl(270 20% 96%)' },
];

function InteractiveTemplateDemo() {
  const [selectedColor, setSelectedColor] = useState(0);
  const scheme = colorSchemes[selectedColor];

  return (
    <div className="space-y-4">
      {/* Color selector */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Hacé clic en un color:</span>
        </div>
        <div className="flex gap-3">
          {colorSchemes.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setSelectedColor(i)}
              className="flex flex-col items-center gap-1 group cursor-pointer"
            >
              <div
                className={`h-9 w-9 rounded-full border-2 shadow transition-all ${
                  i === selectedColor ? 'border-foreground scale-110' : 'border-transparent group-hover:scale-105'
                }`}
                style={{ backgroundColor: c.primary }}
              />
              <span className={`text-[10px] ${i === selectedColor ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {c.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mini PDF preview that changes */}
      <div className="flex justify-center">
        <div
          className="w-36 rounded border shadow-sm overflow-hidden transition-all duration-300"
          style={{ borderColor: scheme.primary }}
        >
          {/* Cover header */}
          <div
            className="h-14 flex flex-col items-start justify-end p-2 transition-colors duration-300"
            style={{ backgroundColor: scheme.primary }}
          >
            <span className="text-[7px] font-bold" style={{ color: scheme.accent }}>
              PRESUPUESTO
            </span>
            <span className="text-[5px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Cancún, México
            </span>
          </div>
          {/* Content */}
          <div className="p-2 space-y-1.5" style={{ backgroundColor: scheme.bg }}>
            <div className="flex items-center gap-1">
              <div className="h-1 w-1 rounded-full" style={{ backgroundColor: scheme.accent }} />
              <div className="h-1 w-16 rounded" style={{ backgroundColor: scheme.primary, opacity: 0.2 }} />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1 w-1 rounded-full" style={{ backgroundColor: scheme.accent }} />
              <div className="h-1 w-12 rounded" style={{ backgroundColor: scheme.primary, opacity: 0.2 }} />
            </div>
            <div className="h-px w-full" style={{ backgroundColor: scheme.primary, opacity: 0.1 }} />
            <div className="flex gap-1">
              <div className="h-4 flex-1 rounded" style={{ backgroundColor: scheme.primary, opacity: 0.08 }} />
              <div className="h-4 flex-1 rounded" style={{ backgroundColor: scheme.accent, opacity: 0.15 }} />
            </div>
            <div className="h-1 w-10 rounded" style={{ backgroundColor: scheme.primary, opacity: 0.15 }} />
          </div>
          {/* Footer */}
          <div
            className="h-3 transition-colors duration-300"
            style={{ backgroundColor: scheme.primary, opacity: 0.8 }}
          />
        </div>
      </div>

      {/* Font + Logo info */}
      <div className="flex justify-center gap-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <Type className="h-4 w-4 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">Tipografías</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Image className="h-4 w-4 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">Logo</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        El PDF se actualiza en tiempo real al cambiar el esquema de colores.
      </p>
    </div>
  );
}

export default InteractiveTemplateDemo;
