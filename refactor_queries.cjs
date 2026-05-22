const fs = require('fs');
const path = require('path');

const replacements = [
  {
    file: 'src/pages/Clients.tsx',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['clients', user\?\.id\],/g, to: 'queryKey: queryKeys.clients.all(user?.id),' }
    ],
    invalidations: []
  },
  {
    file: 'src/pages/ClientDetail.tsx',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['client-detail', id\],/g, to: 'queryKey: queryKeys.clients.detail(id),' },
      { from: /queryKey: \['client-movements', id\],/g, to: 'queryKey: queryKeys.clients.movements(id),' },
      { from: /queryKey: \['client-file-numbers', id\],/g, to: 'queryKey: queryKeys.clients.fileNumbers(id),' }
    ],
    invalidations: [
      { from: /queryKey: \['client-movements', id\]/g, to: 'queryKey: queryKeys.clients.movements(id)' }
    ]
  },
  {
    file: 'src/pages/Suppliers.tsx',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['suppliers', user\?\.id\],/g, to: 'queryKey: queryKeys.suppliers.all(user?.id),' }
    ],
    invalidations: [
      { from: /queryKey: \['suppliers', user\?\.id\]/g, to: 'queryKey: queryKeys.suppliers.all(user?.id)' }
    ]
  },
  {
    file: 'src/pages/SupplierDetail.tsx',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['supplier-detail', id\],/g, to: 'queryKey: queryKeys.suppliers.detail(id),' },
      { from: /queryKey: \['supplier-services', id\],/g, to: 'queryKey: queryKeys.suppliers.services(id),' },
      { from: /queryKey: \['supplier-payments', id\],/g, to: 'queryKey: queryKeys.suppliers.payments(id),' }
    ],
    invalidations: [
      { from: /queryKey: \['supplier-detail', id\]/g, to: 'queryKey: queryKeys.suppliers.detail(id)' },
      { from: /queryKey: \['suppliers', user\?\.id\]/g, to: 'queryKey: queryKeys.suppliers.all(user?.id)' }
    ]
  },
  {
    file: 'src/pages/Accounts.tsx',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['accounts-clients', user\?\.id\],/g, to: 'queryKey: queryKeys.accounts.clients(user?.id),' },
      { from: /queryKey: \['accounts-suppliers', user\?\.id\],/g, to: 'queryKey: queryKeys.accounts.suppliers(user?.id),' },
      { from: /queryKey: \['accounts-movements', user\?\.id\],/g, to: 'queryKey: queryKeys.accounts.movements(user?.id),' }
    ],
    invalidations: []
  },
  {
    file: 'src/pages/Calendar.tsx',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['calendar-flight-segments', user\?\.id, monthStart\.toISOString\(\), monthEnd\.toISOString\(\)\],/g, to: 'queryKey: queryKeys.calendar.flightSegments(user?.id, monthStart.toISOString(), monthEnd.toISOString()),' }
    ],
    invalidations: []
  },
  {
    file: 'src/pages/Files.tsx',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['files', user\?\.id\],/g, to: 'queryKey: queryKeys.files.all(user?.id),' }
    ],
    invalidations: []
  },
  {
    file: 'src/pages/Reservations.tsx',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['all-reservation-passengers', reservationIds\],/g, to: 'queryKey: queryKeys.reservations.allPassengers(reservationIds),' },
      { from: /queryKey: \['all-flight-segments', reservationIds\],/g, to: 'queryKey: queryKeys.reservations.allSegments(reservationIds),' },
      { from: /queryKey: \['all-reservation-changes', reservationIds\],/g, to: 'queryKey: queryKeys.reservations.allChanges(reservationIds),' },
      { from: /queryKey: \['reservation-linked-files', fileIds\],/g, to: 'queryKey: queryKeys.reservations.linkedFiles(fileIds),' }
    ],
    invalidations: []
  },
  {
    file: 'src/pages/ReservationDetail.tsx',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['reservation-file', reservation\?\.file_id\],/g, to: 'queryKey: queryKeys.reservations.file(reservation?.file_id),' }
    ],
    invalidations: []
  },
  {
    file: 'src/hooks/useEmailInfraStatus.ts',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['email-infra-status'\],/g, to: 'queryKey: queryKeys.infra.emailStatus(),' }
    ],
    invalidations: []
  },
  {
    file: 'src/hooks/useOperationalReport.ts',
    import: "import { queryKeys } from '@/lib/queryKeys';",
    queries: [
      { from: /queryKey: \['operational-report', user\?\.id, period, range\.from, range\.to\],/g, to: 'queryKey: queryKeys.reports.operational(user?.id, period, range.from, range.to),' }
    ],
    invalidations: []
  }
];

for (const { file, import: imp, queries, invalidations } of replacements) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    if (!content.includes('queryKeys')) {
      const match = content.match(/import\s+.*from\s+['"]@tanstack\/react-query['"];?/);
      if (match) {
        content = content.replace(match[0], match[0] + '\n' + imp);
        modified = true;
      }
    }

    for (const q of queries) {
      if (q.from.test(content)) {
        content = content.replace(q.from, q.to);
        modified = true;
      }
    }

    for (const i of invalidations) {
      if (i.from.test(content)) {
        content = content.replace(i.from, i.to);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
}
