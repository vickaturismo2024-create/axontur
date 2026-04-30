import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/SettingsContext';
import { DEFAULT_BIRTHDAY_TEMPLATE } from '@/lib/birthdayTemplate';
import { toast } from 'sonner';

export function NotificationsTab() {
  const { settings, updateSettings } = useSettings();

  const save = async (patch: Parameters<typeof updateSettings>[0]) => {
    try {
      await updateSettings(patch);
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border rounded-lg p-4">
        <div>
          <Label className="text-base">🎂 Cumpleaños de clientes</Label>
          <p className="text-xs text-muted-foreground mt-1">Te avisamos cuando un cliente cumple años.</p>
        </div>
        <Switch checked={settings.notify_birthdays} onCheckedChange={(v) => save({ notify_birthdays: v })} />
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">📄 Vencimiento de documentos</Label>
            <p className="text-xs text-muted-foreground mt-1">Alertas para DNI y pasaportes próximos a vencer.</p>
          </div>
          <Switch checked={settings.notify_document_expiry} onCheckedChange={(v) => save({ notify_document_expiry: v })} />
        </div>
        {settings.notify_document_expiry && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Label className="text-sm">Anticipación:</Label>
            <Input
              type="number"
              min={1}
              max={24}
              className="w-20"
              value={settings.document_expiry_months}
              onChange={(e) => save({ document_expiry_months: Math.max(1, parseInt(e.target.value) || 6) })}
            />
            <span className="text-sm text-muted-foreground">meses</span>
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">💰 Pagos a operadores</Label>
            <p className="text-xs text-muted-foreground mt-1">Alertas para pagos a operadores próximos a vencer.</p>
          </div>
          <Switch checked={settings.notify_payment_due} onCheckedChange={(v) => save({ notify_payment_due: v })} />
        </div>
        {settings.notify_payment_due && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Label className="text-sm">Anticipación:</Label>
            <Input
              type="number"
              min={1}
              max={60}
              className="w-20"
              value={settings.payment_due_days}
              onChange={(e) => save({ payment_due_days: Math.max(1, parseInt(e.target.value) || 3) })}
            />
            <span className="text-sm text-muted-foreground">días</span>
          </div>
        )}
      </div>
    </div>
  );
}
