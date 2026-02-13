import { Info, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialCalloutProps {
  type: 'info' | 'warning' | 'tip';
  children: React.ReactNode;
}

const styles = {
  info: {
    icon: Info,
    bg: 'bg-primary/5 border-primary/20',
    iconColor: 'text-primary',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-destructive/5 border-destructive/20',
    iconColor: 'text-destructive',
  },
  tip: {
    icon: Lightbulb,
    bg: 'bg-accent/10 border-accent/30',
    iconColor: 'text-accent',
  },
};

export function TutorialCallout({ type, children }: TutorialCalloutProps) {
  const { icon: Icon, bg, iconColor } = styles[type];
  return (
    <div className={cn('flex gap-3 rounded-lg border p-3 not-prose', bg)}>
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColor)} />
      <div className="text-sm text-foreground/80">{children}</div>
    </div>
  );
}
