import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Copy, Mail, Trash2, UserPlus, Crown, User as UserIcon, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type AppRole = 'admin' | 'vendedor';

interface Member {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  email?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export function TeamTab() {
  const { user, agencyId } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('vendedor');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!agencyId) return;
    setLoading(true);
    const [membersRes, invitesRes] = await Promise.all([
      supabase.from('agency_members').select('id, user_id, role, created_at').eq('agency_id', agencyId),
      supabase.from('agency_invitations').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false }),
    ]);
    if (membersRes.data) setMembers(membersRes.data as Member[]);
    if (invitesRes.data) setInvitations(invitesRes.data as Invitation[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agencyId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !agencyId || !user) return;
    setSubmitting(true);
    // Verificar si ya hay invitación pendiente para ese email
    const existing = invitations.find(i => i.email.toLowerCase() === inviteEmail.toLowerCase() && i.status === 'pending');
    if (existing) {
      toast.error('Ya hay una invitación pendiente para ese email');
      setSubmitting(false);
      return;
    }
    const { data, error } = await supabase.from('agency_invitations').insert({
      agency_id: agencyId,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      invited_by: user.id,
    }).select().single();
    setSubmitting(false);
    if (error) {
      toast.error('Error: ' + error.message);
      return;
    }
    toast.success('Invitación creada. Copiá el link y enviáselo al usuario.');
    setInviteEmail('');
    setInviteRole('vendedor');
    setInviteOpen(false);
    await load();
    if (data?.token) {
      const link = `${window.location.origin}/accept-invitation?token=${data.token}`;
      navigator.clipboard.writeText(link).catch(() => {});
      toast.success('Link copiado al portapapeles', { description: link, duration: 6000 });
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado');
  };

  const cancelInvite = async (id: string) => {
    const { error } = await supabase.from('agency_invitations').update({ status: 'cancelled' }).eq('id', id);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Invitación cancelada');
    load();
  };

  const deleteInvite = async (id: string) => {
    const { error } = await supabase.from('agency_invitations').delete().eq('id', id);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Invitación eliminada');
    load();
  };

  const changeRole = async (memberId: string, newRole: AppRole) => {
    const { error } = await supabase.from('agency_members').update({ role: newRole }).eq('id', memberId);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Rol actualizado');
    load();
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from('agency_members').delete().eq('id', memberId);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Miembro eliminado');
    load();
  };

  const adminCount = members.filter(m => m.role === 'admin').length;
  const pendingInvites = invitations.filter(i => i.status === 'pending');
  const otherInvites = invitations.filter(i => i.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Miembros del equipo</h3>
          <p className="text-sm text-muted-foreground">Administrá quién tiene acceso a tu agencia y con qué rol.</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" /> Invitar miembro</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar nuevo miembro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="vendedor@ejemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor (carga de operación diaria)</SelectItem>
                    <SelectItem value="admin">Administrador (acceso completo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Se generará un link único de invitación que copiarás y enviarás manualmente al usuario. La invitación expira en 7 días.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button onClick={handleInvite} disabled={submitting || !inviteEmail.trim()}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Crear invitación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Miembros actuales */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Miembros activos ({members.length})</h4>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const isMe = m.user_id === user?.id;
              const isLastAdmin = m.role === 'admin' && adminCount === 1;
              return (
                <Card key={m.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {m.role === 'admin' ? <Crown className="h-5 w-5 text-amber-500 shrink-0" /> : <UserIcon className="h-5 w-5 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{isMe ? 'Vos' : m.user_id.substring(0, 8) + '...'}</p>
                      <p className="text-xs text-muted-foreground">Miembro desde {format(parseISO(m.created_at), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as AppRole)} disabled={isMe || isLastAdmin}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="vendedor">Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                    {!isMe && !isLastAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Quitar miembro?</AlertDialogTitle>
                            <AlertDialogDescription>Perderá acceso a la agencia. Esta acción no elimina sus datos cargados.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeMember(m.id)} className="bg-destructive">Quitar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Invitaciones pendientes */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Invitaciones pendientes ({pendingInvites.length})</h4>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <Card key={inv.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-2">{inv.role === 'admin' ? 'Administrador' : 'Vendedor'}</Badge>
                      Expira el {format(parseISO(inv.expires_at), 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => copyLink(inv.token)}>
                    <Copy className="h-4 w-4 mr-1" /> Copiar link
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => cancelInvite(inv.id)}>Cancelar</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {otherInvites.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Historial</h4>
          <div className="space-y-2">
            {otherInvites.slice(0, 10).map((inv) => (
              <Card key={inv.id} className="p-3 flex items-center justify-between gap-4 opacity-70">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="mr-2">
                        {inv.status === 'accepted' ? 'Aceptada' : inv.status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                      </Badge>
                      {format(parseISO(inv.created_at), 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteInvite(inv.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
