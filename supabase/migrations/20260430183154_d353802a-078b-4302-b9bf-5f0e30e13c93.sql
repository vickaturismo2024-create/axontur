ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday_whatsapp_template text NOT NULL DEFAULT '¡Feliz cumpleaños, {{primer_nombre}}! 🎉 Te deseamos un día increíble lleno de alegría. Saludos desde {{agencia}}.',
  ADD COLUMN IF NOT EXISTS birthday_whatsapp_country_code text NOT NULL DEFAULT '54';