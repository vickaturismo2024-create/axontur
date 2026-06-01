import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationPreview {
  found: boolean;
  email?: string;
  role?: string;
  status?: string;
  expires_at?: string;
  agency_name?: string;
}

export default function AcceptInvitation() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) { setLoading(false); return; }
      const { data, error } = await supabase.rpc('get_invitation_by_token', { _token: token });
      if (error) {
        console.error(error);
        setPreview({ found: false });
      } else {
        setPreview(data as unknown as InvitationPreview);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    const { data, error } = await supabase.rpc('accept_agency_invitation', { _token: token });
    setAccepting(false);
    if (error) {
      toast.error('Error: ' + error.message);
      return;
    }
    const result = data as { success: boolean; error?: string };
    if (result.success) {
      toast.success('¡Bienvenido al equipo!');
      // Recargar para que AuthContext recargue la membresía
      window.location.href = '/';
    } else {
      const errorMessages: Record<string, string> = {
        not_authenticated: 'Necesitás iniciar sesión primero',
        invalid_token: 'El link de invitación no es válido',
        invitation_accepted: 'Esta invitación ya fue aceptada',
        invitation_cancelled: 'Esta invitación fue cancelada',
        invitation_expired: 'Esta invitación expiró',
        email_mismatch: `Esta invitación es para ${preview?.email}, pero estás logueado con otro email`,
        already_member: 'Ya formás parte de una agencia. Salí de la actual antes de aceptar.',
      };
      toast.error(errorMessages[result.error || ''] || 'Error al aceptar invitación');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token || !preview?.found) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="font-serif font-bold text-primary">Invitación no válida</CardTitle>
            <CardDescription>El link de invitación no existe o fue eliminado.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild><Link to="/">Volver al inicio</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = preview.status === 'expired' || (preview.expires_at && new Date(preview.expires_at) < new Date());
  const isAccepted = preview.status === 'accepted';
  const isCancelled = preview.status === 'cancelled';
  const isPending = preview.status === 'pending' && !isExpired;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle className="font-serif font-bold text-primary">Invitación a {preview.agency_name}</CardTitle>
          <CardDescription>
            Te invitaron a unirte como{' '}
            <Badge variant="outline" className="ml-1">
              {preview.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="text-muted-foreground">Email invitado:</p>
            <p className="font-medium">{preview.email}</p>
          </div>

          {isAccepted && (
            <div className="text-center py-2">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm">Esta invitación ya fue aceptada.</p>
            </div>
          )}
          {isCancelled && (
            <div className="text-center py-2">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm">Esta invitación fue cancelada.</p>
            </div>
          )}
          {isExpired && !isAccepted && !isCancelled && (
            <div className="text-center py-2">
              <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm">Esta invitación expiró. Pedile al admin que genere una nueva.</p>
            </div>
          )}

          {isPending && !user && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Iniciá sesión o registrate con <strong>{preview.email}</strong> para aceptar.
              </p>
              <Button className="w-full" asChild>
                <Link to={`/auth?redirect=/accept-invitation?token=${token}`}>Iniciar sesión / Registrarme</Link>
              </Button>
            </div>
          )}

          {isPending && user && (
            <Button className="w-full" onClick={handleAccept} disabled={accepting}>
              {accepting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aceptar invitación
            </Button>
          )}

          <Button variant="ghost" className="w-full" asChild>
            <Link to="/">Cancelar</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
