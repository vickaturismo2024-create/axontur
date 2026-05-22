/**
 * Centralized React Query Key Factory
 *
 * Mantiene un registro estandarizado de todas las claves usadas en useQuery y useMutation
 * para evitar typos y facilitar la invalidación de caché cruzada.
 */

export const queryKeys = {
  // ─── RESERVATIONS (useFlightReservations.ts, Reservations.tsx, ReservationDetail.tsx)
  reservations: {
    all: (userId?: string) => ['reservations', userId] as const,
    detail: (id?: string) => ['reservation', id] as const,
    upcomingFlights: (userId?: string, limit?: number) => ['upcoming-flights', userId, limit] as const,
    pendingChangesCount: (userId?: string) => ['pending-changes-count', userId] as const,
    
    // Anidados en Reservations / Details
    file: (fileId?: string) => ['reservation-file', fileId] as const,
    allPassengers: (reservationIds: string[]) => ['all-reservation-passengers', reservationIds] as const,
    allSegments: (reservationIds: string[]) => ['all-flight-segments', reservationIds] as const,
    allChanges: (reservationIds: string[]) => ['all-reservation-changes', reservationIds] as const,
    linkedFiles: (fileIds: string[]) => ['reservation-linked-files', fileIds] as const,
  },

  // ─── SUPPLIERS (Suppliers.tsx, SupplierDetail.tsx)
  suppliers: {
    all: (userId?: string) => ['suppliers', userId] as const,
    detail: (id: string) => ['supplier-detail', id] as const,
    services: (id: string) => ['supplier-services', id] as const,
    payments: (id: string) => ['supplier-payments', id] as const,
  },

  // ─── CLIENTS (Clients.tsx, ClientDetail.tsx)
  clients: {
    all: (userId?: string) => ['clients', userId] as const,
    detail: (id: string) => ['client-detail', id] as const,
    movements: (id: string) => ['client-movements', id] as const,
    fileNumbers: (id: string) => ['client-file-numbers', id] as const,
  },

  // ─── ACCOUNTS (Accounts.tsx)
  accounts: {
    clients: (userId?: string) => ['accounts-clients', userId] as const,
    suppliers: (userId?: string) => ['accounts-suppliers', userId] as const,
    movements: (userId?: string) => ['accounts-movements', userId] as const,
  },

  // ─── CALENDAR (Calendar.tsx)
  calendar: {
    flightSegments: (userId?: string, start?: string, end?: string) => ['calendar-flight-segments', userId, start, end] as const,
  },

  // ─── FILES (Files.tsx)
  files: {
    all: (userId?: string) => ['files', userId] as const,
  },

  // ─── REPORTS & DASHBOARDS (useOperationalReport.ts)
  reports: {
    operational: (userId?: string, period?: string, from?: string, to?: string) => 
      ['operational-report', userId, period, from, to] as const,
  },

  // ─── INFRASTRUCTURE / SYSTEM (useEmailInfraStatus.ts)
  infra: {
    emailStatus: () => ['email-infra-status'] as const,
  },
};
