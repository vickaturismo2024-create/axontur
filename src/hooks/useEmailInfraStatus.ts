import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { supabase } from '@/integrations/supabase/client';

export type DomainStatus = 'active' | 'awaiting_dns' | 'active_provisioning' | 'provisioning_failed' | 'unknown';

export interface QueueMetrics {
  pending: number;
  sent: number;
  failed: number;
  dlq: number;
  suppressed: number;
  total: number;
}

export interface RecentEmail {
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface InfraStatus {
  domainStatus: DomainStatus;
  domainName: string | null;
  queue: QueueMetrics;
  recent: RecentEmail[];
  lastError: { recipient: string; error: string; at: string } | null;
  checkedAt: string;
  domainReady: boolean;
  queueHealthy: boolean;
}

const EMPTY_QUEUE: QueueMetrics = { pending: 0, sent: 0, failed: 0, dlq: 0, suppressed: 0, total: 0 };

async function fetchInfraStatus(): Promise<InfraStatus> {
  const { data, error } = await supabase.functions.invoke('check-email-infra', { body: {} });
  if (error) {
    return {
      domainStatus: 'unknown',
      domainName: null,
      queue: EMPTY_QUEUE,
      recent: [],
      lastError: { recipient: '', error: error.message, at: new Date().toISOString() },
      checkedAt: new Date().toISOString(),
      domainReady: false,
      queueHealthy: false,
    };
  }

  const queue: QueueMetrics = data?.queue ?? EMPTY_QUEUE;
  const recent: RecentEmail[] = data?.recent ?? [];
  const lastError = data?.lastError ?? null;

  // Domain status: we infer readiness from queue health since the platform
  // does not expose a domain-status API to the function. If we have *any*
  // recent successful sends OR no failures at all, we assume domainReady.
  // Otherwise (only failures / dlq), we surface as 'provisioning_failed'.
  let domainStatus: DomainStatus = 'unknown';
  if (queue.sent > 0) {
    domainStatus = 'active';
  } else if (queue.dlq > 0 || queue.failed > 0) {
    domainStatus = 'provisioning_failed';
  } else if (queue.pending > 0) {
    domainStatus = 'awaiting_dns';
  } else {
    domainStatus = 'active'; // no traffic, assume ok
  }

  const domainReady = domainStatus === 'active';
  // Queue is healthy if dlq + failed is < 30% of total in the last 24h.
  const failRatio = queue.total > 0 ? (queue.dlq + queue.failed) / queue.total : 0;
  const queueHealthy = failRatio < 0.3;

  return {
    domainStatus,
    domainName: 'notify.vickaturismo.tur.ar',
    queue,
    recent,
    lastError,
    checkedAt: data?.checkedAt ?? new Date().toISOString(),
    domainReady,
    queueHealthy,
  };
}

export function useEmailInfraStatus() {
  return useQuery({
    queryKey: queryKeys.infra.emailStatus(),
    queryFn: fetchInfraStatus,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
