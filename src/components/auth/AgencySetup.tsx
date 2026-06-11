import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Plus, Sparkles, LogOut, ArrowRight, Compass } from 'lucide-react';

export default function AgencySetup() {
  const { user, signOut } = useAuth();
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const nameTrimmed = agencyName.trim();
    if (!nameTrimmed) {
      toast.error('Por favor, ingresá un nombre para tu agencia');
      return;
    }

    setCreating(true);
    try {
      // 1. Insertar la agencia
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: nameTrimmed,
          owner_id: user.id,
        })
        .select()
        .single();

      if (agencyError) throw agencyError;

      // 2. Insertar al usuario como admin
      const { error: memberError } = await supabase
        .from('agency_members')
        .insert({
          agency_id: agency.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      toast.success('¡Agencia creada con éxito!');
      // Recargar la aplicación para actualizar el estado del AuthContext
      window.location.reload();
    } catch (error: any) {
      console.error('[AgencySetup] Error creating agency:', error);
      toast.error(error.message || 'Error al crear la agencia');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenTrimmed = inviteToken.trim();
    if (!tokenTrimmed) {
      toast.error('Por favor, ingresá el token de invitación');
      return;
    }

    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('accept_agency_invitation', { _token: tokenTrimmed });
      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        toast.success('¡Te uniste a la agencia con éxito!');
        window.location.reload();
      } else {
        const errorMessages: Record<string, string> = {
          not_authenticated: 'Necesitás iniciar sesión primero',
          invalid_token: 'El token de invitación no es válido',
          invitation_accepted: 'Esta invitación ya fue aceptada',
          invitation_cancelled: 'Esta invitación fue cancelada',
          invitation_expired: 'Esta invitación expiró',
          email_mismatch: 'El correo electrónico de tu cuenta no coincide con el de la invitación',
          already_member: 'Ya formás parte de una agencia',
        };
        toast.error(errorMessages[result.error || ''] || 'Error al aceptar la invitación');
      }
    } catch (error: any) {
      console.error('[AgencySetup] Error joining agency:', error);
      toast.error(error.message || 'Error al unirse a la agencia');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(var(--navy-dark))] via-[hsl(var(--navy))] to-[hsl(var(--navy-dark))] p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[hsl(var(--gold))]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[hsl(var(--primary))]/10 blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-2xl space-y-6 relative z-10 animate-fadeInUp">
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] shadow-sm mb-4">
            <Compass className="h-8 w-8 animate-spin-slow text-[hsl(var(--gold))]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">
            Configuración de tu Agencia
          </h1>
          <p className="text-white/70 max-w-md mx-auto text-sm">
            Para comenzar a utilizar AxonTur, necesitas crear una agencia nueva o unirte a una existente a través de una invitación.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opción 1: Crear Agencia de Cero */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-lg text-white shadow-premium flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-2 text-[hsl(var(--gold))] mb-1">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs uppercase tracking-widest font-semibold">Comenzar</span>
              </div>
              <CardTitle className="text-xl text-white font-bold font-sans">Crear una Agencia</CardTitle>
              <CardDescription className="text-white/60 text-xs">
                Registrá tu agencia de viajes para comenzar a presupuestar, gestionar expedientes y caja.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateAgency}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="agency-name" className="text-xs font-medium text-white/80">
                    Nombre de la Agencia
                  </Label>
                  <Input
                    id="agency-name"
                    placeholder="Ej: Mi Agencia de Viajes"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    disabled={creating || joining}
                    className="h-10 text-xs bg-white/5 border-white/10 text-white placeholder-white/30 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[hsl(var(--gold))] focus:ring-1 focus:ring-[hsl(var(--gold))] transition-all"
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  type="submit" 
                  disabled={creating || joining}
                  className="w-full h-10 text-xs font-bold bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--accent))] hover:opacity-90 text-[hsl(var(--navy-dark))] border-none shadow-gold transition-all"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-[hsl(var(--navy-dark))]" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Agencia
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Opción 2: Unirse a Agencia */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-lg text-white shadow-premium flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary-foreground/80 mb-1">
                <Compass className="h-5 w-5 text-sky-400" />
                <span className="text-xs uppercase tracking-widest font-semibold text-sky-400">Invitación</span>
              </div>
              <CardTitle className="text-xl text-white font-bold font-sans">Unirse a una Agencia</CardTitle>
              <CardDescription className="text-white/60 text-xs">
                ¿Te invitaron a unirte a un equipo existente? Ingresá el token de tu invitación.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleJoinAgency}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-token" className="text-xs font-medium text-white/80">
                    Token de Invitación
                  </Label>
                  <Input
                    id="invite-token"
                    placeholder="Pegá el token de invitación aquí"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    disabled={creating || joining}
                    className="h-10 text-xs bg-white/5 border-white/10 text-white placeholder-white/30 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[hsl(var(--gold))] focus:ring-1 focus:ring-[hsl(var(--gold))] transition-all font-mono"
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  type="submit" 
                  disabled={creating || joining}
                  variant="outline"
                  className="w-full h-10 text-xs font-bold border-white/10 bg-white/10 hover:bg-white/20 text-white hover:text-white transition-all"
                >
                  {joining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4 text-sky-400" />
                      Aceptar Token
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Botón de cerrar sesión */}
        <div className="flex justify-center pt-4">
          <Button 
            variant="ghost" 
            onClick={() => signOut()}
            className="text-white/60 hover:text-white hover:bg-white/10 text-xs gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
