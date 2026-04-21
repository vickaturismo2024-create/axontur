import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  sendReservationConfirmation,
  sendReceiptEmail,
  sendSupplierVoucher,
} from '@/lib/emailService';
import { useState } from 'react';

interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  template_type: string;
  status: string;
  error_message: string | null;
  sent_at: string;
  receipt_id: string | null;
}

const TEMPLATE_LABELS: Record<string, string> = {
  reservation_confirmation: 'Confirmación al cliente',
  receipt: 'Recibo de pago',
  supplier_voucher: 'Voucher a operador',
  custom: 'Personalizado',
};

interface Props {
  fileId: string;
}

export function FileCommunicationsTab({ fileId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: logs, isLoading } = useQuery<EmailLog[]>({
    queryKey: ['email-logs', fileId],
    queryFn: async () => {
      const { data } = await supabase
        .from('email_logs')
        .select('*')
        .eq('file_id', fileId)
        .order('sent_at', { ascending: false });
      return (data as EmailLog[]) || [];
    },
  });

  const handleResend = async (log: EmailLog) => {
    if (!user) return;
    setResendingId(log.id);
    try {
      // Cargar datos del expediente para reconstruir el email
      const { data: file } = await supabase.from('files').select('*').eq('id', fileId).maybeSingle();
      if (!file) { toast.error('Expediente no encontrado'); return; }

      let result: { success: boolean; error?: string } = { success: false, error: 'Plantilla no soportada' };

      if (log.template_type === 'reservation_confirmation') {
        result = await sendReservationConfirmation({
          to: log.to_email,
          userId: user.id,
          fileId,
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
        if (!receipt) { toast.error('Recibo no encontrado'); return; }
        result = await sendReceiptEmail({
          to: log.to_email,
          userId: user.id,
          fileId,
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
      } else if (log.template_type === 'supplier_voucher') {
        const { data: services } = await supabase
          .from('file_services')
          .select('description, supplier_name, service_date, confirmation_number')
          .eq('file_id', fileId);
        const svc = (services || [])[0];
        result = await sendSupplierVoucher({
          to: log.to_email,
          userId: user.id,
          fileId,
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

      if (result.success) {
        toast.success('Email reenviado');
        qc.invalidateQueries({ queryKey: ['email-logs', fileId] });
      } else {
        toast.error(result.error || 'No se pudo reenviar');
      }
    } finally {
      setResendingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Mail className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p>No hay comunicaciones registradas para este expediente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map(log => {
        const ok = log.status === 'sent';
        return (
          <Card key={log.id}>
            <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                  {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm truncate">{log.subject || '(sin asunto)'}</span>
                    <Badge variant={ok ? 'default' : 'destructive'} className="text-[10px]">
                      {ok ? 'Enviado' : 'Falló'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {TEMPLATE_LABELS[log.template_type] || log.template_type}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>Para: {log.to_email}</span>
                    <span>{new Date(log.sent_at).toLocaleString('es-AR')}</span>
                  </div>
                  {log.error_message && (
                    <p className="mt-1 text-xs text-destructive">{log.error_message}</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={resendingId === log.id}
                onClick={() => handleResend(log)}
              >
                <RefreshCw className={`mr-1 h-3 w-3 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                Reenviar
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
