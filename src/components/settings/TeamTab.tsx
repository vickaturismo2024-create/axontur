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
import { Copy, Mail, Trash2, UserPlus, Crown, User as UserIcon, Loader2, Send, RotateCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type AppRole = 'admin' | 'vendedor';

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: AppRole;
  created_at: string;
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
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignRole, setAssignRole] = useState<AppRole>('vendedor');
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    if (!agencyId) return;
    setLoading(true);
    const [membersRes, invitesRes] = await Promise.all([
      supabase.rpc('get_agency_members_with_email', { _agency_id: agencyId }),
      supabase.from('agency_invitations').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false }),
    ]);
    if (membersRes.data) setMembers(membersRes.data as Member[]);
    if (invitesRes.data) setInvitations(invitesRes.data as Invitation[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agencyId]);

  const sendInvitationEmail = async (invitationId: string): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke('send-team-invitation', {
      body: { invitationId },
    });
    if (error || (data && (data as any).error)) {
      const msg = (data as any)?.error || error?.message || 'No se pudo enviar el email';
      toast.error('Email no enviado', { description: msg });
      return false;
    }
    return true;
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !agencyId || !user) return;
    setSubmitting(true);
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
    if (error) {
      toast.error('Error: ' + error.message);
      setSubmitting(false);
      return;
    }

    // Intentar enviar email automáticamente
    const sent = await sendInvitationEmail(data.id);

    setSubmitting(false);
    setInviteEmail('');
    setInviteRole('vendedor');
    setInviteOpen(false);
    await load();

    if (sent) {
      toast.success('Invitación enviada por email a ' + data.email);
    } else if (data?.token) {
      const link = `${window.location.origin}/accept-invitation?token=${data.token}`;
      navigator.clipboard.writeText(link).catch(() => {});
      toast.success('Invitación creada — link copiado al portapapeles', { duration: 6000 });
    }
  };

  const handleAssignExisting = async () => {
    const email = assignEmail.trim().toLowerCase();
    if (!email) return;
    setAssigning(true);
    const { data, error } = await supabase.rpc('assign_user_to_agency', { _email: email, _role: assignRole });
    setAssigning(false);
    if (error) {
      toast.error('Error: ' + error.message);
      return;
    }
    const res = data as { success: boolean; error?: string } | null;
    if (!res?.success) {
      const errMap: Record<string, string> = {
        user_not_found: 'No encontramos un usuario registrado con ese email. Pedile que se registre primero o usá Invitar miembro.',
        already_member: 'Ese usuario ya pertenece a una agencia.',
        not_authorized: 'No tenés permisos para hacer esto.',
        not_authenticated: 'Tu sesión expiró, recargá la página.',
        invalid_email: 'El email no es válido.',
      };
      toast.error('No se pudo agregar', { description: errMap[res?.error || ''] || res?.error || 'Error desconocido' });
      return;
    }
    toast.success(`Usuario ${email} agregado a la agencia`);
    setAssignEmail('');
    setAssignRole('vendedor');
    setAssignOpen(false);
    await load();
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado');
  };

  const resendInvite = async (id: string) => {
    setResendingId(id);
    const ok = await sendInvitationEmail(id);
    setResendingId(null);
    if (ok) toast.success('Email reenviado');
  };

  const reactivateInvite = async (id: string) => {
    setReactivatingId(id);
    const { data, error } = await supabase.rpc('reactivate_invitation', { _invitation_id: id });
    if (error || !(data as any)?.success) {
      toast.error('No se pudo reactivar', { description: (data as any)?.error || error?.message });
      setReactivatingId(null);
      return;
    }
    await load();
    // Reenviar email automáticamente tras reactivar
    await sendInvitationEmail(id);
    setReactivatingId(null);
    toast.success('Invitación reactivada y email enviado');
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
  const vendedorCount = members.filter(m => m.role === 'vendedor').length;
  const pendingInvites = invitations.filter(i => i.status === 'pending');
  const otherInvites = invitations.filter(i => i.status !== 'pending');
  const isExpired = (iso: string) => new Date(iso).getTime() < Date.now();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Miembros del equipo</h3>
          <p className="text-sm text-muted-foreground">Administrá quién tiene acceso a tu agencia y con qué rol.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 md:flex-none text-xs h-9">
                <UserIcon className="h-4 w-4 mr-2 shrink-0" /> Agregar usuario existente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar usuario existente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Email del usuario</Label>
                  <Input type="email" value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} placeholder="usuario@ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={assignRole} onValueChange={(v) => setAssignRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor (carga de operación diaria)</SelectItem>
                      <SelectItem value="admin">Administrador (acceso completo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Asigna directamente a un usuario que ya tiene cuenta en la app. El usuario tiene que estar registrado y no pertenecer a otra agencia.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancelar</Button>
                <Button onClick={handleAssignExisting} disabled={assigning || !assignEmail.trim()}>
                  {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Agregar a la agencia
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 md:flex-none text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/95">
                <UserPlus className="h-4 w-4 mr-2 shrink-0" /> Invitar miembro
              </Button>
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
                  Le mandaremos un email con el link de invitación. Si el envío falla, copiamos el link al portapapeles para que lo compartas manualmente. La invitación expira en 7 días.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={submitting || !inviteEmail.trim()}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Enviar invitación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Miembros actuales */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">Miembros activos ({members.length})</h4>
          {!loading && members.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {adminCount} {adminCount === 1 ? 'administrador' : 'administradores'} · {vendedorCount} {vendedorCount === 1 ? 'vendedor' : 'vendedores'}
            </p>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const isMe = m.user_id === user?.id;
              const isLastAdmin = m.role === 'admin' && adminCount === 1;
              return (
                <Card key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {m.role === 'admin' ? <Crown className="h-5 w-5 text-amber-500 shrink-0" /> : <UserIcon className="h-5 w-5 text-muted-foreground shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm sm:text-base">
                        {m.email || `${m.user_id.substring(0, 8)}…`}
                        {isMe && <Badge variant="secondary" className="ml-2 text-[9px] h-4.5 px-1.5 align-middle">Vos</Badge>}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Miembro desde {format(parseISO(m.created_at), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as AppRole)} disabled={isMe || isLastAdmin}>
                      <SelectTrigger className="w-32 h-8.5 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="vendedor">Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                    {!isMe && !isLastAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8.5 w-8.5 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
            {pendingInvites.map((inv) => {
              const expired = isExpired(inv.expires_at);
              return (
                <Card key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm sm:text-base">{inv.email}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5">{inv.role === 'admin' ? 'Administrador' : 'Vendedor'}</Badge>
                        {expired ? (
                          <Badge variant="destructive" className="text-[9px] py-0 px-1.5">Expirada</Badge>
                        ) : (
                          <span>Expira el {format(parseISO(inv.expires_at), 'dd MMM yyyy', { locale: es })}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    {expired ? (
                      <Button variant="outline" size="sm" className="h-8 text-xs flex-1 sm:flex-none" onClick={() => reactivateInvite(inv.id)} disabled={reactivatingId === inv.id}>
                        {reactivatingId === inv.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RotateCw className="h-3 w-3 mr-1" />}
                        Reactivar
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="h-8 text-xs flex-1 sm:flex-none" onClick={() => resendInvite(inv.id)} disabled={resendingId === inv.id}>
                          {resendingId === inv.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Reenviar email
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyLink(inv.token)} title="Copiar link">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0 px-2" onClick={() => cancelInvite(inv.id)}>Cancelar</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Historial */}
      {otherInvites.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Historial</h4>
          <div className="space-y-2">
            {otherInvites.slice(0, 10).map((inv) => (
              <Card key={inv.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-70">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm truncate font-medium">{inv.email}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <Badge variant="secondary" className="mr-2 text-[9px] py-0 px-1">
                        {inv.status === 'accepted' ? 'Aceptada' : inv.status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                      </Badge>
                      {format(parseISO(inv.created_at), 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  {inv.status !== 'accepted' && (
                    <Button variant="outline" size="sm" className="h-8 text-xs flex-1 sm:flex-none" onClick={() => reactivateInvite(inv.id)} disabled={reactivatingId === inv.id}>
                      {reactivatingId === inv.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RotateCw className="h-3 w-3 mr-1" />}
                      Reactivar
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => deleteInvite(inv.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
