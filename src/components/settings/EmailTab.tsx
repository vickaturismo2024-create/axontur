import { useState, useMemo } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { DEFAULT_EMAIL_TEMPLATES, type EmailTemplatesConfig } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { replaceVariables, plainToHtml, renderSignatureHtml, type EmailTemplateKey } from '@/lib/emailVariables';

const TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  receipt: 'Recibo',
  confirmation: 'Confirmación de reserva',
  voucher: 'Voucher a proveedor',
};

const PREVIEW_VARS = {
  cliente: 'Juan Pérez',
  expediente: 'FILE-001',
  numero_recibo: 'REC-0001',
  monto: '1.500,00',
  moneda: 'USD',
  agencia: 'Mi Agencia',
};

const VARIABLES_HELP = '{cliente} · {expediente} · {numero_recibo} · {monto} · {moneda} · {agencia}';

export function EmailTab() {
  const { settings, updateSettings } = useSettings();
  const [signature, setSignature] = useState(settings.email_signature);
  const [replyTo, setReplyTo] = useState(settings.email_reply_to);
  const [templates, setTemplates] = useState<EmailTemplatesConfig>(settings.email_templates || {});
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplateKey>('receipt');
  const [saving, setSaving] = useState(false);

  const current = useMemo(
    () => templates[activeTemplate] || DEFAULT_EMAIL_TEMPLATES[activeTemplate],
    [templates, activeTemplate],
  );

  const updateCurrent = (patch: Partial<{ subject: string; body: string }>) => {
    setTemplates(prev => ({
      ...prev,
      [activeTemplate]: { ...current, ...patch },
    }));
  };

  const restoreDefault = () => {
    setTemplates(prev => {
      const next = { ...prev };
      delete next[activeTemplate];
      return next;
    });
    toast.success('Plantilla restaurada al valor por defecto');
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        email_signature: signature,
        email_reply_to: replyTo,
        email_templates: templates,
      });
      toast.success('Configuración de email guardada');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const previewSubject = replaceVariables(current.subject, PREVIEW_VARS);
  const previewBody = replaceVariables(current.body, PREVIEW_VARS);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <Label htmlFor="reply_to">Email de respuesta (opcional)</Label>
          <Input
            id="reply_to"
            type="email"
            placeholder="respuestas@miagencia.com"
            value={replyTo}
            onChange={e => setReplyTo(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Cuando un cliente responda un email, la respuesta llegará a esta dirección.
          </p>
        </div>

        <div>
          <Label htmlFor="signature">Firma de email</Label>
          <Textarea
            id="signature"
            rows={6}
            placeholder={'Saludos cordiales,\nJuan Pérez\nMi Agencia\n+54 11 1234 5678'}
            value={signature}
            onChange={e => setSignature(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Se anexa al final de cada email enviado. Soporta saltos de línea.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-medium">Plantillas personalizables</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Variables disponibles: <code className="text-xs">{VARIABLES_HELP}</code>
          </p>
        </div>

        <Tabs value={activeTemplate} onValueChange={v => setActiveTemplate(v as EmailTemplateKey)}>
          <TabsList className="!grid !grid-cols-1 sm:!grid-cols-3 w-full !h-auto gap-1 bg-muted p-1">
            {(Object.keys(TEMPLATE_LABELS) as EmailTemplateKey[]).map(key => (
              <TabsTrigger key={key} value={key} className="py-2 text-xs sm:text-sm whitespace-normal text-center h-auto min-h-[36px]">{TEMPLATE_LABELS[key]}</TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(TEMPLATE_LABELS) as EmailTemplateKey[]).map(key => (
            <TabsContent key={key} value={key} className="space-y-3 mt-4">
              <div>
                <Label>Asunto</Label>
                <Input
                  value={current.subject}
                  onChange={e => updateCurrent({ subject: e.target.value })}
                />
              </div>
              <div>
                <Label>Cuerpo</Label>
                <Textarea
                  rows={8}
                  value={current.body}
                  onChange={e => updateCurrent({ body: e.target.value })}
                />
              </div>
              <Button variant="outline" size="sm" onClick={restoreDefault}>
                <RotateCcw className="mr-2 h-3 w-3" /> Restaurar por defecto
              </Button>

              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Eye className="h-4 w-4" /> Vista previa con datos de ejemplo
                  </div>
                  <div className="text-xs text-muted-foreground">Asunto:</div>
                  <div className="text-sm font-medium">{previewSubject}</div>
                  <div className="text-xs text-muted-foreground mt-3">Cuerpo:</div>
                  <div
                    className="text-sm bg-background border rounded-md p-3"
                    dangerouslySetInnerHTML={{
                      __html: plainToHtml(previewBody) + renderSignatureHtml(signature),
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}
