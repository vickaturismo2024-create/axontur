import { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCollapsibleWidget } from '@/hooks/useCollapsibleWidget';

interface CollapsibleWidgetProps {
  /** Clave única para persistir el estado en localStorage */
  widgetKey: string;
  /** Ícono del widget */
  icon: ReactNode;
  /** Título del widget */
  title: string;
  /** Cantidad de ítems para el badge de notificación (0 = no mostrar) */
  count?: number;
  /** Color del badge: 'default' | 'destructive' | 'warning' */
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'warning';
  /** Contenido del widget */
  children: ReactNode;
  /** Clase adicional para el contenedor */
  className?: string;
  /** Abierto por defecto */
  defaultOpen?: boolean;
}

export function CollapsibleWidget({
  widgetKey,
  icon,
  title,
  count = 0,
  badgeVariant = 'secondary',
  children,
  className,
  defaultOpen = true,
}: CollapsibleWidgetProps) {
  const { isOpen, toggle } = useCollapsibleWidget(widgetKey, defaultOpen);

  return (
    <div
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200',
        className,
      )}
    >
      {/* Header — siempre visible, clickeable para toggle */}
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50 rounded-t-xl"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Ícono */}
          <span className="shrink-0 text-muted-foreground">{icon}</span>

          {/* Título */}
          <span className="text-sm font-semibold truncate">{title}</span>

          {/* Badge de notificación — solo si count > 0 */}
          {count > 0 && (
            <Badge
              variant={badgeVariant === 'warning' ? 'secondary' : badgeVariant}
              className={cn(
                'shrink-0 h-5 min-w-5 px-1.5 text-[10px] font-bold',
                badgeVariant === 'warning' && 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-0',
                badgeVariant === 'destructive' && 'animate-pulse',
              )}
            >
              {count}
            </Badge>
          )}
        </div>

        {/* Chevron */}
        <span className="shrink-0 ml-2 text-muted-foreground">
          {isOpen
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />
          }
        </span>
      </button>

      {/* Contenido — con animación */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="px-4 pb-4 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
}
