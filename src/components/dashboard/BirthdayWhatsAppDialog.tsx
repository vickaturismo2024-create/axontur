import { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';
import { MessageCircle, AlertTriangle } from 'lucide-react';
import {
  renderTemplate,
  normalizePhoneForWhatsApp,
  buildWhatsAppUrl,
  BirthdayContext,
} from '@/lib/birthdayTemplate';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: {
    id: string;
    name: string;
    phone: string;
    age: number | null;
  } | null;
}

const VARIABLES: { key: string; label: string }[] = [
  { key: '{{primer_nombre}}', label: 'Primer nombre' },
  { key: '{{nombre}}', label: 'Nombre completo' },
  { key: '{{edad}}', label: 'Edad' },
  { key: '{{agencia}}', label: 'Agencia' },
];

export function BirthdayWhatsAppDialog({ open, onOpenChange, client }: Props) {
  const { settings, updateSettings } = useSettings();
  const [message, setMessage] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMessage(settings.birthday_whatsapp_template || '');
      setSaveAsDefault(false);
    }
  }, [open, settings.birthday_whatsapp_template]);

  const ctx: BirthdayContext = useMemo(() => {
    const fullName = client?.name || '';
    const firstName = fullName.split(' ')[0] || fullName;
    return {
      nombre: fullName,
      primer_nombre: firstName,
      edad: client?.age ?? '',
      agencia: settings.agency_name || 'nuestra agencia',
    };
  }, [client, settings.agency_name]);

  const preview = useMemo(() => renderTemplate(message, ctx), [message, ctx]);

  const phoneDigits = useMemo(
    () => normalizePhoneForWhatsApp(client?.phone || '', settings.birthday_whatsapp_country_code || '54'),
    [client?.phone, settings.birthday_whatsapp_country_code]
  );

  const phoneWarning = useMemo(() => {
    if (!client?.phone) return null;
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      return 'El teléfono parece incompleto. Verificá el código de país.';
    }
    return null;
  }, [client?.phone, phoneDigits]);

  const insertVariable = (varKey: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setMessage(m => m + varKey);
      return;
    }
    const start = ta.selectionStart ?? message.length;
    const end = ta.selectionEnd ?? message.length;
    const next = message.slice(0, start) + varKey + message.slice(end);
    setMessage(next);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + varKey.length;
    }, 0);
  };

  const handleSend = async () => {
    if (!client) return;
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Escribí un mensaje');
      return;
    }
    if (trimmed.length > 1000) {
      toast.error('El mensaje no puede superar 1000 caracteres');
      return;
    }
    if (!phoneDigits) {
      toast.error('El cliente no tiene un teléfono válido');
      return;
    }

    if (saveAsDefault && trimmed !== settings.birthday_whatsapp_template) {
      try {
        await updateSettings({ birthday_whatsapp_template: trimmed });
        toast.success('Plantilla guardada');
      } catch {
        toast.error('No se pudo guardar la plantilla');
      }
    }

    const url = buildWhatsAppUrl(phoneDigits, preview);
    window.open(url, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Saludar a {client?.name}
          </DialogTitle>
          <DialogDescription>
            Personalizá el mensaje y abrilo en WhatsApp para enviarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Mensaje</Label>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Escribí tu mensaje..."
            />
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map(v => (
                <Badge
                  key={v.key}
                  variant="secondary"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => insertVariable(v.key)}
                  title={`Insertar ${v.label}`}
                >
                  {v.key}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{message.length}/1000</p>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Vista previa</p>
            <p className="text-sm whitespace-pre-wrap">{preview || <span className="text-muted-foreground">—</span>}</p>
          </div>

          {phoneWarning && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
              <span>{phoneWarning} Se enviará a: <code className="font-mono">+{phoneDigits}</code></span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="save-default"
              checked={saveAsDefault}
              onCheckedChange={(v) => setSaveAsDefault(!!v)}
            />
            <Label htmlFor="save-default" className="text-sm cursor-pointer">
              Guardar este mensaje como plantilla por defecto
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || !phoneDigits}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Abrir en WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
