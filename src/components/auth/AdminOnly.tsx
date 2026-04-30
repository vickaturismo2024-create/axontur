import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renderiza children solo si el usuario es admin de la agencia.
 * Para acciones destructivas o de configuración sensible.
 */
export function AdminOnly({ children, fallback = null }: Props) {
  const { isAdmin } = usePermissions();
  if (!isAdmin) return <>{fallback}</>;
  return <>{children}</>;
}
