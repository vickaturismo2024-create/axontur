import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tag, Plus, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface QuoteTag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectProps {
  quoteId: string;
  assignedTags: QuoteTag[];
  allTags: QuoteTag[];
  onTagsChanged: () => void;
}

const TAG_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b',
];

export function TagSelect({ quoteId, assignedTags, allTags, onTagsChanged }: TagSelectProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [showCreate, setShowCreate] = useState(false);

  const isAssigned = (tagId: string) => assignedTags.some(t => t.id === tagId);

  const toggleTag = async (tagId: string) => {
    if (isAssigned(tagId)) {
      await supabase.from('quote_tag_assignments' as any).delete().eq('quote_id', quoteId).eq('tag_id', tagId);
    } else {
      await supabase.from('quote_tag_assignments' as any).insert({ quote_id: quoteId, tag_id: tagId } as any);
    }
    onTagsChanged();
  };

  const createTag = async () => {
    if (!user || !newTagName.trim()) return;
    const { error } = await supabase.from('quote_tags' as any).insert({
      name: newTagName.trim(),
      color: newTagColor,
      user_id: user.id,
    } as any);
    if (error) { toast.error('Error al crear etiqueta'); return; }
    setNewTagName('');
    setShowCreate(false);
    toast.success('Etiqueta creada');
    onTagsChanged();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-9 px-3 gap-1.5">
          <Tag className="h-4 w-4" />
          <span>Etiquetas</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-medium text-muted-foreground px-2 mb-1">Etiquetas</p>
        <div className="space-y-0.5 max-h-40 overflow-y-auto">
          {allTags.map(tag => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className="flex items-center gap-2 w-full rounded px-2 py-1 text-sm hover:bg-accent transition-colors"
            >
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="flex-1 text-left truncate">{tag.name}</span>
              {isAssigned(tag.id) && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
        {showCreate ? (
          <div className="mt-2 border-t pt-2 space-y-2">
            <Input
              placeholder="Nombre..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="h-7 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && createTag()}
            />
            <div className="flex gap-1 flex-wrap">
              {TAG_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  className={`h-5 w-5 rounded-full border-2 transition-all ${newTagColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={createTag} disabled={!newTagName.trim()}>Crear</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCreate(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 w-full rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent transition-colors mt-1 border-t pt-1"
          >
            <Plus className="h-3.5 w-3.5" />Nueva etiqueta
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
