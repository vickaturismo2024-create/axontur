import { useState } from 'react';
import { BedDouble, Users } from 'lucide-react';

const basePrice = 1200;
const occupancies = [
  { type: 'single', label: 'Single', guests: 1, factor: 1.0, rooms: 1, icon: '🛏️' },
  { type: 'double', label: 'Doble', guests: 2, factor: 0.65, rooms: 1, icon: '🛏️🛏️' },
  { type: 'triple', label: 'Triple', guests: 3, factor: 0.50, rooms: 1, icon: '🛏️🛏️🛏️' },
];

function InteractiveOccupancyDemo() {
  const [selected, setSelected] = useState('double');
  const selectedOcc = occupancies.find(o => o.type === selected)!;
  const pricePerPerson = Math.round(basePrice * selectedOcc.factor);
  const totalRoom = pricePerPerson * selectedOcc.guests;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <BedDouble className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium text-foreground">Precio por tipo de ocupación</span>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Precio base del hotel: <span className="font-medium text-foreground">USD {basePrice.toLocaleString()}</span> por habitación
      </p>

      {/* Occupancy selector */}
      <div className="flex gap-2 max-w-xs mx-auto">
        {occupancies.map(occ => {
          const pp = Math.round(basePrice * occ.factor);
          const isActive = selected === occ.type;
          return (
            <button
              key={occ.type}
              onClick={() => setSelected(occ.type)}
              className={`flex-1 rounded-lg border p-3 text-center transition-all cursor-pointer ${
                isActive
                  ? 'border-2 border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              <p className="text-sm mb-1">{occ.icon}</p>
              <p className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{occ.label}</p>
              <p className="text-[10px] text-muted-foreground">
                <Users className="h-3 w-3 inline mr-0.5" />
                {occ.guests} pax
              </p>
              <p className={`text-sm font-bold mt-1 ${isActive ? 'text-primary' : 'text-foreground'}`}>
                USD {pp.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">por persona</p>
            </button>
          );
        })}
      </div>

      {/* Detail */}
      <div className="max-w-xs mx-auto rounded-lg border border-border bg-card p-3 animate-fade-in" key={selected}>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tipo de ocupación:</span>
            <span className="font-medium text-foreground">{selectedOcc.label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pasajeros por habitación:</span>
            <span className="font-medium text-foreground">{selectedOcc.guests}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Precio por persona:</span>
            <span className="font-bold text-primary">USD {pricePerPerson.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t pt-1.5">
            <span className="text-muted-foreground">Total habitación:</span>
            <span className="font-medium text-foreground">USD {totalRoom.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Activá las ocupaciones dentro de cada hotel para mostrar precios diferenciados.
      </p>
    </div>
  );
}

export default InteractiveOccupancyDemo;
