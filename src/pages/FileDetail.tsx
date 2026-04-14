import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Save, FolderOpen, MapPin, Calendar, Users } from 'lucide-react';
import { FileServicesTab } from '@/components/files/FileServicesTab';
import { FilePassengersTab } from '@/components/files/FilePassengersTab';
import { FileReceiptsTab } from '@/components/files/FileReceiptsTab';
import { FileSuppliersTab } from '@/components/files/FileSuppliersTab';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FileRecord {
  id: string;
  file_number: number;
  status: string;
  client_name: string;
  client_id: string | null;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  travelers: number;
  currency: string;
  total_price: number;
  total_cost: number;
  internal_notes: string;
  quote_id: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  confirmed: 'default',
  in_progress: 'secondary',
  completed: 'outline',
  cancelled: 'destructive',
};

const FileDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('confirmed');

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const { data, error } = await supabase.from('files').select('*').eq('id', id).single();
      if (error || !data) { toast.error('Expediente no encontrado'); navigate('/files'); return; }
      const f = data as any as FileRecord;
      setFile(f);
      setNotes(f.internal_notes || '');
      setStatus(f.status);
      setLoading(false);
    };
    load();
  }, [user, id]);

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    const { error } = await supabase.from('files').update({ status, internal_notes: notes }).eq('id', file.id);
    if (error) toast.error('Error al guardar');
    else { toast.success('Expediente actualizado'); setFile({ ...file, status, internal_notes: notes }); }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto flex items-center justify-center px-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
      </div>
    );
  }

  if (!file) return null;

  const fileLabel = `FILE-${String(file.file_number).padStart(3, '0')}`;
  const statusInfo = STATUS_OPTIONS.find(s => s.value === status);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/files')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Expedientes
        </Button>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-primary" />
              <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">{fileLabel}</h1>
              <Badge variant={STATUS_COLORS[status]}>{statusInfo?.label}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{file.client_name || 'Sin cliente'}</span>
              {file.destination && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{file.destination}</span>}
              {file.start_date && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(file.start_date).toLocaleDateString('es-AR')}{file.end_date ? ` - ${new Date(file.end_date).toLocaleDateString('es-AR')}` : ''}</span>}
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />{file.travelers} pax</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{file.currency} {file.total_price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
            <p className="text-sm text-muted-foreground">Costo: {file.currency} {file.total_cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Status + Notes */}
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
            <div className="flex-shrink-0">
              <label className="mb-1 block text-sm font-medium">Estado</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Notas internas</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas privadas sobre este expediente..." />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />{saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="services">
          <TabsList className="mb-4">
            <TabsTrigger value="services">Servicios</TabsTrigger>
            <TabsTrigger value="passengers">Pasajeros</TabsTrigger>
            <TabsTrigger value="suppliers">Operadores</TabsTrigger>
            <TabsTrigger value="receipts">Recibos</TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            <FileServicesTab fileId={file.id} currency={file.currency} />
          </TabsContent>
          <TabsContent value="passengers">
            <FilePassengersTab fileId={file.id} />
          </TabsContent>
          <TabsContent value="suppliers">
            <FileSuppliersTab fileId={file.id} currency={file.currency} />
          </TabsContent>
          <TabsContent value="receipts">
            <FileReceiptsTab fileId={file.id} clientName={file.client_name} currency={file.currency} clientId={file.client_id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FileDetail;
