import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AdminOnly } from '@/components/auth/AdminOnly';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoadingScreen } from '@/components/ui/PageLoadingScreen';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2, Users, User, Mail, Phone, Download, Upload, FileText, AlertTriangle, ShieldAlert, ChevronDown, ChevronRight, MapPin, Calendar, FolderOpen, ChevronLeft, Wallet } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { DocumentAlertBadge, getDocStatus, getWorstStatus, DocStatus } from '@/components/clients/DocumentAlertBadge';
import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotes } from '@/contexts/QuotesContext';
import { toast } from 'sonner';
import { ClientFormDialog, ClientRecord, emptyClient } from '@/components/clients/ClientFormDialog';
import { ImportExcelDialog } from '@/components/clients/ImportExcelDialog';
import { GroupsManager } from '@/components/clients/GroupsManager';
import { ClientInfoDialog } from '@/components/clients/ClientInfoDialog';
import { Quote } from '@/types/quote';

const PAGE_SIZE = 25;

function mapRow(c: any): ClientRecord {
  return {
    id: c.id, name: c.name || '', email: c.email || '', phone: c.phone || '',
    phone_work: c.phone_work || '', phone_mobile: c.phone_mobile || '', notes: c.notes || '',
    address: c.address || '', nationality: c.nationality || '',
    birth_date: c.birth_date || '', dni: c.dni || '', dni_expiry: c.dni_expiry || '',
    passport: c.passport || '', passport_issue: c.passport_issue || '',
    passport_expiry: c.passport_expiry || '', locality: c.locality || '',
    cuil_cuit: c.cuil_cuit || '', sex: c.sex || '',
  };
}

async function fetchAllClients(userId: string): Promise<ClientRecord[]> {
  const all: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.from('clients').select('*').order('name').range(from, from + PAGE - 1);
    if (error) { console.error(error); break; }
    all.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all.map(mapRow);
}

const Clients = () => {
  const { user } = useAuth();
  const { quotes } = useQuotes();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [selectedInfoClient, setSelectedInfoClient] = useState<ClientRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [docFilter, setDocFilter] = useState<boolean>(() => searchParams.get('docs') === '1');
  const highlightName = searchParams.get('highlight');

  const { data: clients = [], isLoading: loading, refetch } = useQuery({
    queryKey: queryKeys.clients.all(user?.id),
    queryFn: () => fetchAllClients(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  const fetchClients = async () => { await refetch(); };

  const existingDnis = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => { if (c.dni) set.add(c.dni); });
    return set;
  }, [clients]);

  const docAlerts = useMemo(() => {
    let expired = 0, expiring = 0;
    clients.forEach(c => {
      const dniS = getDocStatus(c.dni_expiry);
      const pasS = getDocStatus(c.passport_expiry);
      if (dniS === 'expired' || pasS === 'expired') expired++;
      else if (dniS === 'expiring' || pasS === 'expiring') expiring++;
    });
    return { expired, expiring, total: expired + expiring };
  }, [clients]);

  const filtered = useMemo(() => {
    let list = clients;
    if (docFilter) {
      list = list.filter(c => {
        const worst = getWorstStatus([getDocStatus(c.dni_expiry), getDocStatus(c.passport_expiry)]);
        return worst === 'expired' || worst === 'expiring';
      });
    }
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(c =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) || c.dni.includes(q)
    );
  }, [clients, search, docFilter]);

  // Reset page when filters/search change
  useEffect(() => { setPage(1); }, [search, docFilter]);

  // Automatically open client info modal if ?info=clientId is present
  const infoParam = searchParams.get('info');
  useEffect(() => {
    if (infoParam && clients.length > 0) {
      const foundClient = clients.find(c => c.id === infoParam);
      if (foundClient) {
        setSelectedInfoClient(foundClient);
        setIsInfoOpen(true);
      }
    }
  }, [infoParam, clients]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const getClientQuotes = (client: ClientRecord): Quote[] =>
    quotes.filter(q => q.client.name === client.name || (client.email && q.client.email === client.email));

  const handleNew = () => { setEditingClient({ id: '', ...emptyClient }); setIsDialogOpen(true); };
  const handleEdit = (client: ClientRecord) => { setEditingClient({ ...client }); setIsDialogOpen(true); };
  const handleViewInfo = (client: ClientRecord) => { setSelectedInfoClient(client); setIsInfoOpen(true); };

  const handleSave = async () => {
    if (!editingClient || !user) return;
    const payload: any = { ...editingClient };
    delete payload.id;
    ['birth_date', 'dni_expiry', 'passport_issue', 'passport_expiry'].forEach(f => {
      if (!payload[f]) payload[f] = null;
    });
    try {
      if (editingClient.id) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
        if (error) throw error;
        toast.success('Cliente actualizado');
      } else {
        payload.user_id = user.id;
        const { error } = await supabase.from('clients').insert([payload]);
        if (error) throw error;
        toast.success('Cliente creado');
      }
      setIsDialogOpen(false);
      setEditingClient(null);
      fetchClients();
    } catch (e) { console.error(e); toast.error('Error al guardar el cliente'); }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', deleteTargetId);
      if (error) throw error;
      queryClient.setQueryData<ClientRecord[]>(['clients', user?.id], (prev) => (prev || []).filter(c => c.id !== deleteTargetId));
      setDeleteTargetId(null);
      toast.success('Cliente eliminado');
    } catch (e) { console.error(e); toast.error('Error al eliminar'); }
  };

  const handleBulkImportDone = async () => {
    await fetchClients();
  };

  const handleExport = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Clientes');

    ws.columns = [
      { header: 'Nombre',         key: 'Nombre',        width: 28 },
      { header: 'Email',          key: 'Email',         width: 28 },
      { header: 'Tel. Particular',key: 'TelPart',       width: 16 },
      { header: 'Tel. Comercial', key: 'TelCom',        width: 16 },
      { header: 'Celular',        key: 'Celular',       width: 16 },
      { header: 'Dirección',      key: 'Direccion',     width: 28 },
      { header: 'Localidad',      key: 'Localidad',     width: 18 },
      { header: 'Nacionalidad',   key: 'Nacionalidad',  width: 16 },
      { header: 'Fecha Nac.',     key: 'FechaNac',      width: 13 },
      { header: 'Sexo',           key: 'Sexo',          width: 8  },
      { header: 'DNI',            key: 'DNI',           width: 13 },
      { header: 'Vto. DNI',       key: 'VtoDNI',        width: 13 },
      { header: 'Pasaporte',      key: 'Pasaporte',     width: 16 },
      { header: 'Emisión Pas.',   key: 'EmisionPas',    width: 13 },
      { header: 'Vto. Pas.',      key: 'VtoPas',        width: 13 },
      { header: 'CUIL/CUIT',      key: 'CuilCuit',      width: 15 },
      { header: 'Notas',          key: 'Notas',         width: 32 },
    ];

    clients.forEach(c => {
      ws.addRow({
        Nombre:       c.name,
        Email:        c.email,
        TelPart:      c.phone,
        TelCom:       c.phone_work,
        Celular:      c.phone_mobile,
        Direccion:    c.address,
        Localidad:    c.locality,
        Nacionalidad: c.nationality,
        FechaNac:     c.birth_date,
        Sexo:         c.sex,
        DNI:          c.dni,
        VtoDNI:       c.dni_expiry,
        Pasaporte:    c.passport,
        EmisionPas:   c.passport_issue,
        VtoPas:       c.passport_expiry,
        CuilCuit:     c.cuil_cuit,
        Notas:        c.notes,
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = 'clientes.xlsx';
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Clientes exportados');
  };

  return (
  <div className="min-h-screen bg-background animate-fadeInUp">
    <Header />
    <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8 max-w-7xl">

      {/* ── Encabezado ───────────────────────────────────────── */}
      <div className="mb-4 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-sans text-2xl font-bold text-foreground flex items-center gap-2 sm:text-3xl tracking-tight">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" /> Clientes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestioná tu cartera de clientes, importá contactos y organizalos en grupos
            </p>
          </div>
          {/* Botones — 2x2 en mobile, fila en desktop */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="w-full sm:w-auto hover:bg-muted/50">
              <Upload className="mr-2 h-4 w-4" /> Importar
            </Button>
            {clients.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport} className="w-full sm:w-auto hover:bg-muted/50">
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
            )}
            <Button size="sm" onClick={handleNew} className="col-span-2 sm:col-span-1 sm:w-auto btn-premium">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="clients" className="space-y-6">
        <div className="border-b">
          <TabsList className="bg-transparent h-12 p-0 w-full justify-start gap-6 rounded-none">
            <TabsTrigger 
              value="clients" 
              className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-1 font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Clientes ({clients.length})
            </TabsTrigger>
            <TabsTrigger 
              value="groups" 
              className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-1 font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Grupos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="clients" className="m-0 focus-visible:outline-none">
          {/* Alerta documentos */}
          {docAlerts.total > 0 && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 shadow-sm backdrop-blur-sm sm:items-center">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/50 shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Atención con los documentos</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                  {docAlerts.expired > 0 && (
                    <span className="font-semibold text-destructive">{docAlerts.expired} vencido(s)</span>
                  )}
                  {docAlerts.expired > 0 && docAlerts.expiring > 0 && ' · '}
                  {docAlerts.expiring > 0 && (
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {docAlerts.expiring} por vencer pronto
                    </span>
                  )}
                </p>
              </div>
              <Button
                variant={docFilter ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 h-9"
                onClick={() => setDocFilter(!docFilter)}
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                {docFilter ? 'Ver Todos' : 'Filtrar Riesgos'}
              </Button>
            </div>
          )}

          {/* Buscador */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email, teléfono o DNI..."
                className="pl-10 h-11 rounded-xl bg-card/50 backdrop-blur-sm border-muted-foreground/20 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <PageLoadingScreen message="Cargando clientes..." />
          ) : filtered.length === 0 ? (
            <div className="glass-card-premium py-16 text-center rounded-2xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {search ? 'No se encontraron resultados' : 'Sin clientes registrados'}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                {search
                  ? 'Intentá con otros términos de búsqueda.'
                  : 'Comenzá agregando tu primer cliente o importá tu base de datos desde un archivo Excel.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block glass-card-premium overflow-hidden rounded-2xl border bg-card/40 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b">
                      <tr>
                        <th className="px-6 py-4 font-semibold tracking-wider">Cliente</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Contacto</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Documentos</th>
                        <th className="px-6 py-4 font-semibold tracking-wider text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {paginated.map(client => (
                        <ClientTableRow
                          key={client.id}
                          client={client}
                          quotes={getClientQuotes(client)}
                          onEdit={() => handleEdit(client)}
                          onDelete={() => setDeleteTargetId(client.id)}
                          onInfo={() => handleViewInfo(client)}
                          navigate={navigate}
                          defaultOpen={!!highlightName && client.name === highlightName}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {paginated.map(client => (
                  <ClientMobileCard
                    key={client.id}
                    client={client}
                    quotes={getClientQuotes(client)}
                    onEdit={() => handleEdit(client)}
                    onDelete={() => setDeleteTargetId(client.id)}
                    onInfo={() => handleViewInfo(client)}
                    navigate={navigate}
                    defaultOpen={!!highlightName && client.name === highlightName}
                  />
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between gap-2 px-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pág. <span className="text-foreground">{currentPage}</span> de {totalPages} <span className="mx-1 text-border">|</span> {filtered.length} clientes
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="h-9 hover:bg-muted/50 rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="h-9 hover:bg-muted/50 rounded-lg"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="groups" className="m-0 focus-visible:outline-none">
          <GroupsManager clients={clients} />
        </TabsContent>
      </Tabs>
    </main>

    <ClientFormDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      client={editingClient}
      onClientChange={setEditingClient}
      onSave={handleSave}
    />

    <ClientInfoDialog
      open={isInfoOpen}
      onOpenChange={setIsInfoOpen}
      client={selectedInfoClient}
      onEdit={() => handleEdit(selectedInfoClient!)}
    />

    <ImportExcelDialog
      open={isImportOpen}
      onOpenChange={setIsImportOpen}
      onImport={handleBulkImportDone}
      existingDnis={existingDnis}
    />

    <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
      <AlertDialogContent className="mx-3 sm:mx-auto rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer y borrará permanentemente sus datos.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0 mt-4">
          <AlertDialogCancel className="w-full sm:w-auto rounded-xl">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);
};

// ── Status helpers ──

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary', sent: 'default', approved: 'default', expired: 'destructive', cancelled: 'destructive',
  confirmed: 'default', in_progress: 'secondary', completed: 'outline',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviado', approved: 'Aprobado', expired: 'Vencido', cancelled: 'Cancelado',
  confirmed: 'Confirmado', in_progress: 'En curso', completed: 'Completado',
};

// ── Quote status filters ──
const QUOTE_FILTERS = [
  { key: 'all', label: 'Todos', statuses: null },
  { key: 'pending', label: 'Pendientes', statuses: ['draft'] },
  { key: 'sent', label: 'Enviados', statuses: ['sent'] },
  { key: 'approved', label: 'Aprobados', statuses: ['approved'] },
  { key: 'cancelled', label: 'Cancelados', statuses: ['cancelled', 'expired'] },
];

// ── File status filters ──
const FILE_FILTERS = [
  { key: 'all', label: 'Todos', statuses: null },
  { key: 'open', label: 'Abiertos', statuses: ['confirmed', 'in_progress'] },
  { key: 'closed', label: 'Cerrados', statuses: ['completed', 'cancelled'] },
];

interface FileRecord { id: string; file_number: number; destination: string; status: string; start_date: string | null; }

function useClientExpandable(client: ClientRecord, quotes: Quote[], defaultOpen: boolean) {
  const { user } = useAuth();
  const [open, setOpen] = useState(defaultOpen);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [quoteFilter, setQuoteFilter] = useState('all');
  const [fileFilter, setFileFilter] = useState('all');

  useEffect(() => {
    if (!open || filesLoaded || !user) return;
    supabase.from('files').select('id, file_number, destination, status, start_date')
      .or(`client_id.eq.${client.id},client_name.eq.${client.name}`)
      .then(({ data }) => { setFiles((data || []) as FileRecord[]); setFilesLoaded(true); });
  }, [open, filesLoaded, user, client.id, client.name]);

  const filteredQuotes = useMemo(() => {
    const filter = QUOTE_FILTERS.find(f => f.key === quoteFilter);
    if (!filter?.statuses) return quotes;
    return quotes.filter(q => filter.statuses!.includes(q.status || 'draft'));
  }, [quotes, quoteFilter]);

  const filteredFiles = useMemo(() => {
    const filter = FILE_FILTERS.find(f => f.key === fileFilter);
    if (!filter?.statuses) return files;
    return files.filter(f => filter.statuses!.includes(f.status));
  }, [files, fileFilter]);

  const quoteCountByFilter = useCallback((key: string) => {
    const filter = QUOTE_FILTERS.find(f => f.key === key);
    if (!filter?.statuses) return quotes.length;
    return quotes.filter(q => filter.statuses!.includes(q.status || 'draft')).length;
  }, [quotes]);

  const fileCountByFilter = useCallback((key: string) => {
    const filter = FILE_FILTERS.find(f => f.key === key);
    if (!filter?.statuses) return files.length;
    return files.filter(f => filter.statuses!.includes(f.status)).length;
  }, [files]);

  return { open, setOpen, files, filesLoaded, quoteFilter, setQuoteFilter, fileFilter, setFileFilter, filteredQuotes, filteredFiles, quoteCountByFilter, fileCountByFilter };
}

function ClientDetailsExpanded({ client, quotes, hookState, navigate, onEdit, onDelete }: {
  client: ClientRecord; quotes: Quote[]; hookState: ReturnType<typeof useClientExpandable>; navigate: any; onEdit: () => void; onDelete: () => void;
}) {
  const { files, filesLoaded, quoteFilter, setQuoteFilter, fileFilter, setFileFilter, filteredQuotes, filteredFiles, quoteCountByFilter, fileCountByFilter } = hookState;
  const detail = (label: string, value: string | undefined | null) =>
    value ? <div className="text-sm"><span className="text-slate-600 font-semibold mr-1">{label}:</span> <span className="text-foreground font-medium">{value}</span></div> : null;

  return (
    <div className="grid gap-6 md:grid-cols-12 animate-fadeInUp">
      {/* Columna Izquierda: Datos */}
      <div className="md:col-span-4 space-y-4">
        <div className="rounded-xl bg-background/50 border p-4 backdrop-blur-sm">
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Datos Personales</h4>
          <div className="space-y-2">
            {detail('Dirección', client.address)}
            {detail('Localidad', client.locality)}
            {detail('Nacionalidad', client.nationality)}
            {detail('Nacimiento', client.birth_date)}
            {detail('Sexo', client.sex)}
            {detail('CUIL/CUIT', client.cuil_cuit)}
            {detail('DNI', client.dni)}
            {detail('Emisión DNI', client.dni_expiry ? '...' : null) /* simplified */}
            {detail('Vto. DNI', client.dni_expiry)}
            {detail('Pasaporte', client.passport)}
            {detail('Vto. Pasaporte', client.passport_expiry)}
          </div>
          {client.notes && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Notas Privadas</h4>
              <p className="text-sm text-slate-700 font-medium italic">{client.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Tabs */}
      <div className="md:col-span-8">
        <div className="rounded-xl bg-background/50 border p-4 backdrop-blur-sm h-full">
          <Tabs defaultValue="quotes">
            <TabsList className="mb-4 bg-muted/50 rounded-lg p-1">
              <TabsTrigger value="quotes" className="rounded-md text-sm">
                Presupuestos <Badge variant="secondary" className="ml-2 bg-background">{quotes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="files" className="rounded-md text-sm">
                Expedientes <Badge variant="secondary" className="ml-2 bg-background">{files.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quotes" className="space-y-3 m-0">
              <div className="flex flex-wrap gap-2">
                {QUOTE_FILTERS.map(f => {
                  const count = quoteCountByFilter(f.key);
                  return (
                    <Button key={f.key} variant={quoteFilter === f.key ? 'default' : 'outline'} size="sm" className="h-7 text-xs rounded-full" onClick={() => setQuoteFilter(f.key)}>
                      {f.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                    </Button>
                  );
                })}
              </div>
              {filteredQuotes.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm bg-muted/20 rounded-xl border border-dashed">No hay presupuestos acá.</div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredQuotes.map(q => (
                    <div key={q.id} onClick={() => navigate(`/quote/${q.id}`)} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm cursor-pointer transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{q.trip.destination || 'Sin destino'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{(q.trip as any).currency || 'USD'} {(q.pricing.totalPrice || 0).toLocaleString('es-AR')}</p>
                        </div>
                      </div>
                      <Badge variant={STATUS_COLORS[q.status || 'draft'] || 'secondary'} className="capitalize">{STATUS_LABELS[q.status || 'draft']}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="files" className="space-y-3 m-0">
              <div className="flex flex-wrap gap-2">
                {FILE_FILTERS.map(f => {
                  const count = fileCountByFilter(f.key);
                  return (
                    <Button key={f.key} variant={fileFilter === f.key ? 'default' : 'outline'} size="sm" className="h-7 text-xs rounded-full" onClick={() => setFileFilter(f.key)}>
                      {f.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                    </Button>
                  );
                })}
              </div>
              {filteredFiles.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm bg-muted/20 rounded-xl border border-dashed">No hay expedientes acá.</div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredFiles.map(f => (
                    <div key={f.id} onClick={() => navigate(`/files/${f.id}`)} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm cursor-pointer transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                          <FolderOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">FILE-{String(f.file_number).padStart(3, '0')} · {f.destination}</p>
                          {f.start_date && <p className="text-xs text-muted-foreground mt-0.5">Inicia el {new Date(f.start_date).toLocaleDateString('es-AR')}</p>}
                        </div>
                      </div>
                      <Badge variant={STATUS_COLORS[f.status] || 'secondary'} className="capitalize">{STATUS_LABELS[f.status] || f.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// -- Desktop Table Row --
function ClientTableRow({ client, quotes, onEdit, onDelete, onInfo, navigate, defaultOpen }: any) {
  const hookState = useClientExpandable(client, quotes, defaultOpen);
  const { open, setOpen } = hookState;

  return (
    <>
      <tr 
        onClick={() => setOpen(!open)}
        className={`group transition-colors hover:bg-muted/40 cursor-pointer ${open ? 'bg-muted/20 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${open ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{client.name}</p>
              {client.locality && <p className="text-xs text-slate-600 font-medium mt-0.5"><MapPin className="inline h-3 w-3 mr-0.5 text-slate-500" />{client.locality}</p>}
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="space-y-1">
            {client.email ? (
              <p className="text-sm text-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-500" /> {client.email}</p>
            ) : <span className="text-sm text-slate-400 font-medium">-</span>}
            {(client.phone || client.phone_mobile) ? (
              <p className="text-sm text-slate-700 font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-500" /> {client.phone_mobile || client.phone}</p>
            ) : null}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <DocumentAlertBadge label="DNI" dateStr={client.dni_expiry} compact />
            <DocumentAlertBadge label="Pasaporte" dateStr={client.passport_expiry} compact />
          </div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background shadow-sm hover:text-primary" onClick={(e) => { e.stopPropagation(); onInfo(); }} title="Ver Información Personal">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background shadow-sm hover:text-primary" onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}`); }} title="Cuenta Corriente">
              <Wallet className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background shadow-sm text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <AdminOnly>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 shadow-sm text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Eliminar">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AdminOnly>
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4} className="p-0 border-b-0">
            <div className="bg-muted/10 border-t border-b border-border/50 p-6 shadow-inner">
              <ClientDetailsExpanded client={client} quotes={quotes} hookState={hookState} navigate={navigate} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// -- Mobile Card View --
function ClientMobileCard({ client, quotes, onEdit, onDelete, onInfo, navigate, defaultOpen }: any) {
  const hookState = useClientExpandable(client, quotes, defaultOpen);
  const { open, setOpen } = hookState;

  return (
    <div className={`glass-card-premium overflow-hidden rounded-2xl border transition-all ${open ? 'ring-2 ring-primary/50' : ''}`}>
      <div className="p-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${open ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate text-base">{client.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                {client.email ? <><Mail className="h-3 w-3" /> {client.email}</> : 'Sin email'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <DocumentAlertBadge label="DNI" dateStr={client.dni_expiry} compact />
          <DocumentAlertBadge label="Pasaporte" dateStr={client.passport_expiry} compact />
        </div>
      </div>
      {open && (
        <div className="p-4 pt-0 border-t border-border/50 mt-2 bg-muted/5">
          <div className="mt-4">
             <ClientDetailsExpanded client={client} quotes={quotes} hookState={hookState} navigate={navigate} onEdit={onEdit} onDelete={onDelete} />
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
             <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={(e) => { e.stopPropagation(); onInfo(); }}>
               <User className="mr-2 h-4 w-4" /> Info
             </Button>
             <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}`); }}>
               <Wallet className="mr-2 h-4 w-4" /> Cuenta
             </Button>
             <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
               <Pencil className="mr-2 h-4 w-4" /> Editar
             </Button>
             <AdminOnly>
               <Button variant="outline" size="sm" className="flex-none rounded-xl text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                 <Trash2 className="h-4 w-4" />
               </Button>
             </AdminOnly>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clients;
