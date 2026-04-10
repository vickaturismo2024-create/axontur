import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Trash2, StickyNote } from 'lucide-react';
import { toast } from 'sonner';

interface ClientNote {
  id: string;
  content: string;
  created_at: string;
}

interface ClientNotesProps {
  clientId: string;
}

export function ClientNotes({ clientId }: ClientNotesProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('client_notes')
      .select('id, content, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [clientId]);

  const handleAdd = async () => {
    if (!newNote.trim() || !user) return;
    const { error } = await supabase.from('client_notes').insert({
      client_id: clientId,
      user_id: user.id,
      content: newNote.trim(),
    });
    if (error) { toast.error('Error al guardar nota'); return; }
    setNewNote('');
    fetchNotes();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('client_notes').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar nota'); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <StickyNote className="h-4 w-4" />
        Notas internas ({notes.length})
      </div>

      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Agregar nota..."
          className="min-h-[60px] text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleAdd(); }}
        />
        <Button size="icon" onClick={handleAdd} disabled={!newNote.trim()} className="shrink-0 self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Sin notas aún</p>
      ) : (
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className="group flex items-start gap-2 rounded-md border p-2 text-sm">
                <div className="flex-1">
                  <p className="whitespace-pre-wrap text-foreground">{note.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => handleDelete(note.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
