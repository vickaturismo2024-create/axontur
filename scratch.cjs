const fs = require('fs');
const file = 'src/hooks/useFlightReservations.ts';
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('import { queryKeys } from')) {
  content = content.replace(
    /import \{ useQuery, useMutation, useQueryClient \} from '@tanstack\/react-query';/,
    "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { queryKeys } from '@/lib/queryKeys';"
  );
}

// Queries
content = content.replace(/queryKey: \['reservations', user\?\.id\],/g, 'queryKey: queryKeys.reservations.all(user?.id),');
content = content.replace(/queryKey: \['reservation', id\],/g, 'queryKey: queryKeys.reservations.detail(id),');
content = content.replace(/queryKey: \['upcoming-flights', user\?\.id, limit\],/g, 'queryKey: queryKeys.reservations.upcomingFlights(user?.id, limit),');
content = content.replace(/queryKey: \['pending-changes-count', user\?\.id\],/g, 'queryKey: queryKeys.reservations.pendingChangesCount(user?.id),');

// Invalidations
content = content.replace(/queryKey: \['reservations'\]/g, 'queryKey: queryKeys.reservations.all()');
content = content.replace(/queryKey: \['reservation'\]/g, 'queryKey: queryKeys.reservations.detail()');
content = content.replace(/queryKey: \['upcoming-flights'\]/g, 'queryKey: queryKeys.reservations.upcomingFlights()');
content = content.replace(/queryKey: \['pending-changes-count'\]/g, 'queryKey: queryKeys.reservations.pendingChangesCount()');

fs.writeFileSync(file, content);
console.log('Done');
