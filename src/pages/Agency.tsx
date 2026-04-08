import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Save, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AgencyProfile {
  agency_name: string;
  phone: string;
  address: string;
  cuit: string;
  logo_url: string;
  website: string;
  email: string;
}

const defaultProfile: AgencyProfile = {
  agency_name: '',
  phone: '',
  address: '',
  cuit: '',
  logo_url: '',
  website: '',
  email: '',
};

const Agency = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AgencyProfile>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setProfile({
          agency_name: d.agency_name || '',
          phone: d.phone || '',
          address: d.address || '',
          cuit: d.cuit || '',
          logo_url: d.logo_url || '',
          website: d.website || '',
          email: d.email || '',
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('profiles' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('profiles' as any)
          .update({ ...profile } as any)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profiles' as any)
          .insert([{ ...profile, user_id: user.id }] as any);
        if (error) throw error;
      }
      toast.success('Perfil de agencia guardado');
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const u = (field: keyof AgencyProfile, value: string) =>
    setProfile((p) => ({ ...p, [field]: value }));

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto flex items-center justify-center px-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8" /> Mi Agencia
          </h1>
          <p className="mt-1 text-muted-foreground">
            Configurá los datos de tu agencia. Se usarán automáticamente en tus presupuestos y plantillas.
          </p>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Datos de la agencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nombre de la agencia</Label>
                <Input value={profile.agency_name} onChange={(e) => u('agency_name', e.target.value)} placeholder="Mi Agencia de Viajes" />
              </div>
              <div>
                <Label>CUIT / Identificación fiscal</Label>
                <Input value={profile.cuit} onChange={(e) => u('cuit', e.target.value)} placeholder="20-12345678-9" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Teléfono</Label>
                  <Input value={profile.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+54 11 1234-5678" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={profile.email} onChange={(e) => u('email', e.target.value)} placeholder="info@miagencia.com" />
                </div>
              </div>
              <div>
                <Label>Dirección</Label>
                <Input value={profile.address} onChange={(e) => u('address', e.target.value)} placeholder="Av. Corrientes 1234, CABA" />
              </div>
              <div>
                <Label>Sitio web</Label>
                <Input value={profile.website} onChange={(e) => u('website', e.target.value)} placeholder="https://www.miagencia.com" />
              </div>
              <ImageUpload
                label="Logo de la agencia"
                value={profile.logo_url}
                onChange={(v) => u('logo_url', v)}
                placeholder="https://ejemplo.com/logo.png"
                previewClassName="h-20"
              />
              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Guardando...' : 'Guardar perfil'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Agency;
