import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOut, KeyRound } from 'lucide-react';

export function AccountTab() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [saving, setSaving] = useState(false);
  const [globalOut, setGlobalOut] = useState(false);

  const updatePassword = async () => {
    if (pwd.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return; }
    if (pwd !== pwd2) { toast.error('Las contraseñas no coinciden'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Contraseña actualizada');
    setPwd(''); setPwd2('');
  };

  const signOutAll = async () => {
    setGlobalOut(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast.success('Sesión cerrada en todos los dispositivos');
      navigate('/auth');
    } catch {
      toast.error('No se pudo cerrar la sesión global');
    } finally {
      setGlobalOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Email</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Input value={user?.email || ''} readOnly disabled />
            </div>
          </TooltipTrigger>
          <TooltipContent>Cambio de email: próximamente</TooltipContent>
        </Tooltip>
      </div>

      <div className="border-t pt-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4" /> Cambiar contraseña</h3>
          <p className="text-xs text-muted-foreground mt-1">Mínimo 8 caracteres.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Nueva contraseña</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <Label>Confirmar contraseña</Label>
            <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <Button onClick={updatePassword} disabled={saving || !pwd || !pwd2}>
          {saving ? 'Guardando...' : 'Actualizar contraseña'}
        </Button>
      </div>

      <div className="border-t pt-6 space-y-3">
        <h3 className="text-sm font-semibold">Sesiones</h3>
        <p className="text-xs text-muted-foreground">Cierra tu sesión en todos los dispositivos donde hayas iniciado sesión.</p>
        <Button variant="destructive" onClick={signOutAll} disabled={globalOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {globalOut ? 'Cerrando...' : 'Cerrar sesión en todos los dispositivos'}
        </Button>
      </div>
    </div>
  );
}
