import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

export type DocStatus = 'expired' | 'expiring' | 'valid' | 'none';

export function getDocStatus(dateStr: string | null | undefined): DocStatus {
  if (!dateStr) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr + 'T00:00:00');
  if (isNaN(expiry.getTime())) return 'none';
  if (expiry < today) return 'expired';
  const sixMonths = new Date(today);
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  if (expiry < sixMonths) return 'expiring';
  return 'valid';
}

export function getWorstStatus(statuses: DocStatus[]): DocStatus {
  if (statuses.includes('expired')) return 'expired';
  if (statuses.includes('expiring')) return 'expiring';
  if (statuses.includes('valid')) return 'valid';
  return 'none';
}

interface DocumentAlertBadgeProps {
  label: string;
  dateStr: string | null | undefined;
  compact?: boolean;
}

export function DocumentAlertBadge({ label, dateStr, compact }: DocumentAlertBadgeProps) {
  const status = getDocStatus(dateStr);
  if (status === 'none') return null;

  const config = {
    expired: { text: 'Vencido', variant: 'destructive' as const, icon: ShieldAlert, className: '' },
    expiring: { text: 'Por vencer', variant: 'outline' as const, icon: AlertTriangle, className: 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400' },
    valid: { text: 'Vigente', variant: 'outline' as const, icon: ShieldCheck, className: 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400' },
  }[status];

  const Icon = config.icon;

  if (compact) {
    return (
      <Badge variant={config.variant} className={`text-[10px] px-1.5 py-0 gap-0.5 ${config.className}`}>
        <Icon className="h-2.5 w-2.5" />
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {label}: {config.text}
    </Badge>
  );
}
