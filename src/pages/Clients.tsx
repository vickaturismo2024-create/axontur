import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AdminOnly } from '@/components/auth/AdminOnly';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone, Download, Upload, FileText, AlertTriangle, ShieldAlert, ChevronDown, ChevronRight, MapPin, Calendar, FolderOpen, ChevronLeft, Wallet } from 'lucide-react';
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
import { Quote } from '@/types/quote';

const PAGE_SIZE = 50;

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [docFilter, setDocFilter] = useState<boolean>(() => searchParams.get('docs') === '1');
  const highlightName = searchParams.get('highlight');

  const { data: clients = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['clients', user?.id],
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground flex items-center gap-3">
              <Users className="h-8 w-8" /> Clientes
            </h1>
            <p className="mt-1 text-muted-foreground">Gestioná tus clientes, importá desde Excel y organizalos en grupos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Importar Excel
            </Button>
            {clients.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
            )}
            <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> Nuevo Cliente</Button>
          </div>
        </div>

        <Tabs defaultValue="clients">
          <TabsList>
            <TabsTrigger value="clients">Clientes ({clients.length})</TabsTrigger>
            <TabsTrigger value="groups">Grupos</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-6">
            {docAlerts.total > 0 && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-950">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <p className="text-sm">
                  {docAlerts.expired > 0 && <span className="font-semibold text-destructive">{docAlerts.expired} vencido(s)</span>}
                  {docAlerts.expired > 0 && docAlerts.expiring > 0 && ' · '}
                  {docAlerts.expiring > 0 && <span className="font-semibold text-yellow-700 dark:text-yellow-400">{docAlerts.expiring} por vencer</span>}
                </p>
                <Button variant={docFilter ? 'default' : 'outline'} size="sm" className="ml-auto" onClick={() => setDocFilter(!docFilter)}>
                  <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                  {docFilter ? 'Mostrar todos' : 'Filtrar alertas'}
                </Button>
              </div>
            )}

            <div className="mb-6 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email, teléfono o DNI..." className="pl-10" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-72" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="py-12 text-center">
                <CardContent>
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">{search ? 'No se encontraron clientes' : 'Aún no tenés clientes. ¡Creá el primero o importá desde Excel!'}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  {paginated.map(client => (
                    <ExpandableClientCard
                      key={client.id}
                      client={client}
                      quotes={getClientQuotes(client)}
                      onEdit={() => handleEdit(client)}
                      onDelete={() => setDeleteTargetId(client.id)}
                      navigate={navigate}
                      defaultOpen={!!highlightName && client.name === highlightName}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages} · {filtered.length} clientes
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                        <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                      </Button>
                      <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                        Siguiente <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
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

      <ImportExcelDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={handleBulkImportDone}
        existingDnis={existingDnis}
      />

      <AlertDialog open={!!deleteTargetId} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
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

function ExpandableClientCard({ client, quotes, onEdit, onDelete, navigate, defaultOpen }: {
  client: ClientRecord;
  quotes: Quote[];
  onEdit: () => void;
  onDelete: () => void;
  navigate: ReturnType<typeof useNavigate>;
  defaultOpen?: boolean;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(defaultOpen || false);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [quoteFilter, setQuoteFilter] = useState('all');
  const [fileFilter, setFileFilter] = useState('all');
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when defaultOpen
  useEffect(() => {
    if (defaultOpen && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [defaultOpen]);

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

  const detail = (label: string, value: string | undefined | null) =>
    value ? <span className="text-xs"><span className="font-medium text-foreground">{label}:</span> {value}</span> : null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card ref={cardRef} className={defaultOpen ? 'ring-2 ring-primary' : ''}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-2 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg">{client.name}</CardTitle>
                <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                  {client.dni && <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />DNI: {client.dni}</span>}
                  {client.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{client.email}</span>}
                  {(client.phone || client.phone_mobile) && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{client.phone_mobile || client.phone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DocumentAlertBadge label="DNI" dateStr={client.dni_expiry} compact />
                <DocumentAlertBadge label="Pasaporte" dateStr={client.passport_expiry} compact />
                {quotes.length > 0 && <Badge variant="secondary" className="text-xs">{quotes.length} ppto(s)</Badge>}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-4">
            {/* Personal data */}
            <div className="rounded-md border p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Datos personales</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                {detail('Dirección', client.address)}
                {detail('Localidad', client.locality)}
                {detail('Nacionalidad', client.nationality)}
                {detail('Fecha Nac.', client.birth_date)}
                {detail('Sexo', client.sex)}
                {detail('CUIL/CUIT', client.cuil_cuit)}
                {detail('DNI', client.dni)}
                {detail('Vto. DNI', client.dni_expiry)}
                {detail('Pasaporte', client.passport)}
                {detail('Emisión Pas.', client.passport_issue)}
                {detail('Vto. Pasaporte', client.passport_expiry)}
                {detail('Tel. Particular', client.phone)}
                {detail('Tel. Comercial', client.phone_work)}
                {detail('Celular', client.phone_mobile)}
              </div>
              {client.notes && <p className="text-xs text-muted-foreground mt-2">📝 {client.notes}</p>}
            </div>

            {/* Presupuestos & Expedientes tabs */}
            {(quotes.length > 0 || (filesLoaded && files.length > 0)) && (
              <Tabs defaultValue="quotes" className="rounded-md border p-3">
                <TabsList className="mb-2">
                  <TabsTrigger value="quotes">Presupuestos ({quotes.length})</TabsTrigger>
                  <TabsTrigger value="files">Expedientes ({files.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="quotes">
                  {/* Sub-filters */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {QUOTE_FILTERS.map(f => {
                      const count = quoteCountByFilter(f.key);
                      return (
                        <Button
                          key={f.key}
                          variant={quoteFilter === f.key ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setQuoteFilter(f.key)}
                        >
                          {f.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                        </Button>
                      );
                    })}
                  </div>
                  {filteredQuotes.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">Sin presupuestos en esta categoría</p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {filteredQuotes.map(q => (
                        <button
                          key={q.id}
                          onClick={() => navigate(`/quote/${q.id}`)}
                          className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{q.trip.destination || 'Sin destino'}</span>
                            <Badge variant={STATUS_COLORS[q.status || 'draft'] || 'secondary'} className="text-[10px]">{STATUS_LABELS[q.status || 'draft'] || q.status}</Badge>
                          </div>
                          <span className="text-xs font-medium">{(q.trip as any).currency || 'USD'} {(q.pricing.totalPrice || 0).toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="files">
                  {/* Sub-filters */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {FILE_FILTERS.map(f => {
                      const count = fileCountByFilter(f.key);
                      return (
                        <Button
                          key={f.key}
                          variant={fileFilter === f.key ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setFileFilter(f.key)}
                        >
                          {f.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                        </Button>
                      );
                    })}
                  </div>
                  {filteredFiles.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">Sin expedientes en esta categoría</p>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {filteredFiles.map(f => (
                        <button
                          key={f.id}
                          onClick={() => navigate(`/files/${f.id}`)}
                          className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>FILE-{String(f.file_number).padStart(3, '0')}</span>
                            <span className="text-muted-foreground">{f.destination}</span>
                            <Badge variant={STATUS_COLORS[f.status] || 'secondary'} className="text-[10px]">{STATUS_LABELS[f.status] || f.status}</Badge>
                          </div>
                          {f.start_date && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(f.start_date).toLocaleDateString('es-AR')}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onEdit}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/clients/${client.id}`)}>
                <Wallet className="mr-1 h-4 w-4" /> Cuenta Corriente
              </Button>
              <AdminOnly>
                <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </AdminOnly>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default Clients;
