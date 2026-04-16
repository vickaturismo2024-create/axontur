import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';

export function PreferencesTab() {
  const { settings, updateSettings } = useSettings();

  const save = async (patch: Parameters<typeof updateSettings>[0]) => {
    try {
      await updateSettings(patch);
      toast.success('Preferencia guardada');
    } catch {
      toast.error('Error al guardar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Tema</Label>
          <Select value={settings.theme} onValueChange={(v) => save({ theme: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Oscuro</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Se sincroniza entre dispositivos.</p>
        </div>

        <div>
          <Label>Moneda por defecto</Label>
          <Select value={settings.default_currency} onValueChange={(v) => save({ default_currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD — Dólar estadounidense</SelectItem>
              <SelectItem value="ARS">ARS — Peso argentino</SelectItem>
              <SelectItem value="EUR">EUR — Euro</SelectItem>
              <SelectItem value="BRL">BRL — Real brasileño</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Formato de fecha</Label>
          <Select value={settings.date_format} onValueChange={(v) => save({ date_format: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dd/MM/yyyy">DD/MM/AAAA (31/12/2025)</SelectItem>
              <SelectItem value="MM/dd/yyyy">MM/DD/AAAA (12/31/2025)</SelectItem>
              <SelectItem value="yyyy-MM-dd">AAAA-MM-DD (2025-12-31)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Idioma</Label>
          <Select value="es" disabled>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Más idiomas próximamente.</p>
        </div>
      </div>
    </div>
  );
}
