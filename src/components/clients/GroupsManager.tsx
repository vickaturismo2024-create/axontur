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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Nombre del grupo (ej: Familia García)"
          className="max-w-xs"
          onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
        />
        <Button size="sm" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
          <Plus className="mr-1 h-4 w-4" /> Crear grupo
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No tenés grupos. Crea uno para agrupar clientes.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map(group => (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" /> {group.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddMemberGroupId(group.id)}>
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteGroupId(group.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {group.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin miembros</p>
                ) : (
                  <div className="space-y-1">
                    {group.members.map(m => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <span>{m.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveMember(group.id, m.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{group.members.length} miembro(s)</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!addMemberGroupId} onOpenChange={(v) => !v && setAddMemberGroupId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar miembro a "{currentGroup?.name}"</DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {availableClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay clientes disponibles para agregar</p>
            ) : (
              availableClients.map(c => (
                <button key={c.id} className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => handleAddMember(c.id)}>
                  <p className="font-medium">{c.name}</p>
                  {c.dni && <p className="text-xs text-muted-foreground">DNI: {c.dni}</p>}
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberGroupId(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará el grupo pero no los clientes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
