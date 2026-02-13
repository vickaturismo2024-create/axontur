import { useState } from 'react';
import { Car, Train, Ship, MapPin } from 'lucide-react';

const transportTypes = [
  { id: 'transfer', icon: Car, label: 'Traslados', description: 'Aeropuerto-hotel, transfers privados o compartidos', example: 'Aeropuerto Ezeiza → Hotel NH, Transfer privado' },
  { id: 'train', icon: Train, label: 'Trenes', description: 'Trayectos en tren con horarios y clase', example: 'Barcelona → Madrid, AVE 1ra clase, 10:30-13:00' },
  { id: 'ferry', icon: Ship, label: 'Ferrys', description: 'Trayectos marítimos entre islas o ciudades costeras', example: 'Atenas → Santorini, Blue Star Ferries, Cabina externa' },
  { id: 'rental', icon: MapPin, label: 'Alquiler auto', description: 'Vehículo de alquiler con fechas y lugar de retiro', example: 'Europcar Roma, SUV Compact, 15 Mar-20 Mar' },
];

function InteractiveTransportDemo() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-center">Hacé clic en cada tipo para ver un ejemplo:</p>
      <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
        {transportTypes.map(t => {
          const Icon = t.icon;
          const isActive = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(isActive ? null : t.id)}
              className={`rounded-lg border p-3 text-left transition-all cursor-pointer ${
                isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{t.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{t.description}</p>
            </button>
          );
        })}
      </div>

      {/* Example card */}
      {selected && (
        <div className="max-w-xs mx-auto animate-fade-in">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-[10px] text-primary font-medium mb-1">Ejemplo:</p>
            <p className="text-xs text-foreground">
              {transportTypes.find(t => t.id === selected)?.example}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveTransportDemo;
