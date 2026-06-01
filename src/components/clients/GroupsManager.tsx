import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Users, UserPlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ClientRecord } from './ClientFormDialog';

interface ClientGroup {
  id: string;
  name: string;
  members: ClientRecord[];
}

interface Props {
  clients: ClientRecord[];
}

export function GroupsManager({ clients }: Props) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [addMemberGroupId, setAddMemberGroupId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const fetchGroups = async () => {
    if (!user) return;
    const { data: gData } = await supabase.from('client_groups').select('id, name').order('name');
    if (!gData) return;
    const { data: mData } = await supabase.from('client_group_members').select('group_id, client_id');
    const members = mData || [];
    setGroups(gData.map((g: any) => ({
      id: g.id,
      name: g.name,
      members: members.filter((m: any) => m.group_id === g.id).map((m: any) => clients.find(c => c.id === m.client_id)).filter(Boolean) as ClientRecord[],
    })));
  };

  useEffect(() => { fetchGroups(); }, [user, clients]);

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    const { error } = await supabase.from('client_groups').insert({ name: newGroupName.trim(), user_id: user.id });
    if (error) { toast.error('Error al crear grupo'); return; }
    toast.success('Grupo creado');
    setNewGroupName('');
    fetchGroups();
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    await supabase.from('client_groups').delete().eq('id', deleteGroupId);
    setDeleteGroupId(null);
    toast.success('Grupo eliminado');
    fetchGroups();
  };

  const handleAddMember = async (clientId: string) => {
    if (!addMemberGroupId) return;
    const { error } = await supabase.from('client_group_members').insert({ group_id: addMemberGroupId, client_id: clientId });
    if (error) {
      if (error.code === '23505') toast.info('El cliente ya está en este grupo');
      else toast.error('Error al agregar');
      return;
    }
    toast.success('Cliente agregado al grupo');
    fetchGroups();
  };

  const handleRemoveMember = async (groupId: string, clientId: string) => {
    await supabase.from('client_group_members').delete().eq('group_id', groupId).eq('client_id', clientId);
    toast.success('Cliente quitado del grupo');
    fetchGroups();
  };

  const currentGroup = groups.find(g => g.id === addMemberGroupId);
  const availableClients = currentGroup
    ? clients.filter(c => !currentGroup.members.some(m => m.id === c.id))
    : [];

  return (
    <div className="space-y-6 animate-fadeInUp">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-muted/30 p-4 rounded-2xl border">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-foreground">Crear nuevo grupo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Agrupá clientes frecuentes (ej: Familia García, Viaje Europa 2026)</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Nombre del grupo..."
            className="w-full sm:w-64 rounded-xl h-10 bg-background"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
          />
          <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="rounded-xl h-10 px-4">
            <Plus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Crear</span>
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-muted/10 rounded-2xl border border-dashed">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No tenés grupos configurados</p>
          <p className="text-xs text-muted-foreground mt-1">Creá tu primer grupo arriba para organizar tus clientes vinculados.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map(group => (
            <div key={group.id} className="glass-card-premium rounded-2xl border overflow-hidden flex flex-col hover:border-primary/30 transition-colors">
              <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-foreground truncate" title={group.name}>{group.name}</h3>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-semibold px-2.5 hover:bg-primary/5 hover:text-primary rounded-lg flex items-center gap-1" onClick={() => setAddMemberGroupId(group.id)}>
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>+ Integrante</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 text-destructive rounded-lg" onClick={() => setDeleteGroupId(group.id)} title="Eliminar grupo">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 flex-1 bg-card/30">
                {group.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center italic">Sin integrantes aún</p>
                ) : (
                  <div className="space-y-1.5 mt-1">
                    {group.members.map(m => (
                      <div key={m.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors group/item">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-foreground truncate">{m.name}</p>
                          {(m.dni || m.email) && <p className="text-[10px] text-muted-foreground truncate">{m.dni ? `DNI: ${m.dni}` : m.email}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/item:opacity-100 hover:text-destructive shrink-0" onClick={() => handleRemoveMember(group.id, m.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-4 py-2 bg-muted/10 border-t text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-right">
                {group.members.length} Integrante{group.members.length !== 1 && 's'}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!addMemberGroupId} onOpenChange={(v) => !v && setAddMemberGroupId(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar al grupo "{currentGroup?.name}"</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-1 mt-2 custom-scrollbar pr-2">
            {availableClients.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm bg-muted/20 rounded-xl border border-dashed">
                No hay más clientes disponibles para agregar
              </div>
            ) : (
              availableClients.map(c => (
                <button key={c.id} className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-colors group/btn" onClick={() => handleAddMember(c.id)}>
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.email || c.dni || 'Sin datos adicionales'}</p>
                  </div>
                  <UserPlus className="h-4 w-4 text-primary opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                </button>
              ))
            )}
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-border/50">
            <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={() => setAddMemberGroupId(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este grupo?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará la agrupación, pero <strong>los clientes no se borrarán</strong> del sistema.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleDeleteGroup}>Eliminar Grupo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
