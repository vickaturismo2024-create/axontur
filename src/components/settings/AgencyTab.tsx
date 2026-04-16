import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings, UserSettings } from '@/contexts/SettingsContext';

const FIELDS: (keyof UserSettings)[] = ['agency_name', 'cuit', 'phone', 'email', 'address', 'website', 'logo_url'];

export function AgencyTab() {
  const { settings, updateSettings } = useSettings();
  const [local, setLocal] = useState(() => Object.fromEntries(FIELDS.map(f => [f, settings[f] as string])) as Record<string, string>);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal(Object.fromEntries(FIELDS.map(f => [f, settings[f] as string])) as Record<string, string>);
  }, [settings]);

  const u = (k: string, v: string) => setLocal(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings(local as Partial<UserSettings>);
      toast.success('Datos de agencia guardados');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Nombre de la agencia</Label>
        <Input value={local.agency_name} onChange={(e) => u('agency_name', e.target.value)} placeholder="Mi Agencia de Viajes" />
      </div>
      <div>
        <Label>CUIT / Identificación fiscal</Label>
        <Input value={local.cuit} onChange={(e) => u('cuit', e.target.value)} placeholder="20-12345678-9" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Teléfono</Label>
          <Input value={local.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+54 11 1234-5678" />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={local.email} onChange={(e) => u('email', e.target.value)} placeholder="info@miagencia.com" />
        </div>
      </div>
      <div>
        <Label>Dirección</Label>
        <Input value={local.address} onChange={(e) => u('address', e.target.value)} placeholder="Av. Corrientes 1234, CABA" />
      </div>
      <div>
        <Label>Sitio web</Label>
        <Input value={local.website} onChange={(e) => u('website', e.target.value)} placeholder="https://www.miagencia.com" />
      </div>
      <ImageUpload
        label="Logo de la agencia"
        value={local.logo_url}
        onChange={(v) => u('logo_url', v)}
        placeholder="https://ejemplo.com/logo.png"
        previewClassName="h-20"
      />
      <Button onClick={save} disabled={saving} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Guardando...' : 'Guardar perfil'}
      </Button>
    </div>
  );
}
