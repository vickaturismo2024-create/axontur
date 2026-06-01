import { useState, useEffect, useRef } from 'react';
import { AdminOnly } from '@/components/auth/AdminOnly';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, FolderOpen, MapPin, Calendar, Users, Trash2, ExternalLink, FileText, Mail, Send, Plane } from 'lucide-react';
import { syncQuoteFlightsToReservation } from '@/lib/quoteFlightsToReservation';
import type { Quote } from '@/types/quote';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { FileServicesTab } from '@/components/files/FileServicesTab';
import { FilePassengersTab } from '@/components/files/FilePassengersTab';
import { FileReceiptsTab } from '@/components/files/FileReceiptsTab';
import { FileSuppliersTab } from '@/components/files/FileSuppliersTab';
import { FileFinancialSummary } from '@/components/files/FileFinancialSummary';
import { FileCommunicationsTab } from '@/components/files/FileCommunicationsTab';
import { FileDetailEmailDialogs } from '@/components/files/FileDetailEmailDialogs';
import { FileAttachmentsTab } from '@/components/files/FileAttachmentsTab';
import { FileIncidenciasTab } from '@/components/files/FileIncidenciasTab';
import { FileTarjetasTab } from '@/components/files/FileTarjetasTab';
import { FileDebtsTab } from '@/components/files/FileDebtsTab';
import { FileVouchersTab } from '@/components/files/FileVouchersTab';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendReservationConfirmation, sendSupplierVoucher, isInfraReady } from '@/lib/emailService';
import { toast } from 'sonner';

interface FileRecord {
  id: string;
  agency_id: string;
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

      if (f.client_id) {
        const { data: c } = await supabase.from('clients').select('email').eq('id', f.client_id).maybeSingle();
        if (c?.email) setClientEmail(c.email);
      }
    };
    load();
  }, [user, id]);

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

  const openConfirmEmail = () => setConfirmEmailOpen(true);

  const openVoucherEmail = async () => {
    if (!file) return;
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
    const infra = await isInfraReady();
    if (!infra.domainReady) {
      const ok = window.confirm('El dominio de email aún no está verificado o presenta errores recientes. ¿Enviar igual?');
      if (!ok) { setSendingEmail(false); return; }
    } else if (!infra.queueHealthy) {
      toast.warning('La cola de envíos tiene errores recientes — el envío puede demorar.');
    }
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
    const infra = await isInfraReady();
    if (!infra.domainReady) {
      const ok = window.confirm('El dominio de email aún no está verificado o presenta errores recientes. ¿Enviar igual?');
      if (!ok) { setSendingEmail(false); return; }
    } else if (!infra.queueHealthy) {
      toast.warning('La cola de envíos tiene errores recientes — el envío puede demorar.');
    }
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

  const handleDelete = async () => {
    if (!file) return;
    setDeleting(true);
    try {
      const fileId = file.id;

      const { data: receipts } = await supabase.from('file_receipts').select('id').eq('file_id', fileId);
      if (receipts && receipts.length > 0) {
        const receiptIds = receipts.map(r => r.id);
        await supabase.from('file_receipt_items').delete().in('receipt_id', receiptIds);
      }

      await Promise.all([
        supabase.from('file_services').delete().eq('file_id', fileId),
        supabase.from('file_passengers').delete().eq('file_id', fileId),
        supabase.from('file_receipts').delete().eq('file_id', fileId),
        supabase.from('file_supplier_payments').delete().eq('file_id', fileId),
      ]);

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
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }
  if (!file) return null;

  const fileLabel  = `FILE-${String(file.file_number).padStart(3, '0')}`;
  const statusInfo = STATUS_OPTIONS.find(s => s.value === status);

  const STATUS_PILL_CLASS: Record<string, string> = {
    confirmed:   'status-pill confirmed',
    in_progress: 'status-pill pending',
    completed:   'status-pill cerrado',
    cancelled:   'status-pill cancelado',
  };

  return (
    <div className="min-h-screen bg-background animate-fadeInUp">
      <Header />
      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8 max-w-7xl">

        {/* ── Topbar ──────────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/files')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Expedientes
          </Button>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">Enviar email</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={openConfirmEmail}>
                  <Send className="mr-2 h-4 w-4" /> Confirmación al cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openVoucherEmail}>
                  <FileText className="mr-2 h-4 w-4" /> Voucher a operador
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AdminOnly>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deleting} className="gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">{deleting ? 'Eliminando...' : 'Eliminar'}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar {fileLabel}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán todos los datos asociados (servicios, pasajeros, recibos y pagos). Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </AdminOnly>
          </div>
        </div>

        {/* ── Hero del expediente ──────────────────────────────── */}
        <div className="mb-5 overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* Barra de color según estado */}
          <div className={`h-1 w-full ${
            status === 'confirmed'   ? 'bg-primary' :
            status === 'in_progress' ? 'bg-amber-500' :
            status === 'completed'   ? 'bg-emerald-500' :
            'bg-destructive'
          }`} />

          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {/* Lado izquierdo */}
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <FolderOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-mono text-2xl font-bold text-foreground sm:text-3xl tracking-tight">
                      {fileLabel}
                    </h1>
                    <span className={STATUS_PILL_CLASS[status] || 'status-pill'}>
                      {statusInfo?.label}
                    </span>
                  </div>

                  {/* Metadatos */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    <button
                      onClick={() => navigate(`/clients?highlight=${encodeURIComponent(file.client_name)}`)}
                      className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {file.client_name || 'Sin cliente'}
                      <ExternalLink className="h-3 w-3" />
                    </button>

                    {file.destination && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />{file.destination}
                      </span>
                    )}

                    {file.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(file.start_date).toLocaleDateString('es-AR')}
                        {file.end_date && ` → ${new Date(file.end_date).toLocaleDateString('es-AR')}`}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />{file.travelers} pax
                    </span>

                    {file.quote_id && (
                      <button
                        onClick={() => navigate(`/quote/${file.quote_id}`)}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />Presupuesto
                      </button>
                    )}

                    {file.quote_id && (
                      <button
                        onClick={async () => {
                          if (!user || !file.quote_id) return;
                          const { data: q, error } = await supabase
                            .from('quotes').select('*').eq('id', file.quote_id).maybeSingle();
                          if (error || !q) { toast.error('No se pudo leer el presupuesto'); return; }
                          const result = await syncQuoteFlightsToReservation(q as unknown as Quote, file.id, user.id);
                          if (result.created) toast.success(`${result.segmentsCreated} vuelo(s) sincronizados`);
                          else if (result.reason === 'already_exists') toast.info('Vuelos ya sincronizados');
                          else if (result.reason === 'no_valid_flights') toast.info('Sin vuelos con fecha y horario');
                          else toast.error('No se pudieron sincronizar los vuelos');
                        }}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Plane className="h-3.5 w-3.5" />Sincronizar vuelos
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Lado derecho — precio */}
              <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end sm:text-right gap-2 border-t sm:border-0 pt-3 sm:pt-0">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {file.currency} {file.total_price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Costo: {file.currency} {file.total_cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                  {file.total_price > 0 && file.total_cost > 0 && (
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Margen: {(((file.total_price - file.total_cost) / file.total_cost) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Estado + Notas ───────────────────────────────────── */}
        <div className="mb-5 rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="shrink-0">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Estado del expediente
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notas internas
                </label>
                {lastSaved && (
                  <span className="text-xs text-muted-foreground">
                    ✓ Guardado {lastSaved.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Notas privadas sobre este expediente... (autoguardado)"
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <Tabs defaultValue="summary">
          <div className="mb-4 overflow-x-auto">
            <TabsList className="flex-wrap h-auto gap-0.5 w-full sm:w-auto">
              <TabsTrigger value="summary"       className="text-xs sm:text-sm">Info</TabsTrigger>
              <TabsTrigger value="services"      className="text-xs sm:text-sm">Servicios</TabsTrigger>
              <TabsTrigger value="payments"      className="text-xs sm:text-sm">Pagos</TabsTrigger>
              <TabsTrigger value="deudas"        className="text-xs sm:text-sm">Deudas</TabsTrigger>
              <TabsTrigger value="attachments"   className="text-xs sm:text-sm">Archivos</TabsTrigger>
              <TabsTrigger value="receipts"      className="text-xs sm:text-sm">Recibos</TabsTrigger>
              <TabsTrigger value="tarjetas"      className="text-xs sm:text-sm">Tarjetas</TabsTrigger>
              <TabsTrigger value="incidencias"   className="text-xs sm:text-sm">Incidencias</TabsTrigger>
              <TabsTrigger value="vouchers"      className="text-xs sm:text-sm">Vouchers</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="summary">
            <div className="space-y-6">
              <FileFinancialSummary fileId={file.id} />
              <div className="grid gap-6 md:grid-cols-2">
                <FilePassengersTab fileId={file.id} />
                <FileCommunicationsTab fileId={file.id} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="services">
            <FileServicesTab fileId={file.id} currency={file.currency} />
          </TabsContent>
          <TabsContent value="payments">
            <FileSuppliersTab fileId={file.id} currency={file.currency} />
          </TabsContent>
          <TabsContent value="deudas">
            <FileDebtsTab fileId={file.id} currency={file.currency} />
          </TabsContent>
          <TabsContent value="attachments">
            <FileAttachmentsTab fileId={file.id} agencyId={file.agency_id} />
          </TabsContent>
          <TabsContent value="receipts">
            <FileReceiptsTab fileId={file.id} clientName={file.client_name} currency={file.currency} clientId={file.client_id} />
          </TabsContent>
          <TabsContent value="tarjetas">
            <FileTarjetasTab fileId={file.id} />
          </TabsContent>
          <TabsContent value="incidencias">
            <FileIncidenciasTab fileId={file.id} agencyId={file.agency_id} />
          </TabsContent>
          <TabsContent value="vouchers">
            <FileVouchersTab fileId={file.id} clientName={file.client_name} />
          </TabsContent>
        </Tabs>

      </main>

      <FileDetailEmailDialogs
        fileLabel={fileLabel}
        confirmEmailOpen={confirmEmailOpen}
        setConfirmEmailOpen={setConfirmEmailOpen}
        clientEmail={clientEmail}
        setClientEmail={setClientEmail}
        sendingEmail={sendingEmail}
        handleSendConfirmation={handleSendConfirmation}
        voucherEmailOpen={voucherEmailOpen}
        setVoucherEmailOpen={setVoucherEmailOpen}
        voucherSupplier={voucherSupplier}
        setVoucherSupplier={setVoucherSupplier}
        voucherEmail={voucherEmail}
        setVoucherEmail={setVoucherEmail}
        handleSendVoucher={handleSendVoucher}
      />
    </div>
  );
};

export default FileDetail;
