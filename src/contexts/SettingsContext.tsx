import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserSettings {
  // Agency
  agency_name: string;
  phone: string;
  address: string;
  cuit: string;
  logo_url: string;
  website: string;
  email: string;
  // Preferences
  default_currency: string;
  date_format: string;
  theme: 'light' | 'dark' | 'system';
  // Notifications
  notify_birthdays: boolean;
  notify_document_expiry: boolean;
  notify_payment_due: boolean;
  payment_due_days: number;
  document_expiry_months: number;
  // Documents
  file_prefix: string;
  receipt_prefix: string;
  pdf_footer_legal: string;
  // Email
  email_signature: string;
  email_reply_to: string;
  email_templates: EmailTemplatesConfig;
  // Birthday WhatsApp
  birthday_whatsapp_template: string;
  birthday_whatsapp_country_code: string;
  // Receipt layout settings
  receipt_header_layout: string;
  receipt_primary_color: string;
  receipt_accent_color: string;
  receipt_header_image_url: string;
}

export interface EmailTemplateConfig {
  subject: string;
  body: string;
}

export interface EmailTemplatesConfig {
  receipt?: EmailTemplateConfig;
  confirmation?: EmailTemplateConfig;
  voucher?: EmailTemplateConfig;
}

export const DEFAULT_EMAIL_TEMPLATES: Required<EmailTemplatesConfig> = {
  receipt: {
    subject: 'Recibo {numero_recibo} - {agencia}',
    body: 'Hola {cliente},\n\nTe enviamos el recibo {numero_recibo} por {moneda} {monto}.\n\nMuchas gracias.',
  },
  confirmation: {
    subject: 'Confirmación de reserva {expediente}',
    body: 'Hola {cliente},\n\nTu reserva del expediente {expediente} ha sido confirmada.\n\n¡Buen viaje!',
  },
  voucher: {
    subject: 'Voucher de servicio - Expediente {expediente}',
    body: 'Estimados,\n\nAdjuntamos el voucher correspondiente al expediente {expediente} del cliente {cliente}.\n\nSaludos cordiales.',
  },
};

const defaults: UserSettings = {
  agency_name: '',
  phone: '',
  address: '',
  cuit: '',
  logo_url: '',
  website: '',
  email: '',
  default_currency: 'USD',
  date_format: 'dd/MM/yyyy',
  theme: 'system',
  notify_birthdays: true,
  notify_document_expiry: true,
  notify_payment_due: true,
  payment_due_days: 3,
  document_expiry_months: 6,
  file_prefix: 'FILE',
  receipt_prefix: 'REC',
  pdf_footer_legal: '',
  email_signature: '',
  email_reply_to: '',
  email_templates: {},
  birthday_whatsapp_template:
    '¡Feliz cumpleaños, {{primer_nombre}}! 🎉 Te deseamos un día increíble lleno de alegría. Saludos desde {{agencia}}.',
  birthday_whatsapp_country_code: '54',
  receipt_header_layout: 'classic',
  receipt_primary_color: '#1E3A5F',
  receipt_accent_color: '#BA7EF2',
  receipt_header_image_url: '',
};

interface Ctx {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<Ctx | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSettings(defaults);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setSettings({
        agency_name: d.agency_name || '',
        phone: d.phone || '',
        address: d.address || '',
        cuit: d.cuit || '',
        logo_url: d.logo_url || '',
        website: d.website || '',
        email: d.email || '',
        default_currency: d.default_currency || 'USD',
        date_format: d.date_format || 'dd/MM/yyyy',
        theme: d.theme || 'system',
        notify_birthdays: d.notify_birthdays ?? true,
        notify_document_expiry: d.notify_document_expiry ?? true,
        notify_payment_due: d.notify_payment_due ?? true,
        payment_due_days: d.payment_due_days ?? 3,
        document_expiry_months: d.document_expiry_months ?? 6,
        file_prefix: d.file_prefix || 'FILE',
        receipt_prefix: d.receipt_prefix || 'REC',
        pdf_footer_legal: d.pdf_footer_legal || '',
        email_signature: d.email_signature || '',
        email_reply_to: d.email_reply_to || '',
        email_templates: (d.email_templates as EmailTemplatesConfig) || {},
        birthday_whatsapp_template: d.birthday_whatsapp_template || defaults.birthday_whatsapp_template,
        birthday_whatsapp_country_code: d.birthday_whatsapp_country_code || defaults.birthday_whatsapp_country_code,
        receipt_header_layout: d.receipt_header_layout || 'classic',
        receipt_primary_color: d.receipt_primary_color || '#1E3A5F',
        receipt_accent_color: d.receipt_accent_color || '#BA7EF2',
        receipt_header_image_url: d.receipt_header_image_url || '',
      });
    } else {
      setSettings(defaults);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    if (!user) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) {
      await supabase.from('profiles').update(patch as any).eq('user_id', user.id);
    } else {
      await supabase.from('profiles').insert([{ ...next, user_id: user.id }] as any);
    }
  }, [user, settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, reload: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export function useSettingsSafe() {
  return useContext(SettingsContext);
}

// Helpers
export function formatFileNumber(n: number, prefix = 'FILE') {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}
export function formatReceiptNumber(n: number, prefix = 'REC') {
  return `${prefix}-${String(n).padStart(4, '0')}`;
}
