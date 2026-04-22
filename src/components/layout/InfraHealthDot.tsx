import { Link } from 'react-router-dom';
import { useEmailInfraStatus } from '@/hooks/useEmailInfraStatus';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function InfraHealthDot() {
  const { data, isLoading } = useEmailInfraStatus();

  if (isLoading || !data) {
    return (
      <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" aria-hidden />
    );
  }

  const status: 'green' | 'yellow' | 'red' = !data.domainReady
    ? data.domainStatus === 'awaiting_dns'
      ? 'yellow'
      : 'red'
    : data.queueHealthy
      ? 'green'
      : 'yellow';

  const colorClass = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-destructive',
  }[status];

  const label = {
    green: 'Infraestructura de email operativa',
    yellow: data.domainStatus === 'awaiting_dns'
      ? 'Dominio propagándose (DNS)'
      : 'Cola de envíos con advertencias',
    red: 'Problemas en envío de emails — revisar Configuración',
  }[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/settings?tab=infraestructura"
          aria-label={label}
          className="inline-flex items-center justify-center"
        >
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full ring-2 ring-background transition',
              colorClass,
              status === 'green' ? '' : 'animate-pulse',
            )}
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
