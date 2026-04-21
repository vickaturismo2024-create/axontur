/**
 * Wrapper para envío de emails transaccionales vía la edge function
 * `send-transactional-email` de Lovable Cloud.
 *
 * Cada envío genera HTML con las plantillas de `emailTemplates.ts` y se loguea
 * en la tabla `email_logs` para auditoría.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  reservationConfirmationTemplate,
  receiptEmailTemplate,
  supplierVoucherTemplate,
  type AgencyInfo,
  type ReservationConfirmationData,
  type ReceiptEmailData,
  type SupplierVoucherData,
} from './emailTemplates';

export type EmailTemplateType =
  | 'reservation_confirmation'
  | 'receipt'
  | 'supplier_voucher'
  | 'custom';

interface BaseSendOptions {
  to: string;
  userId: string;
  fileId?: string | null;
  receiptId?: string | null;
  reservationId?: string | null;
}

interface SendResult {
  success: boolean;
  error?: string;
}

export async function getAgencyInfo(userId: string): Promise<AgencyInfo> {
  const { data } = await supabase
    .from('profiles')
    .select('agency_name, email, phone, address, cuit, logo_url, website')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    name: (data?.agency_name as string) || 'Mi Agencia',
    email: (data?.email as string) || '',
    phone: (data?.phone as string) || '',
    address: (data?.address as string) || '',
    cuit: (data?.cuit as string) || '',
    logoUrl: (data?.logo_url as string) || '',
    website: (data?.website as string) || '',
  };
}

async function logEmail(opts: {
  userId: string;
  to: string;
  subject: string;
  templateType: EmailTemplateType;
  status: 'sent' | 'failed';
  errorMessage?: string;
  fileId?: string | null;
  receiptId?: string | null;
  reservationId?: string | null;
}) {
  try {
    await supabase.from('email_logs').insert({
      user_id: opts.userId,
      to_email: opts.to,
      subject: opts.subject,
      template_type: opts.templateType,
      status: opts.status,
      error_message: opts.errorMessage ?? null,
      file_id: opts.fileId ?? null,
      receipt_id: opts.receiptId ?? null,
      reservation_id: opts.reservationId ?? null,
    });
  } catch (e) {
    console.error('Failed to log email', e);
  }
}

async function sendViaEdgeFunction(args: {
  to: string;
  subject: string;
  html: string;
  templateType: EmailTemplateType;
  idempotencyKey: string;
}): Promise<SendResult> {
  try {
    // Para esta iteración, usamos `send-transactional-email` con un template
    // genérico "raw-html" que recibe el HTML pre-renderizado vía templateData.
    // Si la edge function aún no acepta HTML inline, esto fallará y quedará
    // logueado como error en email_logs.
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'raw-html',
        recipientEmail: args.to,
        idempotencyKey: args.idempotencyKey,
        templateData: {
          subject: args.subject,
          html: args.html,
        },
      },
    });
    if (error) return { success: false, error: error.message || 'Error de envío' };
    if (data && (data as any).error) return { success: false, error: String((data as any).error) };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Error desconocido' };
  }
}

// ============================================================================
// Senders públicos
// ============================================================================

export async function sendReservationConfirmation(
  opts: BaseSendOptions & { data: ReservationConfirmationData },
): Promise<SendResult> {
  const agency = await getAgencyInfo(opts.userId);
  const { subject, html } = reservationConfirmationTemplate(opts.data, agency);
  const result = await sendViaEdgeFunction({
    to: opts.to,
    subject,
    html,
    templateType: 'reservation_confirmation',
    idempotencyKey: `reservation-${opts.fileId || crypto.randomUUID()}-${Date.now()}`,
  });
  await logEmail({
    userId: opts.userId,
    to: opts.to,
    subject,
    templateType: 'reservation_confirmation',
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error,
    fileId: opts.fileId,
  });
  return result;
}

export async function sendReceiptEmail(
  opts: BaseSendOptions & { data: ReceiptEmailData },
): Promise<SendResult> {
  const agency = await getAgencyInfo(opts.userId);
  const { subject, html } = receiptEmailTemplate(opts.data, agency);
  const result = await sendViaEdgeFunction({
    to: opts.to,
    subject,
    html,
    templateType: 'receipt',
    idempotencyKey: `receipt-${opts.receiptId || crypto.randomUUID()}-${Date.now()}`,
  });
  await logEmail({
    userId: opts.userId,
    to: opts.to,
    subject,
    templateType: 'receipt',
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error,
    fileId: opts.fileId,
    receiptId: opts.receiptId,
  });
  return result;
}

export async function sendSupplierVoucher(
  opts: BaseSendOptions & { data: SupplierVoucherData },
): Promise<SendResult> {
  const agency = await getAgencyInfo(opts.userId);
  const { subject, html } = supplierVoucherTemplate(opts.data, agency);
  const result = await sendViaEdgeFunction({
    to: opts.to,
    subject,
    html,
    templateType: 'supplier_voucher',
    idempotencyKey: `voucher-${opts.fileId || crypto.randomUUID()}-${Date.now()}`,
  });
  await logEmail({
    userId: opts.userId,
    to: opts.to,
    subject,
    templateType: 'supplier_voucher',
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error,
    fileId: opts.fileId,
  });
  return result;
}
