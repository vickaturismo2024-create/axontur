import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, Search, FolderOpen, Send, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { sendReservationConfirmation, sendReceiptEmail, sendSupplierVoucher } from '@/lib/emailService';

interface EmailLog {
  id: string;
  user_id: string;
  file_id: string | null;
  receipt_id: string | null;
  reservation_id: string | null;
  to_email: string;
  subject: string;
  template_type: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  created_at: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  reservation_confirmation: 'Confirmación de Reserva',
  receipt: 'Recibo de Pago',
  supplier_voucher: 'Voucher a Operador',
  custom: 'Personalizado',
};

export default function Communications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery<EmailLog[]>({
    queryKey: ['global-email-logs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false });
      if (error) {
        console.error(error);
        return [];
      }
      return (data as EmailLog[]) || [];
    },
    enabled: !!user,
  });

  const fileIds = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.file_id).filter(Boolean))) as string[];
  }, [logs]);

  const { data: fileNumbers = {} } = useQuery<Record<string, number>>({
    queryKey: ['global-email-log-files', fileIds.length],
    queryFn: async () => {
      if (fileIds.length === 0) return {};
      const { data } = await supabase.from('files').select('id, file_number').in('id', fileIds);
      const map: Record<string, number> = {};
      ((data as any[]) || []).forEach(f => {
        map[f.id] = f.file_number;
      });
      return map;
    },
    enabled: fileIds.length > 0,
  });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (templateFilter !== 'all' && log.template_type !== templateFilter) return false;

      const dateStr = log.sent_at ? log.sent_at.split('T')[0] : '';
      if (fromDate && dateStr < fromDate) return false;
      if (toDate && dateStr > toDate) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchEmail = log.to_email.toLowerCase().includes(q);
        const matchSubject = log.subject.toLowerCase().includes(q);
        const matchFile = log.file_id && String(fileNumbers[log.file_id] || '').includes(q);
        if (!matchEmail && !matchSubject && !matchFile) return false;
      }

      return true;
    });
  }, [logs, statusFilter, templateFilter, fromDate, toDate, search, fileNumbers]);

  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter(l => l.status === 'sent').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 100;
    return { total, sent, failed, successRate };
  }, [logs]);

  const handleResend = async (log: EmailLog) => {
    if (!user) return;
    setResendingId(log.id);
    try {
      let result: { success: boolean; error?: string } = { success: false, error: 'Plantilla no soportada' };

      if (log.file_id) {
        const { data: file } = await supabase.from('files').select('*').eq('id', log.file_id).maybeSingle();
        if (file) {
          if (log.template_type === 'reservation_confirmation') {
            result = await sendReservationConfirmation({
              to: log.to_email,
              userId: user.id,
              fileId: log.file_id,
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
          } else if (log.template_type === 'receipt' && log.receipt_id) {
            const { data: receipt } = await supabase.from('file_receipts').select('*').eq('id', log.receipt_id).maybeSingle();
            if (receipt) {
              result = await sendReceiptEmail({
                to: log.to_email,
                userId: user.id,
                fileId: log.file_id,
                receiptId: log.receipt_id,
                data: {
                  clientName: receipt.client_name,
                  receiptNumber: `REC-${String(receipt.receipt_number).padStart(4, '0')}`,
                  paymentDate: receipt.payment_date,
                  concept: receipt.concept,
                  currency: receipt.currency,
                  amount: receipt.amount,
                  paymentMethod: receipt.payment_method ?? '',
                },
              });
            }
          } else if (log.template_type === 'supplier_voucher') {
            const { data: services } = await supabase
              .from('file_services')
              .select('description, supplier_name, service_date, confirmation_number')
              .eq('file_id', log.file_id);
            const svc = (services || [])[0];
            result = await sendSupplierVoucher({
              to: log.to_email,
              userId: user.id,
              fileId: log.file_id,
              data: {
                supplierName: svc?.supplier_name || '',
                fileNumber: `FILE-${String(file.file_number).padStart(3, '0')}`,
                serviceDescription: svc?.description || file.destination,
                serviceDate: svc?.service_date ?? undefined,
                passengerNames: [file.client_name],
                confirmationNumber: svc?.confirmation_number ?? undefined,
              },
            });
          }
        }
      }

      if (result.success) {
        toast.success('Email reenviado correctamente');
        qc.invalidateQueries({ queryKey: ['global-email-logs'] });
      } else {
        toast.error(result.error || 'No se pudo reenviar');
      }
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background animate-fadeInUp">
      <Header />
      <main className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" /> Central de Comunicaciones
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Auditoría y log completo de envíos de correos electrónicos de la agencia.
            </p>
          </div>
          <Link to="/settings">
            <Button variant="outline" size="sm">
              Configurar Plantillas
            </Button>
          </Link>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Send className="h-4 w-4 text-blue-500" /> Total Envíos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Entregados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.sent} <span className="text-xs font-normal text-muted-foreground">({stats.successRate}%)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Con Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        {/* FILTERS + TABLE */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-primary">Historial de Correos ({filteredLogs.length})</CardTitle>
            <div className="grid gap-2 mt-3 sm:grid-cols-2 md:grid-cols-5">
              <div className="relative md:col-span-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email, asunto o expediente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="sent">Entregado</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Tipo de correo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="reservation_confirmation">Confirmación</SelectItem>
                  <SelectItem value="receipt">Recibo de pago</SelectItem>
                  <SelectItem value="supplier_voucher">Voucher a Operador</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-1">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="h-9 text-xs"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2 py-4">
                {[0, 1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                No hay comunicaciones registradas con los filtros aplicados.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha / Hora</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Tipo / Asunto</TableHead>
                    <TableHead>Expediente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => {
                    const isSent = log.status === 'sent';
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(log.sent_at).toLocaleString('es-AR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.to_email}</TableCell>
                        <TableCell>
                          <p className="text-xs font-semibold">
                            {TEMPLATE_LABELS[log.template_type] || log.template_type}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{log.subject}</p>
                        </TableCell>
                        <TableCell>
                          {log.file_id ? (
                            <Link
                              to={`/files/${log.file_id}`}
                              className="text-xs flex items-center gap-1 text-primary hover:underline font-mono"
                            >
                              <FolderOpen className="h-3 w-3" />
                              FILE-{String(fileNumbers[log.file_id] || '?').padStart(3, '0')}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSent ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" /> Enviado
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1 text-[10px]" title={log.error_message || ''}>
                              <AlertCircle className="h-3 w-3" /> Fallido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            disabled={resendingId === log.id}
                            onClick={() => handleResend(log)}
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                            Reenviar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
