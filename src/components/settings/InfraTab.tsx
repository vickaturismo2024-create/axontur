import { useEmailInfraStatus, type DomainStatus } from '@/hooks/useEmailInfraStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ShieldCheck, ShieldAlert, ShieldQuestion, Globe, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DOMAIN_LABEL: Record<DomainStatus, { text: string; tone: 'success' | 'warning' | 'destructive' | 'muted' }> = {
  active: { text: 'Verificado y activo', tone: 'success' },
  awaiting_dns: { text: 'DNS propagándose', tone: 'warning' },
  active_provisioning: { text: 'Aprovisionando', tone: 'warning' },
  provisioning_failed: { text: 'Falló — requiere acción', tone: 'destructive' },
  unknown: { text: 'Estado desconocido', tone: 'muted' },
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  sent: 'default',
  pending: 'secondary',
  failed: 'destructive',
  bounced: 'destructive',
  complained: 'destructive',
  dlq: 'destructive',
  suppressed: 'outline',
};

const STATUS_LABEL: Record<string, string> = {
  sent: 'Enviado',
  pending: 'Pendiente',
  failed: 'Falló',
  bounced: 'Rebote',
  complained: 'Queja',
  dlq: 'DLQ',
  suppressed: 'Bloqueado',
};

export function InfraTab() {
  const { data, isLoading, isFetching, refetch } = useEmailInfraStatus();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['email-infra-status'] });
    await refetch();
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const domainBadge = DOMAIN_LABEL[data.domainStatus];
  const DomainIcon =
    data.domainReady ? ShieldCheck : data.domainStatus === 'unknown' ? ShieldQuestion : ShieldAlert;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Último chequeo:{' '}
            {format(new Date(data.checkedAt), "dd/MM/yyyy HH:mm", { locale: es })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Re-verificar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Dominio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" /> Dominio de Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <DomainIcon
                className={`h-8 w-8 ${
                  domainBadge.tone === 'success'
                    ? 'text-emerald-500'
                    : domainBadge.tone === 'warning'
                      ? 'text-amber-500'
                      : domainBadge.tone === 'destructive'
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                }`}
              />
              <div>
                <p className="font-mono text-sm font-medium">
                  {data.domainName ?? 'Sin configurar'}
                </p>
                <Badge
                  variant={
                    domainBadge.tone === 'success'
                      ? 'default'
                      : domainBadge.tone === 'destructive'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="mt-1"
                >
                  {domainBadge.text}
                </Badge>
              </div>
            </div>
            {!data.domainReady && (
              <p className="text-xs text-muted-foreground">
                Si lleva más de 72hs sin verificarse, revisá los registros DNS en
                tu proveedor de dominio.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cola */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Cola de envío (24hs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 text-center">
              <Stat label="Enviados" value={data.queue.sent} tone="success" />
              <Stat label="Pendientes" value={data.queue.pending} tone="warning" />
              <Stat label="Fallaron" value={data.queue.failed} tone="destructive" />
              <Stat label="DLQ" value={data.queue.dlq} tone="destructive" />
            </div>
            {data.lastError && (
              <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                <p className="font-medium text-destructive">Último error</p>
                <p className="mt-1 text-muted-foreground">
                  {data.lastError.recipient || '—'}: {data.lastError.error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla últimos envíos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimos envíos</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay envíos registrados en las últimas 24hs.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="px-2 py-2 text-left font-medium">Plantilla</th>
                    <th className="px-2 py-2 text-left font-medium">Destinatario</th>
                    <th className="px-2 py-2 text-left font-medium">Estado</th>
                    <th className="px-2 py-2 text-left font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r) => (
                    <tr key={r.message_id ?? `${r.recipient_email}-${r.created_at}`} className="border-b last:border-0">
                      <td className="px-2 py-2 text-xs">{r.template_name}</td>
                      <td className="px-2 py-2 text-xs">{r.recipient_email}</td>
                      <td className="px-2 py-2">
                        <Badge variant={STATUS_VARIANT[r.status] ?? 'secondary'} className="text-[10px]">
                          {STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                        {r.error_message && (
                          <p className="mt-1 max-w-xs truncate text-[10px] text-destructive" title={r.error_message}>
                            {r.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {format(new Date(r.created_at), 'dd/MM HH:mm', { locale: es })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'destructive' }) {
  const toneClass = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    destructive: 'text-destructive',
  }[tone];
  return (
    <div className="rounded-md border bg-card p-2">
      <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
