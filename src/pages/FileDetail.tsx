import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Save, FolderOpen, MapPin, Calendar, Users, Trash2, ExternalLink, FileText, Mail, Send } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileServicesTab } from '@/components/files/FileServicesTab';
import { FilePassengersTab } from '@/components/files/FilePassengersTab';
import { FileReceiptsTab } from '@/components/files/FileReceiptsTab';
import { FileSuppliersTab } from '@/components/files/FileSuppliersTab';
import { FileFinancialSummary } from '@/components/files/FileFinancialSummary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendReservationConfirmation, sendSupplierVoucher } from '@/lib/emailService';
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
  const [deleting, setDeleting] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('confirmed');

  // Email dialogs
  const [confirmEmailOpen, setConfirmEmailOpen] = useState(false);
  const [voucherEmailOpen, setVoucherEmailOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [voucherEmail, setVoucherEmail] = useState('');
  const [voucherSupplier, setVoucherSupplier] = useState('');
  const [voucherServices, setVoucherServices] = useState<{ description: string; supplier_name: string; service_date: string | null; confirmation_number: string | null }[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

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

  const handleDelete = async () => {
    if (!file) return;
    setDeleting(true);
    try {
      // Cascade delete related records
      const fileId = file.id;

      // Get receipt IDs to delete receipt items
      const { data: receipts } = await supabase.from('file_receipts').select('id').eq('file_id', fileId);
      if (receipts && receipts.length > 0) {
        const receiptIds = receipts.map(r => r.id);
        await supabase.from('file_receipt_items').delete().in('receipt_id', receiptIds);
      }

      // Delete related tables
      await Promise.all([
        supabase.from('file_services').delete().eq('file_id', fileId),
        supabase.from('file_passengers').delete().eq('file_id', fileId),
        supabase.from('file_receipts').delete().eq('file_id', fileId),
        supabase.from('file_supplier_payments').delete().eq('file_id', fileId),
      ]);

      // Delete the file itself
      const { error } = await supabase.from('files').delete().eq('id', fileId);
      if (error) throw error;

      toast.success('Expediente eliminado');
      navigate('/files');
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar expediente');
      setDeleting(false);
    }
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
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/files')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Expedientes
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                <Trash2 className="mr-2 h-4 w-4" />{deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar expediente {fileLabel}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará el expediente y todos sus datos asociados (servicios, pasajeros, recibos y pagos a operadores). No se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-primary" />
              <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">{fileLabel}</h1>
              <Badge variant={STATUS_COLORS[status]}>{statusInfo?.label}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <button
                onClick={() => navigate(`/clients?highlight=${encodeURIComponent(file.client_name)}`)}
                className="font-medium text-foreground hover:text-primary hover:underline flex items-center gap-1"
              >
                {file.client_name || 'Sin cliente'}
                <ExternalLink className="h-3 w-3" />
              </button>
              {file.quote_id && (
                <button
                  onClick={() => navigate(`/quote/${file.quote_id}`)}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />Ver presupuesto
                </button>
              )}
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
        <Tabs defaultValue="summary">
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="services">Servicios</TabsTrigger>
            <TabsTrigger value="passengers">Pasajeros</TabsTrigger>
            <TabsTrigger value="suppliers">Operadores</TabsTrigger>
            <TabsTrigger value="receipts">Recibos</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <FileFinancialSummary fileId={file.id} />
          </TabsContent>
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
