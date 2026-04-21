/**
 * Reemplazo de variables y aplicación de plantillas custom + firma.
 * Variables soportadas: {cliente}, {expediente}, {numero_recibo}, {monto}, {moneda}, {agencia}.
 */
import type { EmailTemplateConfig, EmailTemplatesConfig } from '@/contexts/SettingsContext';
import { DEFAULT_EMAIL_TEMPLATES } from '@/contexts/SettingsContext';

export type EmailTemplateKey = 'receipt' | 'confirmation' | 'voucher';

export interface EmailVariables {
  cliente?: string;
  expediente?: string;
  numero_recibo?: string;
  monto?: string | number;
  moneda?: string;
  agencia?: string;
}

export function replaceVariables(text: string, vars: EmailVariables): string {
  return text.replace(/\{(\w+)\}/g, (m, key) => {
    const v = (vars as any)[key];
    return v !== undefined && v !== null ? String(v) : m;
  });
}

export function getTemplate(
  templates: EmailTemplatesConfig | undefined,
  key: EmailTemplateKey,
): EmailTemplateConfig {
  return templates?.[key] || DEFAULT_EMAIL_TEMPLATES[key];
}

/**
 * Convierte texto plano en HTML conservando saltos de línea.
 */
export function plainToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\n/g, '<br/>');
}

/**
 * Devuelve el bloque HTML de la firma para anexar al final del cuerpo.
 */
export function renderSignatureHtml(signature: string): string {
  if (!signature?.trim()) return '';
  return `
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px;" />
    <div style="font-size:13px;color:#6b7280;line-height:1.5;">
      ${plainToHtml(signature)}
    </div>
  `;
}
