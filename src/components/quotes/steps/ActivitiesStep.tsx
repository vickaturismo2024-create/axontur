import { Quote, Activity } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { SupplierSelect } from '@/components/quotes/SupplierSelect';
import { Plus, Trash2 } from 'lucide-react';
import { OperativeFields } from '@/components/shared/OperativeFields';

interface ActivitiesStepProps {
  quote: Quote;
  onUpdate: (updates: Partial<Quote>) => void;
}

export function ActivitiesStep({ quote, onUpdate }: ActivitiesStepProps) {
  const addActivity = () => {
    const a: Activity = { id: crypto.randomUUID(), name: '', description: '', date: '', time: '', duration: '', location: '', included: false, notes: '' };
    onUpdate({ activities: [...(quote.activities || []), a] });
  };

  const updateActivity = (id: string, u: Partial<Activity>) => {
    onUpdate({ activities: (quote.activities || []).map(a => a.id === id ? { ...a, ...u } : a) });
  };

  const removeActivity = (id: string) => onUpdate({ activities: (quote.activities || []).filter(a => a.id !== id) });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
        <p className="text-sm text-muted-foreground">
          Agrega excursiones, tours o actividades que formen parte del paquete.
        </p>
      </div>
      {(quote.activities || []).map((activity, idx) => (
        <Card key={activity.id} className="relative">
          <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-destructive" onClick={() => removeActivity(activity.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <CardContent className="pt-6">
            <p className="mb-4 font-medium text-gold">Actividad {idx + 1}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><Label>Nombre de la actividad</Label><Input value={activity.name} onChange={(e) => updateActivity(activity.id, { name: e.target.value })} placeholder="Tour a Chichén Itzá" /></div>
              <div className="md:col-span-2"><Label>Descripción</Label><Textarea value={activity.description} onChange={(e) => updateActivity(activity.id, { description: e.target.value })} placeholder="Visita guiada a las ruinas mayas..." rows={2} /></div>
              <div><Label>Fecha</Label><Input type="date" value={activity.date} onChange={(e) => updateActivity(activity.id, { date: e.target.value })} /></div>
              <div><Label>Hora</Label><Input type="time" value={activity.time} onChange={(e) => updateActivity(activity.id, { time: e.target.value })} /></div>
              <div><Label>Duración</Label><Input value={activity.duration} onChange={(e) => updateActivity(activity.id, { duration: e.target.value })} placeholder="8 horas" /></div>
              <div><Label>Ubicación</Label><Input value={activity.location} onChange={(e) => updateActivity(activity.id, { location: e.target.value })} placeholder="Yucatán, México" /></div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={activity.included} onChange={(e) => updateActivity(activity.id, { included: e.target.checked })} className="h-4 w-4 rounded border-border" />
                  Incluida en el paquete
                </label>
              </div>
              <div className="md:col-span-2">
                <OperativeFields 
                  data={activity} 
                  onChange={(updates) => updateActivity(activity.id, updates)} 
                  currency={quote.trip.currency} 
                />
              </div>
              <div><Label>Costo neto ({quote.trip.currency})</Label><Input type="number" min={0} step="0.01" value={activity.cost || ''} onChange={(e) => updateActivity(activity.id, { cost: parseFloat(e.target.value) || undefined })} placeholder="0.00" /></div>
              <div><Label>Precio venta ({quote.trip.currency})</Label><Input type="number" min={0} step="0.01" value={activity.price || ''} onChange={(e) => updateActivity(activity.id, { price: parseFloat(e.target.value) || undefined })} placeholder="0.00" /></div>
              <div className="md:col-span-2"><Label>Notas</Label><Textarea value={activity.notes} onChange={(e) => updateActivity(activity.id, { notes: e.target.value })} placeholder="Incluye almuerzo, traslados..." rows={2} /></div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addActivity} className="w-full">
        <Plus className="mr-2 h-4 w-4" />Agregar actividad/excursión
      </Button>
    </div>
  );
}
