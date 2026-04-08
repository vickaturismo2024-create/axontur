import { useEffect } from 'react';
import { useQuoteVersions } from '@/hooks/useQuoteVersions';
import { Quote } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VersionHistoryProps {
  quoteId: string | undefined;
  onRestore: (data: Quote) => void;
}

export function VersionHistory({ quoteId, onRestore }: VersionHistoryProps) {
  const { versions, isLoading, fetchVersions } = useQuoteVersions(quoteId);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  if (!quoteId) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <History className="h-4 w-4" />
        Historial de versiones
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin versiones anteriores</p>
      ) : (
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <p className="text-xs font-medium">Versión {v.versionNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(v.createdAt), "dd MMM yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRestore(v.data as unknown as Quote)}>
                  <RotateCcw className="mr-1 h-3 w-3" /> Restaurar
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
