import { useNavigate } from 'react-router-dom';
import { Plus, Users, Plane, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Action {
  label: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  bgColor: string;
}

const ACTIONS: Action[] = [
  {
    label: 'Nuevo Presupuesto',
    icon: <Plus className="h-5 w-5" />,
    href: '/quote/new',
    color: 'text-primary',
    bgColor: 'bg-primary/10 hover:bg-primary/20',
  },
  {
    label: 'Nuevo Cliente',
    icon: <Users className="h-5 w-5" />,
    href: '/clients',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
  },
  {
    label: 'Nueva Reserva',
    icon: <Plane className="h-5 w-5" />,
    href: '/reservations/import',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10 hover:bg-sky-500/20',
  },
  {
    label: 'Caja',
    icon: <Wallet className="h-5 w-5" />,
    href: '/accounts',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ACTIONS.map((action) => (
        <button
          key={action.href}
          onClick={() => navigate(action.href)}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border p-4',
            'transition-all duration-150 active:scale-[0.97]',
            'text-center cursor-pointer',
            action.bgColor,
          )}
        >
          <span className={cn('rounded-lg p-2', action.bgColor, action.color)}>
            {action.icon}
          </span>
          <span className={cn('text-xs font-semibold leading-tight', action.color)}>
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
}
