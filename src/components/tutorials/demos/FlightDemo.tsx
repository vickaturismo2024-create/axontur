import { useState } from 'react';
import { Plane, Plus, ArrowRight, Luggage, Check } from 'lucide-react';

function InteractiveFlightDemo() {
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState({ origin: '', destination: '', airline: '', date: '' });
  const [showReturn, setShowReturn] = useState(false);
  const [luggage, setLuggage] = useState<string[]>([]);

  const fillField = (field: string, value: string) => {
    setFields(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-2">
        {['Agregar vuelo', 'Completar datos', 'Ida y vuelta', 'Equipaje'].map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`text-[10px] px-2.5 py-1 rounded-full transition-all ${
              i === step
                ? 'bg-primary text-primary-foreground font-medium'
                : i < step
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {i < step ? <Check className="h-3 w-3 inline mr-0.5" /> : null}
            {label}
          </button>
        ))}
      </div>

      {/* Step 0: Add flight button */}
      {step === 0 && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Sección de Vuelos</p>
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-5 py-2.5 text-sm text-primary font-medium hover:bg-primary/10 hover:border-primary/60 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Agregar vuelo
          </button>
          <p className="text-xs text-muted-foreground">Hacé clic para agregar un tramo</p>
        </div>
      )}

      {/* Step 1: Fill fields */}
      {step === 1 && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-xs text-muted-foreground mb-2">Hacé clic en cada campo para completarlo:</p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            {[
              { key: 'origin', label: 'Origen', value: 'Buenos Aires (EZE)' },
              { key: 'destination', label: 'Destino', value: 'Madrid (MAD)' },
              { key: 'date', label: 'Fecha', value: '15/03/2025' },
              { key: 'airline', label: 'Aerolínea', value: 'Iberia' },
            ].map(({ key, label, value }) => (
              <button
                key={key}
                onClick={() => fillField(key, value)}
                className="flex flex-col gap-1 text-left group"
              >
                <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                <div className={`h-8 rounded-md border px-2 flex items-center text-xs transition-all ${
                  fields[key as keyof typeof fields]
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-dashed border-primary/40 text-muted-foreground group-hover:border-primary/60 group-hover:bg-primary/5 cursor-pointer'
                }`}>
                  {fields[key as keyof typeof fields] || `Clic para completar`}
                </div>
              </button>
            ))}
          </div>
          {Object.values(fields).every(v => v) && (
            <div className="text-center animate-fade-in">
              <button onClick={() => setStep(2)} className="text-xs text-primary font-medium hover:underline">
                ¡Listo! Ver ida y vuelta →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Round trip toggle */}
      {step === 2 && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-xs text-muted-foreground text-center mb-2">Hacé clic para vincular ida y vuelta:</p>
          <div className="flex items-center justify-center gap-4">
            <div className="rounded-lg border border-border bg-card p-3 text-center text-xs">
              <p className="font-medium text-foreground">EZE → MAD</p>
              <p className="text-muted-foreground">15 Mar - Iberia</p>
            </div>
            <button
              onClick={() => setShowReturn(!showReturn)}
              className={`flex flex-col items-center transition-all cursor-pointer ${showReturn ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            >
              <ArrowRight className={`h-5 w-5 transition-transform ${showReturn ? 'rotate-0' : 'rotate-0'}`} />
              <span className="text-[10px] font-medium">{showReturn ? '✓ Vinculados' : 'Vincular'}</span>
            </button>
            <div className={`rounded-lg border p-3 text-center text-xs transition-all ${
              showReturn ? 'border-primary bg-primary/5' : 'border-dashed border-muted-foreground/30 opacity-50'
            }`}>
              <p className="font-medium text-foreground">MAD → EZE</p>
              <p className="text-muted-foreground">28 Mar - Iberia</p>
            </div>
          </div>
          {showReturn && (
            <p className="text-center text-xs text-primary animate-fade-in font-medium">
              ✈️ Los vuelos se agrupan como ida y vuelta en el presupuesto
            </p>
          )}
        </div>
      )}

      {/* Step 3: Luggage selection */}
      {step === 3 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Luggage className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">Equipaje incluido</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">Hacé clic para seleccionar:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['🎒 Art. Personal', '🧳 Carry-on 10kg', '🛄 Bodega 23kg'].map(label => (
              <button
                key={label}
                onClick={() => setLuggage(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])}
                className={`rounded-full border px-3 py-1.5 text-xs transition-all cursor-pointer ${
                  luggage.includes(label)
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-secondary/50 text-foreground hover:border-primary/50'
                }`}
              >
                {luggage.includes(label) && <Check className="h-3 w-3 inline mr-1" />}
                {label}
              </button>
            ))}
          </div>
          {luggage.length > 0 && (
            <p className="text-center text-xs text-primary animate-fade-in">
              ✓ {luggage.length} tipo(s) de equipaje seleccionado(s)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default InteractiveFlightDemo;
