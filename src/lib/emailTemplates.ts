/**
 * Plantillas HTML inline para emails transaccionales.
 * Compatibles con clientes de correo (Gmail, Outlook, Apple Mail).
 * Todos los estilos deben ser inline. No usar tags <style> ni clases.
 */

export interface AgencyInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  cuit: string;
  logoUrl: string;
  website: string;
}

const baseStyles = {
  body: 'background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:0;padding:0;',
  container: 'max-width:600px;margin:0 auto;background-color:#ffffff;',
  header: 'background-color:#1e3a5f;padding:24px;text-align:center;',
  headerTitle: 'color:#ffffff;font-size:22px;font-weight:bold;margin:0;font-family:Arial,Helvetica,sans-serif;',
  headerSub: 'color:#cbd5e1;font-size:13px;margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;',
  content: 'padding:32px 28px;color:#1f2937;font-size:14px;line-height:1.6;',
  h2: 'color:#1e3a5f;font-size:18px;margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;',
  table: 'width:100%;border-collapse:collapse;margin:16px 0;',
  td: 'padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;',
  tdLabel: 'padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;font-weight:bold;width:40%;',
  totalRow: 'padding:12px;background-color:#f1f5f9;font-weight:bold;color:#1e3a5f;font-size:16px;',
  footer: 'background-color:#f8fafc;padding:20px;text-align:center;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;',
  hr: 'border:none;border-top:1px solid #e5e7eb;margin:20px 0;',
};

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHeader(agency: AgencyInfo): string {
  const logo = agency.logoUrl
    ? `<img src="${escapeHtml(agency.logoUrl)}" alt="${escapeHtml(agency.name)}" style="max-height:50px;margin-bottom:8px;" />`
    : '';
  return `
    <div style="${baseStyles.header}">
      ${logo}
      <h1 style="${baseStyles.headerTitle}">${escapeHtml(agency.name || 'Mi Agencia')}</h1>
      ${agency.phone || agency.email ? `<p style="${baseStyles.headerSub}">${[agency.phone, agency.email].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}
    </div>
  `;
}

function renderFooter(agency: AgencyInfo): string {
  const parts = [agency.name, agency.address, agency.cuit ? `CUIT: ${agency.cuit}` : '', agency.website]
    .filter(Boolean)
    .map(escapeHtml);
  return `
    <div style="${baseStyles.footer}">
      ${parts.join(' · ')}
      <br/>
      <span style="color:#9ca3af;">Este email fue generado automáticamente desde AxonTur.</span>
    </div>
  `;
}

// ============================================================================
// 1. Confirmación de reserva
// ============================================================================
export interface ReservationConfirmationData {
  clientName: string;
  fileNumber: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  travelers: number;
  totalPrice: number;
  currency: string;
  customMessage?: string;
}

export function reservationConfirmationTemplate(
  data: ReservationConfirmationData,
  agency: AgencyInfo,
): { subject: string; html: string } {
  const subject = `Confirmación de reserva ${data.fileNumber} - ${data.destination}`;
  const dates =
    data.startDate && data.endDate
      ? `${new Date(data.startDate).toLocaleDateString('es-AR')} al ${new Date(data.endDate).toLocaleDateString('es-AR')}`
      : data.startDate
        ? new Date(data.startDate).toLocaleDateString('es-AR')
        : '—';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8" /><title>${escapeHtml(subject)}</title></head>
    <body style="${baseStyles.body}">
      <div style="${baseStyles.container}">
        ${renderHeader(agency)}
        <div style="${baseStyles.content}">
          <h2 style="${baseStyles.h2}">¡Hola ${escapeHtml(data.clientName)}!</h2>
          <p>Te confirmamos los detalles de tu viaje. Conservá este correo como comprobante.</p>
          ${data.customMessage ? `<p style="background-color:#fef3c7;padding:12px;border-left:4px solid #f59e0b;border-radius:4px;">${escapeHtml(data.customMessage)}</p>` : ''}
          <table style="${baseStyles.table}">
            <tr><td style="${baseStyles.tdLabel}">Expediente</td><td style="${baseStyles.td}"><strong>${escapeHtml(data.fileNumber)}</strong></td></tr>
            <tr><td style="${baseStyles.tdLabel}">Destino</td><td style="${baseStyles.td}">${escapeHtml(data.destination)}</td></tr>
            <tr><td style="${baseStyles.tdLabel}">Fechas</td><td style="${baseStyles.td}">${escapeHtml(dates)}</td></tr>
            <tr><td style="${baseStyles.tdLabel}">Pasajeros</td><td style="${baseStyles.td}">${data.travelers}</td></tr>
            <tr><td style="${baseStyles.tdLabel}">Importe total</td><td style="${baseStyles.td}"><strong>${escapeHtml(data.currency)} ${data.totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td></tr>
          </table>
          <p>Ante cualquier duda no dudes en contactarnos respondiendo este correo.</p>
          <p style="margin-top:24px;">¡Buen viaje!<br/><strong>${escapeHtml(agency.name)}</strong></p>
        </div>
        ${renderFooter(agency)}
      </div>
    </body>
    </html>
  `;
  return { subject, html };
}

// ============================================================================
// 2. Recibo por email
// ============================================================================
export interface ReceiptEmailData {
  clientName: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  paymentDate: string;
  concept: string;
  paymentMethod: string;
  notes?: string;
  includeBreakdown?: boolean;
  items?: Array<{ amount: number; currency: string; method: string; notes?: string }>;
}

const METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  credit_card: 'Tarjeta de Crédito',
  debit_card: 'Tarjeta de Débito',
  cash: 'Efectivo',
  check: 'Cheque',
  other: 'Otro',
};

export function receiptEmailTemplate(
  data: ReceiptEmailData,
  agency: AgencyInfo,
): { subject: string; html: string } {
  const subject = `Recibo ${data.receiptNumber} - ${agency.name || 'Mi Agencia'}`;
  const methodLabel = METHOD_LABELS[data.paymentMethod] || data.paymentMethod;

  const breakdown =
    data.includeBreakdown && data.items && data.items.length > 0
      ? `
        <h3 style="color:#1e3a5f;font-size:15px;margin:20px 0 8px;">Desglose de líneas</h3>
        <table style="${baseStyles.table}">
          <tr style="background-color:#f8fafc;">
            <td style="${baseStyles.td}"><strong>Monto</strong></td>
            <td style="${baseStyles.td}"><strong>Método</strong></td>
            <td style="${baseStyles.td}"><strong>Notas</strong></td>
          </tr>
          ${data.items
            .map(
              (it) => `
            <tr>
              <td style="${baseStyles.td}">${escapeHtml(it.currency)} ${it.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
              <td style="${baseStyles.td}">${escapeHtml(METHOD_LABELS[it.method] || it.method)}</td>
              <td style="${baseStyles.td}">${escapeHtml(it.notes || '—')}</td>
            </tr>
          `,
            )
            .join('')}
        </table>
      `
      : '';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8" /><title>${escapeHtml(subject)}</title></head>
    <body style="${baseStyles.body}">
      <div style="${baseStyles.container}">
        ${renderHeader(agency)}
        <div style="${baseStyles.content}">
          <h2 style="${baseStyles.h2}">Recibo de pago</h2>
          <p>Hola <strong>${escapeHtml(data.clientName)}</strong>, te enviamos el comprobante de tu pago.</p>
          <table style="${baseStyles.table}">
            <tr><td style="${baseStyles.tdLabel}">N° Recibo</td><td style="${baseStyles.td}"><strong style="font-family:monospace;">${escapeHtml(data.receiptNumber)}</strong></td></tr>
            <tr><td style="${baseStyles.tdLabel}">Fecha</td><td style="${baseStyles.td}">${new Date(data.paymentDate).toLocaleDateString('es-AR')}</td></tr>
            <tr><td style="${baseStyles.tdLabel}">Concepto</td><td style="${baseStyles.td}">${escapeHtml(data.concept)}</td></tr>
            <tr><td style="${baseStyles.tdLabel}">Método</td><td style="${baseStyles.td}">${escapeHtml(methodLabel)}</td></tr>
          </table>
          ${breakdown}
          <div style="${baseStyles.totalRow};margin-top:16px;border-radius:6px;text-align:right;">
            TOTAL: ${escapeHtml(data.currency)} ${data.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </div>
          ${data.notes ? `<p style="margin-top:20px;color:#6b7280;font-style:italic;">Observaciones: ${escapeHtml(data.notes)}</p>` : ''}
          <hr style="${baseStyles.hr}" />
          <p style="font-size:13px;color:#6b7280;">Adjuntamos este comprobante para tus registros. Si tenés consultas, respondé a este email.</p>
        </div>
        ${renderFooter(agency)}
      </div>
    </body>
    </html>
  `;
  return { subject, html };
}

// ============================================================================
// 3. Voucher para operador / proveedor
// ============================================================================
export interface SupplierVoucherData {
  supplierName: string;
  fileNumber: string;
  serviceDescription: string;
  serviceDate?: string;
  passengerNames: string[];
  confirmationNumber?: string;
  notes?: string;
  customMessage?: string;
}

export function supplierVoucherTemplate(
  data: SupplierVoucherData,
  agency: AgencyInfo,
): { subject: string; html: string } {
  const subject = `Voucher ${data.fileNumber} - ${data.serviceDescription}`;
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8" /><title>${escapeHtml(subject)}</title></head>
    <body style="${baseStyles.body}">
      <div style="${baseStyles.container}">
        ${renderHeader(agency)}
        <div style="${baseStyles.content}">
          <h2 style="${baseStyles.h2}">Voucher de servicio</h2>
          <p>Estimados <strong>${escapeHtml(data.supplierName)}</strong>,</p>
          <p>Adjuntamos los datos del servicio solicitado.</p>
          ${data.customMessage ? `<p style="background-color:#dbeafe;padding:12px;border-left:4px solid #2563eb;border-radius:4px;">${escapeHtml(data.customMessage)}</p>` : ''}
          <table style="${baseStyles.table}">
            <tr><td style="${baseStyles.tdLabel}">Expediente</td><td style="${baseStyles.td}"><strong>${escapeHtml(data.fileNumber)}</strong></td></tr>
            <tr><td style="${baseStyles.tdLabel}">Servicio</td><td style="${baseStyles.td}">${escapeHtml(data.serviceDescription)}</td></tr>
            ${data.serviceDate ? `<tr><td style="${baseStyles.tdLabel}">Fecha del servicio</td><td style="${baseStyles.td}">${new Date(data.serviceDate).toLocaleDateString('es-AR')}</td></tr>` : ''}
            ${data.confirmationNumber ? `<tr><td style="${baseStyles.tdLabel}">N° Confirmación</td><td style="${baseStyles.td}"><strong>${escapeHtml(data.confirmationNumber)}</strong></td></tr>` : ''}
          </table>
          <h3 style="color:#1e3a5f;font-size:15px;margin:20px 0 8px;">Pasajeros</h3>
          <ul style="padding-left:20px;line-height:1.8;">
            ${data.passengerNames.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}
          </ul>
          ${data.notes ? `<p style="margin-top:20px;color:#6b7280;"><strong>Notas:</strong> ${escapeHtml(data.notes)}</p>` : ''}
          <hr style="${baseStyles.hr}" />
          <p>Quedamos a disposición ante cualquier consulta. Saludos cordiales,</p>
          <p><strong>${escapeHtml(agency.name)}</strong></p>
        </div>
        ${renderFooter(agency)}
      </div>
    </body>
    </html>
  `;
  return { subject, html };
}
