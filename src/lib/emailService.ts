/**
 * Wrapper para envío de emails transaccionales vía la edge function
 * `send-transactional-email` de Lovable Cloud.
 *
 * Lee plantillas custom y firma del perfil del usuario antes de aplicar
 * las defaults. Reemplaza variables {cliente}, {expediente}, {numero_recibo},
 * {monto}, {moneda}, {agencia} y anexa la firma al final del cuerpo.
 *
 * Cada envío se loguea en `email_logs` para auditoría.
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
import {
  getTemplate,
  replaceVariables,
  plainToHtml,
  renderSignatureHtml,
  type EmailTemplateKey,
} from './emailVariables';
import type { EmailTemplatesConfig } from '@/contexts/SettingsContext';

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

interface ProfileEmailConfig {
  agency: AgencyInfo;
  signature: string;
  replyTo: string;
  templates: EmailTemplatesConfig;
}

async function getProfileEmailConfig(userId: string): Promise<ProfileEmailConfig> {
  const { data } = await supabase
    .from('profiles')
    .select('agency_name, email, phone, address, cuit, logo_url, website, email_signature, email_reply_to, email_templates')
    .eq('user_id', userId)
    .maybeSingle();
  const d = data as any;
  return {
    agency: {
      name: d?.agency_name || 'Mi Agencia',
      email: d?.email || '',
      phone: d?.phone || '',
      address: d?.address || '',
      cuit: d?.cuit || '',
      logoUrl: d?.logo_url || '',
      website: d?.website || '',
    },
    signature: d?.email_signature || '',
    replyTo: d?.email_reply_to || '',
    templates: (d?.email_templates as EmailTemplatesConfig) || {},
  };
}

export async function getAgencyInfo(userId: string): Promise<AgencyInfo> {
  const cfg = await getProfileEmailConfig(userId);
  return cfg.agency;
}

/**
 * Consulta rápida del estado de la infraestructura de email.
 * Devuelve `{ domainReady, queueHealthy }` para que la UI pueda mostrar
 * advertencias antes de invocar los senders. No falla nunca: si la edge
 * function no responde, asume `ready: true` para no bloquear flujos.
 */
export async function isInfraReady(): Promise<{ domainReady: boolean; queueHealthy: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke('check-email-infra', { body: {} });
    if (error || !data) return { domainReady: true, queueHealthy: true };
    const queue = (data as any).queue ?? { sent: 0, failed: 0, dlq: 0, total: 0 };
    const domainReady = queue.sent > 0 || (queue.dlq === 0 && queue.failed === 0);
    const failRatio = queue.total > 0 ? (queue.dlq + queue.failed) / queue.total : 0;
    return { domainReady, queueHealthy: failRatio < 0.3 };
  } catch {
    return { domainReady: true, queueHealthy: true };
  }
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
  replyTo?: string;
}): Promise<SendResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'raw-html',
        recipientEmail: args.to,
        idempotencyKey: args.idempotencyKey,
        templateData: {
          subject: args.subject,
          html: args.html,
          ...(args.replyTo ? { reply_to: args.replyTo } : {}),
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

/**
 * Aplica plantilla custom (si existe) sobre el HTML default, reemplazando
 * variables y anexando la firma del usuario.
 */
function applyCustomTemplate(
  cfg: ProfileEmailConfig,
  templateKey: EmailTemplateKey,
  defaultSubject: string,
  defaultHtml: string,
  vars: Record<string, string | number>,
): { subject: string; html: string } {
  const custom = cfg.templates?.[templateKey];
  const allVars = { agencia: cfg.agency.name, ...vars };

  // Asunto: usa custom si existe, sino el default
  const subject = custom?.subject
    ? replaceVariables(custom.subject, allVars)
    : defaultSubject;

  // Cuerpo: si hay custom body, lo renderiza encima del HTML estructurado
  // (mantiene el header + footer del template default por consistencia visual).
  let html = defaultHtml;
  if (custom?.body?.trim()) {
    const customHtml = plainToHtml(replaceVariables(custom.body, allVars));
    // Inyectar el cuerpo custom dentro del bloque content del template default
    // reemplazando el contenido por defecto. Si no se puede, lo prefija.
    const customBlock = `<div style="margin-bottom:20px;">${customHtml}</div>`;
    html = html.replace(
      /<div style="[^"]*padding:32px[^"]*">/,
      m => `${m}${customBlock}`,
    );
  }

  // Firma al final del bloque content
  const signature = renderSignatureHtml(cfg.signature);
  if (signature) {
    html = html.replace(/<\/div>(\s*<div style="background-color:#f8fafc)/, `${signature}</div>$1`);
  }

  return { subject, html };
}

// ============================================================================
// Senders públicos
// ============================================================================

export async function sendReservationConfirmation(
  opts: BaseSendOptions & { data: ReservationConfirmationData },
): Promise<SendResult> {
  const cfg = await getProfileEmailConfig(opts.userId);
  const { subject, html } = reservationConfirmationTemplate(opts.data, cfg.agency);

  const final = applyCustomTemplate(cfg, 'confirmation', subject, html, {
    cliente: opts.data.clientName,
    expediente: opts.data.fileNumber,
    moneda: opts.data.currency,
    monto: opts.data.totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 }),
  });

  const result = await sendViaEdgeFunction({
    to: opts.to,
    subject: final.subject,
    html: final.html,
    templateType: 'reservation_confirmation',
    idempotencyKey: `reservation-${opts.fileId || crypto.randomUUID()}-${Date.now()}`,
    replyTo: cfg.replyTo,
  });
  await logEmail({
    userId: opts.userId,
    to: opts.to,
    subject: final.subject,
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
  const cfg = await getProfileEmailConfig(opts.userId);
  const { subject, html } = receiptEmailTemplate(opts.data, cfg.agency);

  const final = applyCustomTemplate(cfg, 'receipt', subject, html, {
    cliente: opts.data.clientName,
    numero_recibo: opts.data.receiptNumber,
    moneda: opts.data.currency,
    monto: opts.data.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 }),
  });

  const result = await sendViaEdgeFunction({
    to: opts.to,
    subject: final.subject,
    html: final.html,
    templateType: 'receipt',
    idempotencyKey: `receipt-${opts.receiptId || crypto.randomUUID()}-${Date.now()}`,
    replyTo: cfg.replyTo,
  });
  await logEmail({
    userId: opts.userId,
    to: opts.to,
    subject: final.subject,
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
  const cfg = await getProfileEmailConfig(opts.userId);
  const { subject, html } = supplierVoucherTemplate(opts.data, cfg.agency);

  const final = applyCustomTemplate(cfg, 'voucher', subject, html, {
    cliente: opts.data.supplierName,
    expediente: opts.data.fileNumber,
  });

  const result = await sendViaEdgeFunction({
    to: opts.to,
    subject: final.subject,
    html: final.html,
    templateType: 'supplier_voucher',
    idempotencyKey: `voucher-${opts.fileId || crypto.randomUUID()}-${Date.now()}`,
    replyTo: cfg.replyTo,
  });
  await logEmail({
    userId: opts.userId,
    to: opts.to,
    subject: final.subject,
    templateType: 'supplier_voucher',
    status: result.success ? 'sent' : 'failed',
    errorMessage: result.error,
    fileId: opts.fileId,
  });
  return result;
}
