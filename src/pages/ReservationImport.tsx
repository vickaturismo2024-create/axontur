import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { toast } from 'sonner';
import { parsePNR, ParsedPassenger, ParsedSegment } from '@/lib/pnrParser';
import { useCreateReservation } from '@/hooks/useFlightReservations';
import { Link } from 'react-router-dom';

const formatDateValue = (date: Date | string | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    return '';
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeValue = (date: Date | string | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string') {
    const match = date.match(/T(\d{2}:\d{2})/);
    if (match) return match[1];
    return '';
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

interface EditablePassenger extends ParsedPassenger {
  id: string;
}

interface EditableSegment extends ParsedSegment {
  id: string;
}

export default function ReservationImport() {
  const navigate = useNavigate();
  const createReservation = useCreateReservation();

  const [activeTab, setActiveTab] = useState('text');
  const [rawText, setRawText] = useState('');
  const [gds, setGds] = useState<string>('');
  const [isParsed, setIsParsed] = useState(false);
  const [locator, setLocator] = useState('');
  const [passengers, setPassengers] = useState<EditablePassenger[]>([]);
  const [segments, setSegments] = useState<EditableSegment[]>([]);

  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error('Pega el texto del PNR o itinerario');
      return;
    }
    const parsed = parsePNR(rawText);
    setLocator(parsed.locator || '');
    setPassengers(parsed.passengers.map((p, i) => ({ ...p, id: `pax-${i}` })));
    setSegments(parsed.segments.map((s, i) => ({ ...s, id: `seg-${i}` })));
    setIsParsed(true);

    if (parsed.segments.length === 0) {
      toast.info('No se detectaron segmentos de vuelo. Puedes agregarlos manualmente.');
    } else {
      toast.success(`Se detectaron ${parsed.segments.length} vuelo(s) y ${parsed.passengers.length} pasajero(s)`);
    }
  };

  const handleSave = async () => {
    if (segments.length === 0) {
      toast.error('Agrega al menos un segmento de vuelo');
      return;
    }
    try {
      await createReservation.mutateAsync({
        parsed: {
          locator: locator || undefined,
          passengers: passengers.map(({ id, ...p }) => p),
          segments: segments.map(({ id, ...s }) => s),
          rawText,
        },
        sourceType: 'text',
        gds: gds || undefined,
      });
      toast.success(`¡Reserva guardada! Se importaron ${segments.length} segmento(s)`);
      navigate('/reservas');
    } catch {
      toast.error('Error al guardar la reserva');
    }
  };

  const addPassenger = () => {
    setPassengers([...passengers, { id: `pax-${Date.now()}`, lastName: '', firstName: '' }]);
  };

  const removePassenger = (id: string) => {
    setPassengers(passengers.filter(p => p.id !== id));
  };

  const updatePassenger = (id: string, field: keyof ParsedPassenger, value: string) => {
    setPassengers(passengers.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addSegment = () => {
    setSegments([
      ...segments,
      { id: `seg-${Date.now()}`, airlineCode: '', flightNumber: '', originIata: '', destinationIata: '', rawText: '', isIncomplete: true },
    ]);
  };

  const removeSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id));
  };

  const updateSegment = (id: string, field: string, value: any) => {
    setSegments(segments.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const resetForm = () => {
    setRawText('');
    setGds('');
    setIsParsed(false);
    setLocator('');
    setPassengers([]);
    setSegments([]);
  };

  const renderPreview = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-lg">Datos de la Reserva</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Localizador / PNR</Label>
              <Input value={locator} onChange={(e) => setLocator(e.target.value.toUpperCase())} placeholder="ABC123" className="font-mono uppercase" />
            </div>
            <div className="space-y-2">
              <Label>Fuente</Label>
              <Select value={gds} onValueChange={setGds}>
                <SelectTrigger><SelectValue placeholder="Seleccionar GDS" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amadeus">Amadeus</SelectItem>
                  <SelectItem value="sabre">Sabre</SelectItem>
                  <SelectItem value="travelport">Travelport</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passengers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pasajeros ({passengers.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={addPassenger}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
        </CardHeader>
        <CardContent>
          {passengers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No se detectaron pasajeros.</p>
          ) : (
            <div className="space-y-3">
              {passengers.map((pax, index) => (
                <div key={pax.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                  <Input value={pax.lastName} onChange={(e) => updatePassenger(pax.id, 'lastName', e.target.value.toUpperCase())} placeholder="APELLIDO" className="flex-1 uppercase" />
                  <span className="text-muted-foreground">/</span>
                  <Input value={pax.firstName || ''} onChange={(e) => updatePassenger(pax.id, 'firstName', e.target.value.toUpperCase())} placeholder="NOMBRE" className="flex-1 uppercase" />
                  <Input value={pax.title || ''} onChange={(e) => updatePassenger(pax.id, 'title', e.target.value.toUpperCase())} placeholder="MR/MRS" className="w-20 uppercase" />
                  <Button variant="ghost" size="icon" onClick={() => removePassenger(pax.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Segments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Segmentos de Vuelo ({segments.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={addSegment}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
        </CardHeader>
        <CardContent>
          {segments.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-muted-foreground">No se detectaron vuelos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {segments.map((seg, index) => (
                <div key={seg.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Vuelo {index + 1}</span>
                    <div className="flex items-center gap-2">
                      {seg.isIncomplete && <Badge variant="outline" className="text-xs text-yellow-600">Incompleto</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => removeSegment(seg.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-6">
                    <div className="space-y-1">
                      <Label className="text-xs">Aerolínea</Label>
                      <Input value={seg.airlineCode} onChange={(e) => updateSegment(seg.id, 'airlineCode', e.target.value.toUpperCase())} placeholder="AR" className="uppercase" maxLength={2} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vuelo</Label>
                      <Input value={seg.flightNumber} onChange={(e) => updateSegment(seg.id, 'flightNumber', e.target.value)} placeholder="1234" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Origen</Label>
                      <Input value={seg.originIata} onChange={(e) => updateSegment(seg.id, 'originIata', e.target.value.toUpperCase())} placeholder="EZE" className="uppercase" maxLength={3} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Destino</Label>
                      <Input value={seg.destinationIata} onChange={(e) => updateSegment(seg.id, 'destinationIata', e.target.value.toUpperCase())} placeholder="MIA" className="uppercase" maxLength={3} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fecha</Label>
                      <Input
                        type="date"
                        value={formatDateValue(seg.depDatetime)}
                        onChange={(e) => {
                          if (e.target.value) {
                            const existingTime = formatTimeValue(seg.depDatetime) || '00:00';
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            const [hours, minutes] = existingTime.split(':').map(Number);
                            updateSegment(seg.id, 'depDatetime', new Date(year, month - 1, day, hours, minutes));
                            updateSegment(seg.id, 'isIncomplete', false);
                          } else {
                            updateSegment(seg.id, 'depDatetime', undefined);
                            updateSegment(seg.id, 'isIncomplete', true);
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hora</Label>
                      <Input
                        type="time"
                        value={formatTimeValue(seg.depDatetime)}
                        onChange={(e) => {
                          if (e.target.value) {
                            const dateStr = formatDateValue(seg.depDatetime);
                            if (dateStr) {
                              const [year, month, day] = dateStr.split('-').map(Number);
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              updateSegment(seg.id, 'depDatetime', new Date(year, month - 1, day, hours, minutes));
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Clase</Label>
                      <Input value={seg.bookingClass || ''} onChange={(e) => updateSegment(seg.id, 'bookingClass', e.target.value.toUpperCase())} placeholder="Y" className="uppercase" maxLength={2} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Estado</Label>
                      <Input value={seg.segmentStatus || ''} onChange={(e) => updateSegment(seg.id, 'segmentStatus', e.target.value.toUpperCase())} placeholder="HK" className="uppercase" maxLength={3} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Localizador Aero</Label>
                      <Input value={seg.airlineLocator || ''} onChange={(e) => updateSegment(seg.id, 'airlineLocator', e.target.value.toUpperCase())} placeholder="JFRZXA" className="uppercase font-mono" maxLength={8} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hora Llegada</Label>
                      <Input
                        type="time"
                        value={formatTimeValue(seg.arrDatetime)}
                        onChange={(e) => {
                          if (e.target.value) {
                            const dateStr = formatDateValue(seg.depDatetime);
                            if (dateStr) {
                              const [year, month, day] = dateStr.split('-').map(Number);
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              updateSegment(seg.id, 'arrDatetime', new Date(year, month - 1, day, hours, minutes));
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={resetForm}>Cancelar</Button>
        <Button onClick={handleSave} disabled={createReservation.isPending || segments.length === 0} className="flex-1">
          {createReservation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Guardar Reserva
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/reservas"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Importar Reserva</h1>
              <p className="text-muted-foreground">Pega el texto del PNR para extraer los vuelos</p>
            </div>
          </div>

          {!isParsed ? (
            <Card>
              <CardHeader>
                <CardTitle>Pegar PNR / Itinerario</CardTitle>
                <CardDescription>Copia y pega el texto completo desde Amadeus, Sabre u otro GDS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Fuente (opcional)</Label>
                  <Select value={gds} onValueChange={setGds}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Seleccionar GDS" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amadeus">Amadeus</SelectItem>
                      <SelectItem value="sabre">Sabre</SelectItem>
                      <SelectItem value="travelport">Travelport</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Texto del PNR / Itinerario</Label>
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Ejemplo:\nRP/MDQG12155/MDQG12155            BG/AS   4NOV25/1740Z   B9E9KL\n  1.ALVEZ DE VINER/ELSA BEATRIZ   2.VINER/RICARDO HORACIO\n  3  AR1328 I 17APR 5 EZEPUJ HK2  0830 1530  17APR  E  AR/JFRZXA\n  4  AR1329 I 01MAY 5 PUJEZE HK2  1935 0430  02MAY  E  AR/JFRZXA`}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>
                <Button onClick={handleParse} className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Analizar Texto
                </Button>
              </CardContent>
            </Card>
          ) : (
            renderPreview()
          )}
        </div>
      </main>
    </div>
  );
}
