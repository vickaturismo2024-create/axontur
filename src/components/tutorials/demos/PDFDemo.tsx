import { useState, useEffect } from 'react';
import { FileText, Download, Share2, QrCode } from 'lucide-react';

function InteractivePDFDemo() {
  const [buildStep, setBuildStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay || buildStep >= 3) return;
    const timer = setTimeout(() => setBuildStep(s => s + 1), 1200);
    return () => clearTimeout(timer);
  }, [buildStep, autoPlay]);

  const sections = [
    { label: 'Portada', color: 'bg-primary' },
    { label: 'Vuelos', color: 'bg-blue-500/20' },
    { label: 'Hotel', color: 'bg-amber-500/20' },
  ];

  return (
    <div className="space-y-4">
      {/* Progressive PDF build */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-foreground">El PDF se arma progresivamente</p>
        <div className="flex items-center gap-2">
          {sections.map((sec, i) => (
            <button
              key={sec.label}
              onClick={() => { setBuildStep(i + 1); setAutoPlay(false); }}
              className={`text-[10px] px-2 py-1 rounded-full transition-all cursor-pointer ${
                i < buildStep
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < buildStep ? '✓ ' : ''}{sec.label}
            </button>
          ))}
        </div>

        {/* Mini PDF */}
        <div className="w-32 rounded border border-border bg-card shadow-sm overflow-hidden">
          {/* Cover */}
          <div className={`transition-all duration-500 overflow-hidden ${buildStep >= 1 ? 'h-12' : 'h-0'}`}>
            <div className="h-12 bg-primary flex items-end p-1">
              <span className="text-[6px] text-primary-foreground font-bold">PRESUPUESTO</span>
            </div>
          </div>
          {/* Flights section */}
          <div className={`transition-all duration-500 overflow-hidden ${buildStep >= 2 ? 'h-8' : 'h-0'}`}>
            <div className="p-1.5 space-y-0.5 bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center gap-0.5">
                <span className="text-[5px] text-blue-600">✈️</span>
                <div className="h-0.5 w-10 rounded bg-blue-300/50" />
              </div>
              <div className="h-0.5 w-8 rounded bg-blue-300/30" />
            </div>
          </div>
          {/* Hotel section */}
          <div className={`transition-all duration-500 overflow-hidden ${buildStep >= 3 ? 'h-8' : 'h-0'}`}>
            <div className="p-1.5 space-y-0.5 bg-amber-50 dark:bg-amber-900/10">
              <div className="flex items-center gap-0.5">
                <span className="text-[5px] text-amber-600">🏨</span>
                <div className="h-0.5 w-10 rounded bg-amber-300/50" />
              </div>
              <div className="h-0.5 w-8 rounded bg-amber-300/30" />
            </div>
          </div>
          {/* Empty state */}
          {buildStep === 0 && (
            <div className="h-16 flex items-center justify-center">
              <span className="text-[8px] text-muted-foreground">Vacío</span>
            </div>
          )}
        </div>

        {buildStep < 3 && (
          <button
            onClick={() => { setBuildStep(3); setAutoPlay(false); }}
            className="text-[10px] text-primary hover:underline cursor-pointer"
          >
            Completar todo →
          </button>
        )}
      </div>

      {/* Share options */}
      {buildStep >= 3 && (
        <div className="animate-fade-in">
          <p className="text-xs text-muted-foreground text-center mb-3">Una vez listo, podés:</p>
          <div className="flex justify-center gap-6">
            {[
              { icon: Download, label: 'Exportar PDF' },
              { icon: Share2, label: 'Compartir link' },
              { icon: QrCode, label: 'Código QR' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractivePDFDemo;
