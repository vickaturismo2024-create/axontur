import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  FileUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Header } from '@/components/layout/Header';
import { toast } from 'sonner';
import { parsePNR, ParsedPassenger, ParsedSegment } from '@/lib/pnrParser';
import { extractTextFromPDF } from '@/lib/pdfTextExtractor';
import { supabase } from '@/integrations/supabase/client';
import {
  useCreateReservation,
  useFindReservationByLocator,
  useUpdateReservationFromPNR,
} from '@/hooks/useFlightReservations';
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
  const updateFromPNR = useUpdateReservationFromPNR();
  const findByLocator = useFindReservationByLocator();

  const [rawText, setRawText] = useState('');
  const [gds, setGds] = useState<string>('');
  const [isParsed, setIsParsed] = useState(false);
  const [locator, setLocator] = useState('');
  const [passengers, setPassengers] = useState<EditablePassenger[]>([]);
  const [segments, setSegments] = useState<EditableSegment[]>([]);
  const [duplicateRes, setDuplicateRes] = useState<{ id: string; locator: string } | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfProgress, setPdfProgress] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error('Pegá el texto del PNR o itinerario');
      return;
    }
    const parsed = parsePNR(rawText);
    setLocator(parsed.locator || '');
    setPassengers(parsed.passengers.map((p, i) => ({ ...p, id: `pax-${i}` })));
    setSegments(parsed.segments.map((s, i) => ({ ...s, id: `seg-${i}` })));
    setIsParsed(true);

    if (parsed.segments.length === 0) {
      toast.info('No se detectaron segmentos. Podés agregarlos manualmente.');
    } else {
      toast.success(`Se detectaron ${parsed.segments.length} vuelo(s) y ${parsed.passengers.length} pasajero(s)`);
    }

    // Detectar duplicado por locator
    if (parsed.locator) {
      const existing = await findByLocator(parsed.locator);
      if (existing) {
        setDuplicateRes({ id: existing.id, locator: existing.locator || parsed.locator });
      }
    }
  };

  const buildParsedPayload = () => ({
    locator: locator || undefined,
    passengers: passengers.map(({ id, ...p }) => p),
    segments: segments.map(({ id, ...s }) => s),
    rawText,
  });

  const handleCreate = async () => {
    if (segments.length === 0) {
      toast.error('Agregá al menos un segmento de vuelo');
      return;
    }
    try {
      await createReservation.mutateAsync({
        parsed: buildParsedPayload(),
        sourceType: 'text',
        gds: gds || undefined,
      });
      toast.success(`¡Vuelo guardado! Se importaron ${segments.length} segmento(s)`);
      navigate('/reservations');
    } catch {
      toast.error('Error al guardar el vuelo');
    }
  };

  const handleUpdateExisting = async () => {
    if (!duplicateRes) return;
    try {
      const result = await updateFromPNR.mutateAsync({
        reservationId: duplicateRes.id,
        parsed: buildParsedPayload(),
        gds: gds || undefined,
      });
      if (result.changesCount > 0) {
        toast.success(`Vuelo actualizado. Se detectaron ${result.changesCount} cambio(s)`);
      } else {
        toast.success('Vuelo actualizado. Sin cambios.');
      }
      navigate(`/reservations/${duplicateRes.id}`);
    } catch {
      toast.error('Error al actualizar el vuelo');
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
    setDuplicateRes(null);
    setPdfFile(null);
  };

  const handleParsePDF = async () => {
    if (!pdfFile) {
      toast.error('Seleccioná un archivo PDF');
      return;
    }
    if (pdfFile.size > 10 * 1024 * 1024) {
      toast.error('El PDF no puede superar los 10MB');
      return;
    }
    setIsPdfLoading(true);
    try {
      const text = await extractTextFromPDF(pdfFile, setPdfProgress);
      if (!text || text.length < 20) {
        toast.error('No se pudo extraer texto (¿es un PDF escaneado?)');
        return;
      }
      setPdfProgress('Analizando con IA...');
      let apiData = null;

      try {
        const { data, error } = await supabase.functions.invoke('parse-pdf', {
          body: { text },
        });

        if (!error && data && data.flights && data.flights.length > 0) {
          apiData = data;
        } else if (error) {
          console.warn('parse-pdf edge function returned error:', error);
        }
      } catch (err) {
        console.warn('Error invoking parse-pdf edge function:', err);
      }

      // Local fallback if AI failed or returned no flights
      if (!apiData || !apiData.flights || apiData.flights.length === 0) {
        console.info('Utilizando extractor local alternativo para procesar el PDF...');
        const parsed = parsePNR(text);
        if (parsed.segments && parsed.segments.length > 0) {
          apiData = {
            locator: parsed.locator || '',
            passengers: parsed.passengers || [],
            flights: parsed.segments.map(seg => ({
              origin: seg.originIata,
              destination: seg.destinationIata,
              date: seg.depDatetime ? seg.depDatetime.toISOString().split('T')[0] : '',
              departureTime: seg.depDatetime ? seg.depDatetime.toTimeString().slice(0, 5) : '',
              arrivalTime: seg.arrDatetime ? seg.arrDatetime.toTimeString().slice(0, 5) : '',
              airline: seg.airlineCode || '',
              flightNumber: `${seg.airlineCode}${seg.flightNumber}`.trim(),
              notes: seg.rawText || '',
              flightType: 'direct',
            })),
          };
          toast.info('PDF procesado con extractor local (sin conexión IA)');
        }
      }

      if (!apiData || !apiData.flights || apiData.flights.length === 0) {
        toast.error('No se pudieron extraer vuelos del PDF (extractor local ni IA detectaron vuelos)');
        return;
      }

      // Map parsed flights to ParsedSegment format
      const mappedSegments: EditableSegment[] = (apiData.flights || []).map((f: any, i: number) => {
        const dep = f.date && f.departureTime ? new Date(`${f.date}T${f.departureTime}:00`) : undefined;
        const arr = f.date && f.arrivalTime ? new Date(`${f.date}T${(f.arrivalTime || '').replace('+1', '')}:00`) : undefined;
        const [airlineCode, ...rest] = (f.flightNumber || '').match(/^([A-Z0-9]{2})\s*(\d+)/) || [];
        const code = (f.flightNumber || '').match(/^([A-Z]{2})/)?.[1] || '';
        const num = (f.flightNumber || '').replace(/^[A-Z]{2}\s*/, '');
        const originIata = (f.origin || '').match(/\(([A-Z]{3})\)/)?.[1] || (f.origin || '').slice(0, 3).toUpperCase();
        const destIata = (f.destination || '').match(/\(([A-Z]{3})\)/)?.[1] || (f.destination || '').slice(0, 3).toUpperCase();
        return {
          id: `seg-${Date.now()}-${i}`,
          airlineCode: code,
          flightNumber: num,
          originIata,
          destinationIata: destIata,
          depDatetime: dep,
          arrDatetime: arr,
          rawText: f.notes || '',
          isIncomplete: !dep,
        };
      });
      const mappedPassengers: EditablePassenger[] = (apiData.passengers || []).map((p: any, i: number) => ({
        id: `pax-${Date.now()}-${i}`,
        lastName: p.lastName || '',
        firstName: p.firstName || '',
        title: p.title || '',
      }));
      setLocator(apiData.locator || '');
      setPassengers(mappedPassengers);
      setSegments(mappedSegments);
      setRawText(text.substring(0, 10000));
      setIsParsed(true);
      toast.success(`PDF procesado: ${mappedSegments.length} vuelo(s), ${mappedPassengers.length} pasajero(s)`);

      if (apiData.locator) {
        const existing = await findByLocator(apiData.locator);
        if (existing) setDuplicateRes({ id: existing.id, locator: existing.locator || apiData.locator });
      }
    } catch (error) {
      console.error('Error parsing PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Error al procesar el PDF');
    } finally {
      setIsPdfLoading(false);
      setPdfProgress('');
    }
  };

  const renderPreview = () => (
    <div className="space-y-6">
      {duplicateRes && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Ya existe una reserva con localizador <span className="font-mono">{duplicateRes.locator}</span></p>
              <p className="text-sm text-muted-foreground">Podés actualizarla para detectar cambios (horarios, cancelaciones, vuelos nuevos) o crear una nueva.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="font-sans text-lg font-bold text-primary">Datos de la Reserva</CardTitle></CardHeader>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-sans text-lg font-bold text-primary">Pasajeros ({passengers.length})</CardTitle>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-sans text-lg font-bold text-primary">Segmentos de Vuelo ({segments.length})</CardTitle>
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

      <div className="flex gap-3 flex-wrap">
        <Button variant="outline" onClick={resetForm}>Cancelar</Button>
        {duplicateRes ? (
          <>
            <AlertDialog>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Crear como nueva reserva</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ya existe una reserva con localizador <span className="font-mono">{duplicateRes.locator}</span>.
                    Si creás una nueva, vas a tener dos registros con el mismo PNR. ¿Continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCreate}>Crear nueva</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              onClick={handleCreate}
              disabled={createReservation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />Crear nueva
            </Button>
            <Button
              onClick={handleUpdateExisting}
              disabled={updateFromPNR.isPending || segments.length === 0}
              className="flex-1"
            >
              {updateFromPNR.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Actualizar vuelo existente
            </Button>
          </>
        ) : (
          <Button onClick={handleCreate} disabled={createReservation.isPending || segments.length === 0} className="flex-1">
            {createReservation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Guardar Vuelo
          </Button>
        )}
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
              <Link to="/reservations"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="font-sans text-2xl font-bold">Importar Vuelo</h1>
              <p className="text-muted-foreground">Pegá el texto del PNR o subí un PDF para extraer los vuelos</p>
            </div>
          </div>

          {!isParsed ? (
            <Card>
              <CardContent className="pt-6">
                <Tabs defaultValue="text">
                  <TabsList className="!grid w-full !grid-cols-2">
                    <TabsTrigger value="text"><FileText className="h-4 w-4 mr-2" />Pegar texto</TabsTrigger>
                    <TabsTrigger value="pdf"><FileUp className="h-4 w-4 mr-2" />Subir PDF</TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Copiá y pegá el texto completo desde Amadeus, Sabre u otro GDS. Si el localizador ya existe, te ofrecemos actualizar el vuelo y detectar cambios.
                    </p>
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
                  </TabsContent>

                  <TabsContent value="pdf" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Subí un e-ticket o itinerario en PDF (máx. 10MB). La IA extraerá automáticamente localizador, pasajeros y vuelos.
                    </p>
                    <div className="space-y-2">
                      <Label>Archivo PDF</Label>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        disabled={isPdfLoading}
                        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
                      />
                      {pdfFile && (
                        <p className="text-sm text-muted-foreground">📄 {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)</p>
                      )}
                    </div>
                    {isPdfLoading && pdfProgress && (
                      <div className="rounded-lg bg-muted p-3 text-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />{pdfProgress}
                      </div>
                    )}
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
                    <Button onClick={handleParsePDF} disabled={isPdfLoading || !pdfFile} className="w-full">
                      {isPdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileUp className="h-4 w-4 mr-2" />}
                      Analizar PDF
                    </Button>
                  </TabsContent>
                </Tabs>
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
