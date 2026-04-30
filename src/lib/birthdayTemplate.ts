export interface BirthdayContext {
  nombre: string;
  primer_nombre: string;
  edad: number | string;
  agencia: string;
}

export function renderTemplate(template: string, ctx: BirthdayContext): string {
  return template
    .replace(/\{\{\s*nombre\s*\}\}/gi, ctx.nombre)
    .replace(/\{\{\s*primer_nombre\s*\}\}/gi, ctx.primer_nombre)
    .replace(/\{\{\s*edad\s*\}\}/gi, String(ctx.edad))
    .replace(/\{\{\s*agencia\s*\}\}/gi, ctx.agencia);
}

/** Sanitiza un teléfono y lo convierte a formato wa.me (solo dígitos). */
export function normalizePhoneForWhatsApp(rawPhone: string, defaultCountryCode = '54'): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  // Si empieza con 00 (formato internacional europeo), descartamos los 00.
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Si empieza con 0 (formato local), lo quitamos.
  else if (digits.startsWith('0')) digits = digits.slice(1);
  // Si parece no tener código de país (longitud típica local), prependemos el default.
  const cc = (defaultCountryCode || '').replace(/\D/g, '');
  if (cc && !digits.startsWith(cc) && digits.length <= 11) {
    digits = cc + digits;
  }
  return digits;
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export const DEFAULT_BIRTHDAY_TEMPLATE =
  '¡Feliz cumpleaños, {{primer_nombre}}! 🎉 Te deseamos un día increíble lleno de alegría. Saludos desde {{agencia}}.';
