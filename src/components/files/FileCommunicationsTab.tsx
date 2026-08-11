import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, RefreshCw, AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { EmailComposer } from './communications/EmailComposer';

interface Communication {
  id: string;
  direction: 'outbound' | 'inbound';
  from_address: string;
  to_addresses: any;
  subject: string;
  html_body: string | null;
  text_body: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Props {
  fileId: string;
  fileNumber?: string;
  clientEmail?: string;
}

export function FileCommunicationsTab({ fileId, fileNumber = '', clientEmail = '' }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);

  const { data: comms = [], isLoading } = useQuery<Communication[]>({
    queryKey: ['file-communications', fileId],
    queryFn: async () => {
      // 1. Fetch from file_communications
      const { data: mainData } = await supabase
        .from('file_communications' as any)
        .select('*')
        .eq('file_id', fileId);

      // 2. Fetch from legacy email_logs
      const { data: legacyData } = await supabase
        .from('email_logs')
        .select('*')
        .eq('file_id', fileId);

      const legacyMapped: Communication[] = (legacyData || []).map((l: any) => ({
        id: l.id,
        direction: 'outbound',
        from_address: 'agencia',
        to_addresses: [l.to_email],
        subject: l.subject,
        html_body: null,
        text_body: null,
        status: l.status,
        error_message: l.error_message,
        created_at: l.sent_at,
      }));

      const mainMapped = (mainData || []) as Communication[];

      // Merge and sort descending
      const merged = [...mainMapped, ...legacyMapped];
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return merged;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <Mail className="h-4 w-4" /> Historial de Comunicaciones
        </h3>
        <Button size="sm" onClick={() => setComposerOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Nuevo correo
        </Button>
      </div>

      {comms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Mail className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm font-medium">No hay comunicaciones registradas para este expediente.</p>
            <p className="text-xs text-muted-foreground mt-1">Haz clic en "Nuevo correo" para enviar tu primer mensaje.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {comms.map(item => {
            const isOut = item.direction === 'outbound';
            const ok = item.status === 'sent' || item.status === 'delivered' || item.status === 'received';
            const toStr = Array.isArray(item.to_addresses) ? item.to_addresses.join(', ') : item.to_addresses;

            return (
              <Card key={item.id} className={`transition-colors ${selectedComm?.id === item.id ? 'border-primary' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isOut ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      }`}>
                        {isOut ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm truncate">{item.subject || '(sin asunto)'}</span>
                          <Badge variant={isOut ? 'outline' : 'secondary'} className="text-[10px]">
                            {isOut ? 'Enviado' : 'Recibido'}
                          </Badge>
                          <Badge variant={ok ? 'default' : 'destructive'} className="text-[10px]">
                            {item.status.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{isOut ? `Para: ${toStr}` : `De: ${item.from_address}`}</span>
                          <span>{new Date(item.created_at).toLocaleString('es-AR')}</span>
                        </div>

                        {item.error_message && (
                          <p className="mt-1 text-xs text-destructive">{item.error_message}</p>
                        )}

                        {/* HTML Preview expansion */}
                        {item.html_body && (
                          <div className="mt-2 text-xs bg-muted/30 p-2.5 rounded border border-border/50 max-h-32 overflow-y-auto">
                            <div dangerouslySetInnerHTML={{ __html: item.html_body }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Composer Modal */}
      <EmailComposer
        fileId={fileId}
        fileNumber={fileNumber}
        clientEmail={clientEmail}
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSent={() => qc.invalidateQueries({ queryKey: ['file-communications', fileId] })}
      />
    </div>
  );
}

