import { Quote, ItineraryDay } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ItineraryPDFDialog } from '@/components/quotes/ItineraryPDFDialog';

interface ItineraryStepProps {
  quote: Quote;
  onUpdate: (updates: Partial<Quote>) => void;
  itineraryVisible: boolean;
  onItineraryVisibleChange: (visible: boolean) => void;
}

export function ItineraryStep({ quote, onUpdate, itineraryVisible, onItineraryVisibleChange }: ItineraryStepProps) {
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const days = quote.itineraryDays || [];

  const addItineraryDay = () => {
    const newDay: ItineraryDay = {
      id: crypto.randomUUID(), dayNumber: days.length + 1,
      date: '', title: '', description: '', activities: [],
    };
    onUpdate({ itineraryDays: [...days, newDay] });
  };

  const updateItineraryDay = (id: string, updates: Partial<ItineraryDay>) => {
    onUpdate({ itineraryDays: days.map(d => d.id === id ? { ...d, ...updates } : d) });
  };

  const removeItineraryDay = (id: string) => {
    const updatedDays = days.filter(d => d.id !== id).map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
    onUpdate({ itineraryDays: updatedDays });
  };

  const generateItineraryWithAI = async () => {
    if (days.length > 0) {
      const confirmed = window.confirm('Ya tenés días cargados. ¿Querés reemplazarlos con el itinerario generado por IA?');
      if (!confirmed) return;
    }
    if (!quote.trip.startDate || !quote.trip.endDate) {
      toast.error('Necesitás cargar las fechas del viaje para generar el itinerario.');
      return;
    }
    setGeneratingItinerary(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: { trip: quote.trip, flights: quote.flights, lodgings: quote.lodgings || [], transfers: quote.transfers, activities: quote.activities || [], trains: quote.trains || [], ferries: quote.ferries || [], cruise: quote.cruise || null },
      });
      if (error) throw new Error(error.message || 'Error al generar el itinerario');
      if (data?.error) { toast.error(data.error); return; }
      const generatedDays: ItineraryDay[] = (data.days || []).map((day: any, idx: number) => ({
        id: crypto.randomUUID(), dayNumber: day.dayNumber || idx + 1,
        date: day.date || '', title: day.title || '', description: day.description || '', activities: day.activities || [],
      }));
      onUpdate({ itineraryDays: generatedDays });
      toast.success(`Se generaron ${generatedDays.length} días de itinerario`);
    } catch (err: any) {
      console.error('Error generating itinerary:', err);
      toast.error(err.message || 'Error al generar el itinerario con IA');
    } finally {
      setGeneratingItinerary(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button onClick={generateItineraryWithAI} disabled={generatingItinerary} className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
            {generatingItinerary ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generando...</>) : (<><Sparkles className="mr-2 h-4 w-4" />Generar itinerario con IA</>)}
          </Button>
          <ItineraryPDFDialog
            existingDaysCount={days.length}
            onDaysParsed={(parsedDays) => onUpdate({ itineraryDays: parsedDays })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="itinerary-visible" checked={itineraryVisible} onCheckedChange={onItineraryVisibleChange} />
          <Label htmlFor="itinerary-visible" className="text-sm">Mostrar itinerario en el PDF</Label>
        </div>
      </div>

      {days.map((day) => (
        <Card key={day.id} className="relative">
          <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-destructive" onClick={() => removeItineraryDay(day.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <CardContent className="pt-6">
            <p className="mb-4 font-medium text-gold">Día {day.dayNumber}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Fecha (opcional)</Label><Input type="date" value={day.date} onChange={(e) => updateItineraryDay(day.id, { date: e.target.value })} /></div>
              <div><Label>Título</Label><Input value={day.title} onChange={(e) => updateItineraryDay(day.id, { title: e.target.value })} placeholder="Llegada a Cancún" /></div>
              <div className="md:col-span-2"><Label>Descripción</Label><Textarea value={day.description} onChange={(e) => updateItineraryDay(day.id, { description: e.target.value })} placeholder="Arribo al aeropuerto..." rows={2} /></div>
              <div className="md:col-span-2">
                <Label>Actividades (una por línea)</Label>
                <Textarea value={day.activities.join('\n')} onChange={(e) => updateItineraryDay(day.id, { activities: e.target.value.split('\n').filter(Boolean) })} placeholder="Recepción en el aeropuerto&#10;Traslado al hotel&#10;Check-in" rows={4} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addItineraryDay} className="w-full">
        <Plus className="mr-2 h-4 w-4" />Agregar día
      </Button>
    </div>
  );
}
