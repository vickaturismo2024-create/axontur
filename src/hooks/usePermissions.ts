import { useAuth } from '@/contexts/AuthContext';

/**
 * Permisos derivados del rol del usuario en la agencia.
 * - admin: puede todo (eliminar, configurar agencia, gestionar movimientos manuales)
 * - vendedor: operación diaria (crear/editar) pero no eliminar ni configurar
 */
export function usePermissions() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const isVendedor = role === 'vendedor';

  return {
    role,
    isAdmin,
    isVendedor,
    // Capacidades de eliminación (todas restringidas a admin)
    canDelete: isAdmin,
    canDeleteQuotes: isAdmin,
    canDeleteClients: isAdmin,
    canDeleteSuppliers: isAdmin,
    canDeleteFiles: isAdmin,
    canDeleteReceipts: isAdmin,
    canDeleteSupplierPayments: isAdmin,
    canDeleteReservations: isAdmin,
    // Movimientos manuales en cuentas corrientes
    canCreateMovements: isAdmin,
    canEditMovements: isAdmin,
    // Configuración
    canManageAgency: isAdmin,
    canManageDocuments: isAdmin,
    canManageEmail: isAdmin,
    canManageInfra: isAdmin,
    // Plantillas
    canEditTemplates: isAdmin,
    // Gestión de usuarios (Fase C)
    canManageMembers: isAdmin,
  };
}
