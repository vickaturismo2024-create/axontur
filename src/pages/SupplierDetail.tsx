import { localDateStr } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NewMovementDialog } from '@/components/accounts/NewMovementDialog';
import {
  ArrowLeft,
  Save,
  Store,
  Mail,
  Phone,
  FileText,
  DollarSign,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  MessageSquare,
  Building2,
  Users,
  CreditCard,
  Globe,
  MapPin,
  Check,
  Wallet,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';

export const SUPPLIER_TYPES = [
  'Aerolínea',
  'Hotel',
  'Operador',
  'Cruceros',
  'Asistencia',
  'Traslados',
  'Excursiones',
  'Otro',
];

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  notes: string;
  cuit_tax_id?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  category?: string;
  payment_terms_days?: number;
}

interface ServiceRow {
  id: string;
  file_id: string;
  service_type: string;
  description: string;
  service_date: string | null;
  cost: number;
  price: number;
  currency: string;
  status: string;
}

interface PaymentRow {
  id: string;
  file_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
}

interface SupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  role_department: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_primary: boolean;
  notes: string | null;
}

interface SupplierBankAccount {
  id: string;
  supplier_id: string;
  bank_name: string;
  account_type: string | null;
  currency: string;
  cbu_alias_iban: string | null;
  account_number: string | null;
  holder_name: string | null;
  holder_tax_id: string | null;
  is_primary: boolean;
}

interface MovementRow {
  id: string;
  movement_date: string;
  movement_type: string;
  amount: number;
  currency: string;
  concept: string;
  reference: string | null;
  file_id: string | null;
  receipt_id: string | null;
  notes: string | null;
}

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, agencyId } = useAuth();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<Supplier | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  // Cuenta Corriente States
  const [newMovOpen, setNewMovOpen] = useState(false);
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Contact Dialog States
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    role_department: '',
    email: '',
    phone: '',
    whatsapp: '',
    notes: '',
    is_primary: false,
  });

  // Bank Account Dialog States
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<SupplierBankAccount | null>(null);
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    account_type: '',
    currency: 'ARS',
    cbu_alias_iban: '',
    account_number: '',
    holder_name: '',
    holder_tax_id: '',
    is_primary: false,
  });

  const { data: supplier, isLoading } = useQuery<Supplier | null>({
    queryKey: queryKeys.suppliers.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
      const s = data as any;
      if (s) {
        setEditing({
          id: s.id,
          name: s.name || '',
          email: s.email || '',
          phone: s.phone || '',
          type: s.type || '',
          notes: s.notes || '',
          cuit_tax_id: s.cuit_tax_id || '',
          address: s.address || '',
          city: s.city || '',
          country: s.country || '',
          website: s.website || '',
          category: s.category || '',
          payment_terms_days: s.payment_terms_days || 0,
        });
        setNotes(s.notes || '');
      }
      return s
        ? {
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone,
            type: s.type,
            notes: s.notes,
            cuit_tax_id: s.cuit_tax_id,
            address: s.address,
            city: s.city,
            country: s.country,
            website: s.website,
            category: s.category,
            payment_terms_days: s.payment_terms_days,
          }
        : null;
    },
    enabled: !!id && !!user,
  });

  const { data: services = [] } = useQuery<ServiceRow[]>({
    queryKey: queryKeys.suppliers.services(id!),
    queryFn: async () => {
      const { data } = await supabase
        .from('file_services')
        .select('*')
        .eq('supplier_id', id!)
        .order('service_date', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!id && !!user,
  });

  const { data: payments = [] } = useQuery<PaymentRow[]>({
    queryKey: queryKeys.suppliers.payments(id!),
    queryFn: async () => {
      const { data } = await supabase
        .from('file_supplier_payments')
        .select('*')
        .eq('supplier_id', id!)
        .order('payment_date', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!id && !!user,
  });

  // Contacts Query
  const { data: contacts = [], refetch: refetchContacts } = useQuery<SupplierContact[]>({
    queryKey: ['supplier-contacts', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_contacts' as any)
        .select('*')
        .eq('supplier_id', id!)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true });
      return (data as any[]) || [];
    },
    enabled: !!id && !!user,
  });

  // Bank Accounts Query
  const { data: bankAccounts = [], refetch: refetchBankAccounts } = useQuery<SupplierBankAccount[]>({
    queryKey: ['supplier-bank-accounts', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('supplier_bank_accounts' as any)
        .select('*')
        .eq('supplier_id', id!)
        .order('is_primary', { ascending: false })
        .order('currency', { ascending: true });
      return (data as any[]) || [];
    },
    enabled: !!id && !!user,
  });

  // Account Movements Query (Cuenta Corriente Global)
  const { data: movements = [], refetch: refetchMovements } = useQuery<MovementRow[]>({
    queryKey: ['supplier-movements', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('account_movements' as any)
        .select('*')
        .eq('account_type', 'supplier')
        .eq('account_id', id!)
        .order('movement_date', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!id && !!user,
  });

  const { data: movementFileNumbers = {} } = useQuery<Record<string, number>>({
    queryKey: ['supplier-movement-files', id, movements.length],
    queryFn: async () => {
      const fileIds = Array.from(new Set(movements.map((m) => m.file_id).filter(Boolean))) as string[];
      if (fileIds.length === 0) return {};
      const { data } = await supabase.from('files').select('id, file_number').in('id', fileIds);
      const map: Record<string, number> = {};
      ((data as any[]) || []).forEach((f) => {
        map[f.id] = f.file_number;
      });
      return map;
    },
    enabled: movements.length > 0,
  });

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (currencyFilter !== 'all' && m.currency !== currencyFilter) return false;
      if (fromDate && m.movement_date < fromDate) return false;
      if (toDate && m.movement_date > toDate) return false;
      return true;
    });
  }, [movements, currencyFilter, fromDate, toDate]);

  const movementCurrencies = useMemo(
    () => Array.from(new Set(movements.map((m) => m.currency))).sort(),
    [movements],
  );

  const balancesByMovementCurrency = useMemo(() => {
    const map: Record<string, { credit: number; debit: number }> = {};
    movements.forEach((m) => {
      if (!map[m.currency]) map[m.currency] = { credit: 0, debit: 0 };
      const amt = Number(m.amount) || 0;
      if (m.movement_type === 'credit') map[m.currency].credit += amt;
      else map[m.currency].debit += amt;
    });
    return map;
  }, [movements]);

  // Saldo por moneda: costo total servicios - pagos realizados
  const balancesByCurrency = useMemo(() => {
    const map: Record<string, { owed: number; paid: number }> = {};
    services.forEach((s) => {
      if (!map[s.currency]) map[s.currency] = { owed: 0, paid: 0 };
      map[s.currency].owed += Number(s.cost) || 0;
    });
    payments
      .filter((p) => (p as any).status !== 'cancelled')
      .forEach((p) => {
        if (!map[p.currency]) map[p.currency] = { owed: 0, paid: 0 };
        map[p.currency].paid += Number(p.amount) || 0;
      });
    return map;
  }, [services, payments]);

  // YTD: facturación + cantidad de expedientes asociados
  const ytdMetrics = useMemo(() => {
    const yearStart = localDateStr(new Date(new Date().getFullYear(), 0, 1));
    const ytdServices = services.filter((s) => (s.service_date || '') >= yearStart);
    const fileSet = new Set(services.map((s) => s.file_id));
    const totalsByCurr: Record<string, number> = {};
    ytdServices.forEach((s) => {
      const c = s.currency;
      if (!totalsByCurr[c]) totalsByCurr[c] = 0;
      totalsByCurr[c] += Number(s.cost) || 0;
    });
    return { totalsByCurr, fileCount: fileSet.size };
  }, [services]);

  const handleSaveDetails = async () => {
    if (!editing || !id) return;
    const { error } = await supabase
      .from('suppliers')
      .update({
        name: editing.name,
        email: editing.email,
        phone: editing.phone,
        type: editing.type,
        cuit_tax_id: editing.cuit_tax_id || null,
        address: editing.address || null,
        city: editing.city || null,
        country: editing.country || null,
        website: editing.website || null,
        category: editing.category || null,
        payment_terms_days: editing.payment_terms_days || 0,
      } as any)
      .eq('id', id);
    if (error) {
      toast.error('Error al guardar');
      return;
    }
    toast.success('Proveedor actualizado');
    qc.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) });
    qc.invalidateQueries({ queryKey: queryKeys.suppliers.all(user?.id) });
  };

  // Autoguardado de notas con debounce
  const handleNotesChange = (val: string) => {
    setNotes(val);
    setSavingNotes(true);
    if ((window as any)._notesTimeout) clearTimeout((window as any)._notesTimeout);
    (window as any)._notesTimeout = setTimeout(async () => {
      if (!id) return;
      await supabase.from('suppliers').update({ notes: val } as any).eq('id', id);
      setSavingNotes(false);
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) });
    }, 1000);
  };

  // Contact Dialog Handlers
  const openNewContact = () => {
    setEditingContact(null);
    setContactForm({
      name: '',
      role_department: '',
      email: '',
      phone: '',
      whatsapp: '',
      notes: '',
      is_primary: false,
    });
    setContactDialogOpen(true);
  };

  const openEditContact = (c: SupplierContact) => {
    setEditingContact(c);
    setContactForm({
      name: c.name,
      role_department: c.role_department || '',
      email: c.email || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      notes: c.notes || '',
      is_primary: c.is_primary,
    });
    setContactDialogOpen(true);
  };

  const saveContact = async () => {
    if (!id || !contactForm.name.trim()) {
      toast.error('El nombre del contacto es obligatorio');
      return;
    }
    const payload = {
      supplier_id: id,
      agency_id: agencyId,
      name: contactForm.name.trim(),
      role_department: contactForm.role_department.trim() || null,
      email: contactForm.email.trim() || null,
      phone: contactForm.phone.trim() || null,
      whatsapp: contactForm.whatsapp.trim() || null,
      notes: contactForm.notes.trim() || null,
      is_primary: contactForm.is_primary,
    };

    if (editingContact) {
      const { error } = await supabase.from('supplier_contacts' as any).update(payload).eq('id', editingContact.id);
      if (error) { toast.error('Error al actualizar contacto'); return; }
      toast.success('Contacto actualizado');
    } else {
      const { error } = await supabase.from('supplier_contacts' as any).insert(payload);
      if (error) { toast.error('Error al agregar contacto'); return; }
      toast.success('Contacto agregado');
    }
    setContactDialogOpen(false);
    refetchContacts();
  };

  const deleteContact = async (contactId: string) => {
    const { error } = await supabase.from('supplier_contacts' as any).delete().eq('id', contactId);
    if (error) { toast.error('Error al eliminar contacto'); return; }
    toast.success('Contacto eliminado');
    refetchContacts();
  };

  // Bank Account Dialog Handlers
  const openNewBank = () => {
    setEditingBank(null);
    setBankForm({
      bank_name: '',
      account_type: '',
      currency: 'ARS',
      cbu_alias_iban: '',
      account_number: '',
      holder_name: '',
      holder_tax_id: '',
      is_primary: false,
    });
    setBankDialogOpen(true);
  };

  const openEditBank = (b: SupplierBankAccount) => {
    setEditingBank(b);
    setBankForm({
      bank_name: b.bank_name,
      account_type: b.account_type || '',
      currency: b.currency || 'ARS',
      cbu_alias_iban: b.cbu_alias_iban || '',
      account_number: b.account_number || '',
      holder_name: b.holder_name || '',
      holder_tax_id: b.holder_tax_id || '',
      is_primary: b.is_primary,
    });
    setBankDialogOpen(true);
  };

  const saveBank = async () => {
    if (!id || !bankForm.bank_name.trim()) {
      toast.error('El nombre del banco es obligatorio');
      return;
    }
    const payload = {
      supplier_id: id,
      agency_id: agencyId,
      bank_name: bankForm.bank_name.trim(),
      account_type: bankForm.account_type.trim() || null,
      currency: bankForm.currency || 'ARS',
      cbu_alias_iban: bankForm.cbu_alias_iban.trim() || null,
      account_number: bankForm.account_number.trim() || null,
      holder_name: bankForm.holder_name.trim() || null,
      holder_tax_id: bankForm.holder_tax_id.trim() || null,
      is_primary: bankForm.is_primary,
    };

    if (editingBank) {
      const { error } = await supabase.from('supplier_bank_accounts' as any).update(payload).eq('id', editingBank.id);
      if (error) { toast.error('Error al actualizar cuenta'); return; }
      toast.success('Cuenta bancaria actualizada');
    } else {
      const { error } = await supabase.from('supplier_bank_accounts' as any).insert(payload);
      if (error) { toast.error('Error al agregar cuenta'); return; }
      toast.success('Cuenta bancaria agregada');
    }
    setBankDialogOpen(false);
    refetchBankAccounts();
  };

  const deleteBank = async (bankId: string) => {
    const { error } = await supabase.from('supplier_bank_accounts' as any).delete().eq('id', bankId);
    if (error) { toast.error('Error al eliminar cuenta'); return; }
    toast.success('Cuenta bancaria eliminada');
    refetchBankAccounts();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </main>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Proveedor no encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/suppliers')}>
            Volver
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/suppliers')} className="mb-2">
              <ArrowLeft className="mr-1 h-4 w-4" /> Volver
            </Button>
            <h1 className="font-sans text-3xl font-bold flex items-center gap-2">
              <Store className="h-7 w-7 text-primary" /> {supplier.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {supplier.type && <Badge variant="secondary">{supplier.type}</Badge>}
              {supplier.cuit_tax_id && (
                <Badge variant="outline" className="font-mono text-xs">
                  CUIT/Tax ID: {supplier.cuit_tax_id}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Métricas YTD */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-sans text-sm font-semibold flex items-center gap-1">
                <Briefcase className="h-4 w-4" /> Expedientes asociados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{ytdMetrics.fileCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-sans text-sm font-semibold flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Facturación YTD
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(ytdMetrics.totalsByCurr).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin actividad este año</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(ytdMetrics.totalsByCurr).map(([c, v]) => (
                    <p key={c} className="text-lg font-semibold">
                      {c} {fmt(v)}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-sans text-sm font-semibold">Saldo por moneda</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(balancesByCurrency).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin movimientos</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(balancesByCurrency).map(([c, { owed, paid }]) => {
                    const bal = owed - paid;
                    return (
                      <p key={c} className={`text-sm ${bal > 0 ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                        {c}: {bal > 0 ? 'Adeudado ' : 'Saldo '} {fmt(Math.abs(bal))}
                      </p>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="details">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="details">Datos Generales</TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1">
              <Users className="h-3.5 w-3.5" /> Contactos ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-1">
              <Building2 className="h-3.5 w-3.5" /> Cuentas Bancarias ({bankAccounts.length})
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1">
              <Wallet className="h-3.5 w-3.5" /> Cuenta Corriente
            </TabsTrigger>
            <TabsTrigger value="services">Servicios ({services.length})</TabsTrigger>
            <TabsTrigger value="payments">Pagos ({payments.length})</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          {/* TAB 1: DATOS GENERALES */}
          <TabsContent value="details">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {editing && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Nombre / Razón Social *</Label>
                        <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Tipo de Proveedor</Label>
                        <Select value={editing.type || ''} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPLIER_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                            {editing.type && !SUPPLIER_TYPES.includes(editing.type) && (
                              <SelectItem value={editing.type}>{editing.type} (personalizado)</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>CUIT / Tax ID / Identificación Fiscal</Label>
                        <Input
                          placeholder="Ej: 30-71234567-8"
                          value={editing.cuit_tax_id || ''}
                          onChange={(e) => setEditing({ ...editing, cuit_tax_id: e.target.value })}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div>
                        <Label>Sitio Web / Portal B2B</Label>
                        <Input
                          placeholder="https://proveedor.com"
                          value={editing.website || ''}
                          onChange={(e) => setEditing({ ...editing, website: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Email General</Label>
                        <Input
                          type="email"
                          value={editing.email}
                          onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Teléfono Central</Label>
                        <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label>Dirección</Label>
                        <Input
                          placeholder="Calle y altura"
                          value={editing.address || ''}
                          onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Ciudad</Label>
                        <Input
                          placeholder="Ej: Buenos Aires"
                          value={editing.city || ''}
                          onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>País</Label>
                        <Input
                          placeholder="Ej: Argentina"
                          value={editing.country || ''}
                          onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                        />
                      </div>
                    </div>

                    <Button onClick={handleSaveDetails}>
                      <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: CONTACTOS OPERATIVOS */}
          <TabsContent value="contacts">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Contactos Operativos y Comerciales</h4>
                  <Button size="sm" onClick={openNewContact} className="gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Agregar Contacto
                  </Button>
                </div>

                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
                    No hay contactos registrados. Agregá ejecutivos de cuenta, departamento de reservas o guardias 24hs.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {contacts.map((c) => (
                      <Card key={c.id} className="relative overflow-hidden border">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{c.name}</span>
                                {c.is_primary && <Badge className="text-[10px] py-0 bg-primary">Principal</Badge>}
                              </div>
                              {c.role_department && (
                                <p className="text-xs text-muted-foreground font-medium">{c.role_department}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditContact(c)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteContact(c.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs">
                            {c.email && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <a href={`mailto:${c.email}`} className="hover:underline text-foreground">
                                  {c.email}
                                </a>
                              </div>
                            )}
                            {c.phone && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                <a href={`tel:${c.phone}`} className="hover:underline text-foreground">
                                  {c.phone}
                                </a>
                              </div>
                            )}
                            {c.whatsapp && (
                              <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <a
                                  href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline flex items-center gap-1"
                                >
                                  WhatsApp: {c.whatsapp} <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                          {c.notes && <p className="text-xs text-muted-foreground border-t pt-1.5 mt-1">{c.notes}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: CUENTAS BANCARIAS */}
          <TabsContent value="bank">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Cuentas Bancarias para Transferencias</h4>
                  <Button size="sm" onClick={openNewBank} className="gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Agregar Cuenta
                  </Button>
                </div>

                {bankAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
                    No hay cuentas bancarias cargadas. Agregá CBU, Alias o IBAN para agilizar pagos a este operador.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {bankAccounts.map((b) => (
                      <Card key={b.id} className="border">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{b.bank_name}</span>
                              <Badge variant="outline" className="font-bold text-[10px]">
                                {b.currency}
                              </Badge>
                              {b.is_primary && <Badge className="text-[10px] py-0 bg-emerald-600">Principal</Badge>}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditBank(b)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteBank(b.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {b.account_type && <p className="text-xs text-muted-foreground">{b.account_type}</p>}

                          {b.cbu_alias_iban && (
                            <div className="flex items-center justify-between rounded-md bg-muted/60 p-2 text-xs font-mono border">
                              <span className="truncate mr-2">{b.cbu_alias_iban}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] gap-1 shrink-0"
                                onClick={() => copyToClipboard(b.cbu_alias_iban!, 'Alias / CBU')}
                              >
                                <Copy className="h-3 w-3" /> Copiar
                              </Button>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                            {b.holder_name && <p>Titular: <strong className="text-foreground">{b.holder_name}</strong></p>}
                            {b.holder_tax_id && <p>CUIT/ID: <span className="font-mono">{b.holder_tax_id}</span></p>}
                            {b.account_number && <p>N° Cuenta: <span className="font-mono">{b.account_number}</span></p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: SERVICIOS */}
          <TabsContent value="services">
            <Card>
              <CardContent className="pt-6">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Aún no hay servicios registrados con este proveedor.</p>
                ) : (
                  <div className="space-y-2">
                    {services.map((s) => (
                      <Link
                        to={`/files/${s.file_id}`}
                        key={s.id}
                        className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.description || s.service_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.service_date ? new Date(s.service_date).toLocaleDateString('es-AR') : '—'} · {s.service_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm">{s.currency} {fmt(s.cost)}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {s.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: PAGOS */}
          <TabsContent value="payments">
            <Card>
              <CardContent className="pt-6">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Aún no hay pagos registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => {
                      const isCancelled = (p as any).status === 'cancelled';
                      return (
                        <Link
                          to={`/files/${p.file_id}`}
                          key={p.id}
                          className={`flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 ${
                            isCancelled ? 'bg-destructive/5 opacity-60' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${isCancelled ? 'line-through text-muted-foreground' : ''}`}>
                                {new Date(p.payment_date).toLocaleDateString('es-AR')}
                              </p>
                              {isCancelled && <Badge variant="destructive" className="text-[10px] py-0">ANULADO</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{p.reference || p.payment_method || '—'}</p>
                          </div>
                          <p className={`font-mono text-sm ${isCancelled ? 'line-through text-muted-foreground' : ''}`}>
                            {p.currency} {fmt(p.amount)}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: NOTAS */}
          <TabsContent value="notes">
            <Card>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Notas internas</Label>
                  <span className="text-xs text-muted-foreground">{savingNotes ? 'Guardando...' : 'Autoguardado'}</span>
                </div>
                <Textarea rows={10} value={notes} onChange={(e) => handleNotesChange(e.target.value)} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 7: CUENTA CORRIENTE GLOBAL */}
          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-sans text-base font-bold text-primary flex items-center gap-2">
                  <Wallet className="h-5 w-5" /> Saldo Cuenta Corriente Global
                </CardTitle>
                <Button size="sm" onClick={() => setNewMovOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Movimiento Manual
                </Button>
              </CardHeader>
              <CardContent>
                {Object.keys(balancesByMovementCurrency).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin movimientos contables registrados.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {Object.entries(balancesByMovementCurrency).map(([c, { credit, debit }]) => {
                      const bal = credit - debit;
                      return (
                        <div key={c} className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">{c}</p>
                          <p
                            className={`text-xl font-bold ${
                              bal > 0 ? 'text-green-600 dark:text-green-400' : bal < 0 ? 'text-destructive' : ''
                            }`}
                          >
                            {fmt(bal)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Créditos (Ingresos): {fmt(credit)} · Débitos (Pagos): {fmt(debit)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-base font-bold text-primary">
                  Movimientos ({filteredMovements.length})
                </CardTitle>
                <div className="grid gap-2 mt-3 sm:grid-cols-3">
                  <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las monedas</SelectItem>
                      {movementCurrencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="Desde" />
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="Hasta" />
                </div>
              </CardHeader>
              <CardContent>
                {filteredMovements.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No hay movimientos registrados para este proveedor.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Expediente</TableHead>
                        <TableHead className="text-right">Crédito</TableHead>
                        <TableHead className="text-right">Débito</TableHead>
                        <TableHead>Moneda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(m.movement_date + 'T00:00:00').toLocaleDateString('es-AR')}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{m.concept}</p>
                            {m.reference && <p className="text-xs text-muted-foreground">Ref: {m.reference}</p>}
                            {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                          </TableCell>
                          <TableCell>
                            {m.file_id ? (
                              <Link
                                to={`/files/${m.file_id}`}
                                className="text-xs flex items-center gap-1 text-primary hover:underline font-mono"
                              >
                                <FolderOpen className="h-3 w-3" />
                                FILE-{String(movementFileNumbers[m.file_id] || '?').padStart(3, '0')}
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-green-600 dark:text-green-400">
                            {m.movement_type === 'credit' ? fmt(Number(m.amount)) : ''}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-destructive">
                            {m.movement_type === 'debit' ? fmt(Number(m.amount)) : ''}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {m.currency}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {id && (
          <NewMovementDialog
            open={newMovOpen}
            onClose={() => setNewMovOpen(false)}
            accountId={id}
            accountType="supplier"
            onSaved={() => refetchMovements()}
          />
        )}

        {/* DIÁLOGO CONTACTO */}
        <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Editar Contacto' : 'Nuevo Contacto Operativo'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs py-1">
              <div>
                <Label className="text-xs">Nombre y Apellido *</Label>
                <Input
                  placeholder="Ej: Juan Pérez"
                  value={contactForm.name}
                  onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Cargo / Departamento</Label>
                <Input
                  placeholder="Ej: Ejecutivo de Cuenta, Reservas, Guardia 24hs"
                  value={contactForm.role_department}
                  onChange={(e) => setContactForm((p) => ({ ...p, role_department: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    placeholder="email@proveedor.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Teléfono</Label>
                  <Input
                    placeholder="+54 11 1234-5678"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">WhatsApp (con código de país)</Label>
                <Input
                  placeholder="Ej: 5491112345678"
                  value={contactForm.whatsapp}
                  onChange={(e) => setContactForm((p) => ({ ...p, whatsapp: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs">Observaciones</Label>
                <Textarea
                  placeholder="Horarios de atención, interno, etc."
                  value={contactForm.notes}
                  onChange={(e) => setContactForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setContactDialogOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={saveContact}>
                Guardar Contacto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIÁLOGO CUENTA BANCARIA */}
        <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingBank ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs py-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Banco *</Label>
                  <Input
                    placeholder="Ej: Banco Galicia, BBVA"
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm((p) => ({ ...p, bank_name: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Moneda</Label>
                  <Select value={bankForm.currency} onValueChange={(v) => setBankForm((p) => ({ ...p, currency: v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS ($)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">CBU / Alias / IBAN *</Label>
                <Input
                  placeholder="Ej: 0070123456... o ALIAS.EJEMPLO.ARG"
                  value={bankForm.cbu_alias_iban}
                  onChange={(e) => setBankForm((p) => ({ ...p, cbu_alias_iban: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Titular de la Cuenta</Label>
                  <Input
                    placeholder="Nombre o Razón Social"
                    value={bankForm.holder_name}
                    onChange={(e) => setBankForm((p) => ({ ...p, holder_name: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">CUIT/Tax ID del Titular</Label>
                  <Input
                    placeholder="Ej: 30-71234567-8"
                    value={bankForm.holder_tax_id}
                    onChange={(e) => setBankForm((p) => ({ ...p, holder_tax_id: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setBankDialogOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={saveBank}>
                Guardar Cuenta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
