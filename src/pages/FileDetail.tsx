import { useState, useEffect, useRef } from 'react';
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
import { FileCommunicationsTab } from '@/components/files/FileCommunicationsTab';
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

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

      // Cargar email del cliente vinculado
      if (f.client_id) {
        const { data: c } = await supabase.from('clients').select('email').eq('id', f.client_id).maybeSingle();
        if (c?.email) setClientEmail(c.email);
      }
    };
    load();
  }, [user, id]);

  // Autosave de notas con debounce 1s
  useEffect(() => {
    if (loading || !file || isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(async () => {
      const { error } = await supabase.from('files').update({ internal_notes: notes }).eq('id', file.id);
      if (!error) setLastSaved(new Date());
    }, 1000);
    return () => { if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current); };
  }, [notes, file?.id, loading]);

  // Guardado inmediato del estado
  useEffect(() => {
    if (loading || !file || file.status === status) return;
    supabase.from('files').update({ status }).eq('id', file.id).then(({ error }) => {
      if (!error) {
        setFile({ ...file, status });
        toast.success('Estado actualizado');
      } else {
        toast.error('Error al cambiar estado');
      }
    });
  }, [status]);

  const openConfirmEmail = () => {
    setConfirmEmailOpen(true);
  };

  const openVoucherEmail = async () => {
    if (!file) return;
    // Cargar servicios del expediente para elegir cuáles incluir en el voucher
    const { data: services } = await supabase
      .from('file_services')
      .select('description, supplier_name, service_date, confirmation_number, supplier_id')
      .eq('file_id', file.id);

    const list = (services || []).map(s => ({
      description: s.description || '',
      supplier_name: s.supplier_name || '',
      service_date: s.service_date,
      confirmation_number: s.confirmation_number,
    }));
    setVoucherServices(list);

    // Pre-cargar primer proveedor con email
    const firstSupplierId = (services || []).find((s: any) => s.supplier_id)?.supplier_id;
    if (firstSupplierId) {
      const { data: sup } = await supabase.from('suppliers').select('name, email').eq('id', firstSupplierId).maybeSingle();
      if (sup) {
        setVoucherSupplier(sup.name || '');
        setVoucherEmail(sup.email || '');
      }
    }
    setVoucherEmailOpen(true);
  };

  const handleSendConfirmation = async () => {
    if (!file || !user) return;
    if (!clientEmail) { toast.error('Falta el email del cliente'); return; }
    setSendingEmail(true);
    const result = await sendReservationConfirmation({
      to: clientEmail,
      userId: user.id,
      fileId: file.id,
      data: {
        clientName: file.client_name,
        fileNumber: `FILE-${String(file.file_number).padStart(3, '0')}`,
        destination: file.destination,
        startDate: file.start_date ?? undefined,
        endDate: file.end_date ?? undefined,
        travelers: file.travelers,
        currency: file.currency,
        totalPrice: file.total_price,
      },
    });
    setSendingEmail(false);
    if (result.success) {
      toast.success('Email de confirmación enviado');
      setConfirmEmailOpen(false);
    } else {
      toast.error(result.error || 'No se pudo enviar el email');
    }
  };

  const handleSendVoucher = async () => {
    if (!file || !user) return;
    if (!voucherEmail) { toast.error('Falta el email del operador'); return; }
    if (!voucherSupplier) { toast.error('Falta el nombre del operador'); return; }
    setSendingEmail(true);
    const matching = voucherServices.filter(s => s.supplier_name === voucherSupplier);
    const svc = matching[0] || voucherServices[0];
    const result = await sendSupplierVoucher({
      to: voucherEmail,
      userId: user.id,
      fileId: file.id,
      data: {
        supplierName: voucherSupplier,
        fileNumber: `FILE-${String(file.file_number).padStart(3, '0')}`,
        serviceDescription: svc?.description || file.destination,
        serviceDate: svc?.service_date ?? undefined,
        passengerNames: [file.client_name],
        confirmationNumber: svc?.confirmation_number ?? undefined,
      },
    });
    setSendingEmail(false);
    if (result.success) {
      toast.success('Voucher enviado al operador');
      setVoucherEmailOpen(false);
    } else {
      toast.error(result.error || 'No se pudo enviar el voucher');
    }
  };

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
        <main className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-9 w-48" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-64 w-full" />
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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Mail className="mr-2 h-4 w-4" /> Enviar email
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={openConfirmEmail}>
                  <Send className="mr-2 h-4 w-4" /> Confirmación al cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openVoucherEmail}>
                  <FileText className="mr-2 h-4 w-4" /> Voucher a operador
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium">Notas internas</label>
                {lastSaved && (
                  <span className="text-xs text-muted-foreground">Guardado {lastSaved.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas privadas sobre este expediente... (autoguardado)" />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="summary">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="summary">Resumen</TabsTrigger>
            <TabsTrigger value="services">Servicios</TabsTrigger>
            <TabsTrigger value="passengers">Pasajeros</TabsTrigger>
            <TabsTrigger value="suppliers">Operadores</TabsTrigger>
            <TabsTrigger value="receipts">Recibos</TabsTrigger>
            <TabsTrigger value="communications">Comunicaciones</TabsTrigger>
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
          <TabsContent value="communications">
            <FileCommunicationsTab fileId={file.id} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Diálogo: Confirmación al cliente */}
      <Dialog open={confirmEmailOpen} onOpenChange={setConfirmEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar confirmación al cliente</DialogTitle>
            <DialogDescription>
              Se enviará un email con los datos del expediente {fileLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="client-email">Email del cliente</Label>
              <Input
                id="client-email"
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEmailOpen(false)} disabled={sendingEmail}>
              Cancelar
            </Button>
            <Button onClick={handleSendConfirmation} disabled={sendingEmail || !clientEmail}>
              <Send className="mr-2 h-4 w-4" />{sendingEmail ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Voucher a operador */}
      <Dialog open={voucherEmailOpen} onOpenChange={setVoucherEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar voucher a operador</DialogTitle>
            <DialogDescription>
              Se enviará un voucher con los datos del servicio del expediente {fileLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="voucher-supplier">Nombre del operador</Label>
              <Input
                id="voucher-supplier"
                value={voucherSupplier}
                onChange={e => setVoucherSupplier(e.target.value)}
                placeholder="Operador / Mayorista"
              />
            </div>
            <div>
              <Label htmlFor="voucher-email">Email del operador</Label>
              <Input
                id="voucher-email"
                type="email"
                value={voucherEmail}
                onChange={e => setVoucherEmail(e.target.value)}
                placeholder="operador@ejemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoucherEmailOpen(false)} disabled={sendingEmail}>
              Cancelar
            </Button>
            <Button onClick={handleSendVoucher} disabled={sendingEmail || !voucherEmail || !voucherSupplier}>
              <Send className="mr-2 h-4 w-4" />{sendingEmail ? 'Enviando...' : 'Enviar voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileDetail;
