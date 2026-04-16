import { useState } from 'react';
import { Pencil, User, Plane, Save, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  useUpdateReservation,
  useUpdatePassenger,
  useUpdateFlightSegment,
} from '@/hooks/useFlightReservations';
import type { ReservationWithDetails, ReservationPassenger, FlightSegmentWithCheckins } from '@/types/reservation';

interface EditReservationModalProps {
  reservation: ReservationWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditReservationModal({ reservation, open, onOpenChange }: EditReservationModalProps) {
  const updateReservation = useUpdateReservation();
  const updatePassenger = useUpdatePassenger();
  const updateFlightSegment = useUpdateFlightSegment();

  const [locator, setLocator] = useState(reservation.locator || '');
  const [passengers, setPassengers] = useState(reservation.passengers.map(p => ({ ...p })));
  const [segments, setSegments] = useState(reservation.flight_segments.map(s => ({ ...s })));
  const [isSaving, setIsSaving] = useState(false);

  const handlePassengerChange = (index: number, field: keyof ReservationPassenger, value: string) => {
    const updated = [...passengers];
    (updated[index] as any)[field] = value;
    setPassengers(updated);
  };

  const handleSegmentChange = (index: number, field: keyof FlightSegmentWithCheckins, value: string | null) => {
    const updated = [...segments];
    (updated[index] as any)[field] = value;
    setSegments(updated);
  };

  const formatDatetimeLocal = (dateStr: string | null | undefined): string => {
    if (!dateStr || dateStr === '') return '';
    try {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dateStr)) return dateStr.substring(0, 16);
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch { return ''; }
  };

  const parseDatetimeLocalToISO = (value: string): string | null => {
    if (!value || !value.includes('T')) return null;
    try {
      const [datePart, timePart] = value.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      if ([year, month, day, hours, minutes].some(isNaN)) return null;
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    } catch { return null; }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (locator !== reservation.locator) {
        await updateReservation.mutateAsync({ id: reservation.id, updates: { locator: locator || null } });
      }
      for (let i = 0; i < passengers.length; i++) {
        const orig = reservation.passengers[i];
        const curr = passengers[i];
        if (curr.first_name !== orig.first_name || curr.last_name !== orig.last_name || curr.title !== orig.title || curr.document !== orig.document) {
          await updatePassenger.mutateAsync({ id: curr.id, updates: { first_name: curr.first_name, last_name: curr.last_name, title: curr.title, document: curr.document } });
        }
      }
      for (let i = 0; i < segments.length; i++) {
        const orig = reservation.flight_segments[i];
        const curr = segments[i];
        if (
          curr.airline_code !== orig.airline_code || curr.flight_number !== orig.flight_number ||
          curr.origin_iata !== orig.origin_iata || curr.destination_iata !== orig.destination_iata ||
          curr.airline_locator !== orig.airline_locator || curr.booking_class !== orig.booking_class ||
          curr.segment_status !== orig.segment_status || curr.dep_datetime_local !== orig.dep_datetime_local ||
          curr.arr_datetime_local !== orig.arr_datetime_local
        ) {
          await updateFlightSegment.mutateAsync({
            id: curr.id,
            updates: {
              airline_code: curr.airline_code, flight_number: curr.flight_number,
              origin_iata: curr.origin_iata, destination_iata: curr.destination_iata,
              airline_locator: curr.airline_locator, booking_class: curr.booking_class,
              segment_status: curr.segment_status, dep_datetime_local: curr.dep_datetime_local,
              arr_datetime_local: curr.arr_datetime_local,
            },
          });
        }
      }
      toast.success('Cambios guardados');
      onOpenChange(false);
    } catch {
      toast.error('No se pudieron guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />Editar Reserva</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="passengers"><User className="h-4 w-4 mr-1" />Pasajeros</TabsTrigger>
            <TabsTrigger value="flights"><Plane className="h-4 w-4 mr-1" />Vuelos</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Localizador GDS (PNR)</Label>
              <Input value={locator} onChange={(e) => setLocator(e.target.value.toUpperCase())} placeholder="ABC123" className="uppercase" />
            </div>
          </TabsContent>

          <TabsContent value="passengers" className="space-y-6 mt-4">
            {passengers.map((pax, index) => (
              <div key={pax.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <h4 className="font-medium text-sm text-muted-foreground">Pasajero {index + 1}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input value={pax.last_name} onChange={(e) => handlePassengerChange(index, 'last_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={pax.first_name || ''} onChange={(e) => handlePassengerChange(index, 'first_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={pax.title || ''} onChange={(e) => handlePassengerChange(index, 'title', e.target.value)} placeholder="MR, MRS" />
                  </div>
                  <div className="space-y-2">
                    <Label>Documento</Label>
                    <Input value={pax.document || ''} onChange={(e) => handlePassengerChange(index, 'document', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="flights" className="space-y-6 mt-4">
            {segments.map((seg, index) => (
              <div key={seg.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <h4 className="font-medium text-sm text-muted-foreground">Vuelo {index + 1}: {seg.airline_code} {seg.flight_number}</h4>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <Label className="text-primary font-medium">Localizador de Aerolínea</Label>
                  <Input value={seg.airline_locator || ''} onChange={(e) => handleSegmentChange(index, 'airline_locator', e.target.value.toUpperCase())} placeholder="JFRZXA" className="mt-2 uppercase font-mono text-lg" />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2"><Label>Aerolínea</Label><Input value={seg.airline_code} onChange={(e) => handleSegmentChange(index, 'airline_code', e.target.value.toUpperCase())} className="uppercase" maxLength={3} /></div>
                  <div className="space-y-2"><Label>Número</Label><Input value={seg.flight_number} onChange={(e) => handleSegmentChange(index, 'flight_number', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Origen</Label><Input value={seg.origin_iata} onChange={(e) => handleSegmentChange(index, 'origin_iata', e.target.value.toUpperCase())} className="uppercase" maxLength={3} /></div>
                  <div className="space-y-2"><Label>Destino</Label><Input value={seg.destination_iata} onChange={(e) => handleSegmentChange(index, 'destination_iata', e.target.value.toUpperCase())} className="uppercase" maxLength={3} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Salida</Label><Input type="datetime-local" value={formatDatetimeLocal(seg.dep_datetime_local)} onChange={(e) => handleSegmentChange(index, 'dep_datetime_local', parseDatetimeLocalToISO(e.target.value))} /></div>
                  <div className="space-y-2"><Label>Llegada</Label><Input type="datetime-local" value={formatDatetimeLocal(seg.arr_datetime_local)} onChange={(e) => handleSegmentChange(index, 'arr_datetime_local', parseDatetimeLocalToISO(e.target.value))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Clase</Label><Input value={seg.booking_class || ''} onChange={(e) => handleSegmentChange(index, 'booking_class', e.target.value.toUpperCase())} className="uppercase" maxLength={2} /></div>
                  <div className="space-y-2"><Label>Estado</Label><Input value={seg.segment_status || ''} onChange={(e) => handleSegmentChange(index, 'segment_status', e.target.value.toUpperCase())} className="uppercase" maxLength={4} /></div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />{isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
