import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Quote } from '@/types/quote';
import { toast } from 'sonner';
import { createFileFromQuote } from '@/lib/fileFromQuote';

interface Props {
  quote: Quote;
}

export function CreateFileFromQuote({ quote }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);

    const result = await createFileFromQuote(quote, user.id);
    if (result) {
      toast.success(`Expediente FILE-${String(result.fileNumber).padStart(3, '0')} creado`);
      navigate(`/files/${result.fileId}`);
    } else {
      toast.error('Error al crear expediente');
    }
    setCreating(false);
  };

  return (
    <Button onClick={handleCreate} disabled={creating} variant="outline" size="sm">
      <FolderOpen className="mr-2 h-4 w-4" />
      {creating ? 'Creando...' : 'Crear Expediente'}
    </Button>
  );
}
