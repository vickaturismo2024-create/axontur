import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDateSafe } from '@/lib/utils';
import {
  Plus,
  Search,
  Trash2,
  User,
  UserPlus,
  Activity,
  Plane,
  Hotel,
  Bus,
  Umbrella,
  Ship,
  Train,
  Car,
  Anchor,
  ChevronRight,
  ChevronLeft,
  Store,
  Calendar,
  Users,
  Check,
  Pencil,
  X
} from 'lucide-react';

interface NewFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: () => void;
}

interface ClientOption {
  id: string;
  name: string;
  sex?: string | null;
  birth_date?: string | null;
  nationality?: string | null;
  notes?: string | null;
  dni?: string | null;
  dni_expiry?: string | null;
  passport?: string | null;
  passport_issue?: string | null;
  passport_expiry?: string | null;
  cuil_cuit?: string | null;
  email?: string | null;
  phone?: string | null;
  phone_work?: string | null;
  phone_mobile?: string | null;
  address?: string | null;
  locality?: string | null;
}

interface PassengerForm {
  client_id: string | null;
  name: string;
  sex: string;
  birth_date: string | null;
  nationality: string;
  notes: string;
  dni: string;
  dni_expiry: string | null;
  passport: string;
  passport_issue: string | null;
  passport_expiry: string | null;
  cuil_cuit: string;
  email: string;
  phone: string;
  phone_work: string;
  phone_mobile: string;
  address: string;
  locality: string;
}

const emptyPassenger: PassengerForm = {
  client_id: null,
  name: '',
  sex: '',
  birth_date: null,
  nationality: '',
  notes: '',
  dni: '',
  dni_expiry: null,
  passport: '',
  passport_issue: null,
  passport_expiry: null,
  cuil_cuit: '',
  email: '',
  phone: '',
  phone_work: '',
  phone_mobile: '',
  address: '',
  locality: '',
};

type ServiceType = 'flight' | 'lodging' | 'transfer' | 'activity' | 'insurance' |
                   'cruise' | 'train' | 'rental_car' | 'ferry' | 'other';

interface ServiceForm {
  service_type: ServiceType;
  description: string;
  supplier_name: string;
  supplier_id: string | null;
  status: string;
  confirmation_number: string;
  cost: number | string;
  price: number | string;
  currency: string;
  service_date: string | null;
  end_date: string | null;
  payment_due_date: string | null;
  notes: string;
  origin?: string;
  destination?: string;
  airline?: string;
  flight_number?: string;
  cabin_class?: string;
  regime?: string;
  room_type?: string;
  pickup_location?: string;
  dropoff_location?: string;
  company?: string;
  departure_time?: string;
  arrival_time?: string;
  luggage?: string;
  luggage_type?: string;
  hotel_category?: string;
  ship_name?: string;
  embarkation_port?: string;
  disembarkation_port?: string;
  deck?: string;
  cabin_number?: string;
  coverage?: string;
  insurance_plan?: string;
}

const emptyService: ServiceForm = {
  service_type: 'flight',
  description: '',
  supplier_name: '',
  supplier_id: null,
  status: 'pending',
  confirmation_number: '',
  cost: '',
  price: '',
  currency: 'USD',
  service_date: null,
  end_date: null,
  payment_due_date: null,
  notes: '',
  origin: '',
  destination: '',
  airline: '',
  flight_number: '',
  cabin_class: 'Economy',
  regime: 'Sin régimen',
  room_type: '',
  pickup_location: '',
  dropoff_location: '',
  company: '',
  departure_time: '',
  arrival_time: '',
  luggage: '',
  luggage_type: 'personal',
  hotel_category: '',
  ship_name: '',
  embarkation_port: '',
  disembarkation_port: '',
  deck: '',
  cabin_number: '',
  coverage: '',
  insurance_plan: '',
};

const SERVICE_TYPES: { value: ServiceType; label: string; icon: React.ElementType }[] = [
  { value: 'flight',     label: 'Vuelo',        icon: Plane    },
  { value: 'lodging',    label: 'Alojamiento',  icon: Hotel    },
  { value: 'transfer',   label: 'Traslado',     icon: Bus      },
  { value: 'activity',   label: 'Actividad',    icon: Activity },
  { value: 'insurance',  label: 'Seguro',       icon: Umbrella },
  { value: 'cruise',     label: 'Crucero',      icon: Ship     },
  { value: 'train',      label: 'Tren',         icon: Train    },
  { value: 'rental_car', label: 'Auto',         icon: Car      },
  { value: 'ferry',      label: 'Ferry',        icon: Anchor   },
  { value: 'other',      label: 'Otro',         icon: Activity },
];

const SERVICE_STATUS = [
  { value: 'pending',   label: 'Pendiente'   },
  { value: 'confirmed', label: 'Confirmado'  },
  { value: 'cancelled', label: 'Cancelado'   },
];

const CURRENCIES = ['USD', 'ARS', 'EUR', 'BRL'];
const REGIMENES  = ['Sin régimen', 'Solo alojamiento', 'Desayuno', 'Media pensión', 'Pensión completa', 'Todo incluido'];
const CLASES     = ['Economy', 'Premium Economy', 'Business', 'First'];

const LABELS: Record<string, { dateFrom: string; dateTo: string; supplier: string; confirmation: string }> = {
  flight:     { dateFrom: 'Fecha de salida',   dateTo: 'Fecha de llegada',   supplier: 'Aerolínea',   confirmation: 'Nro. de vuelo / PNR' },
  lodging:    { dateFrom: 'Check-in',           dateTo: 'Check-out',          supplier: 'Hotel',       confirmation: 'Nro. de reserva'     },
  transfer:   { dateFrom: 'Fecha y hora',       dateTo: '',                   supplier: 'Operador',    confirmation: 'Referencia'          },
  activity:   { dateFrom: 'Fecha',              dateTo: '',                   supplier: 'Operador',    confirmation: 'Referencia'          },
  insurance:  { dateFrom: 'Vigencia desde',     dateTo: 'Vigencia hasta',     supplier: 'Compañía',    confirmation: 'Nro. de póliza'      },
  cruise:     { dateFrom: 'Fecha de embarque',  dateTo: 'Fecha de desembarque',  supplier: 'Naviera',     confirmation: 'Nro. de reserva'     },
  train:      { dateFrom: 'Fecha de salida',    dateTo: 'Fecha de llegada',   supplier: 'Operador',    confirmation: 'Nro. de reserva'     },
  rental_car: { dateFrom: 'Fecha de retiro',    dateTo: 'Fecha de devolución', supplier: 'Empresa',   confirmation: 'Nro. de reserva'     },
  ferry:      { dateFrom: 'Fecha de salida',    dateTo: 'Fecha de llegada',   supplier: 'Naviera',     confirmation: 'Nro. de reserva'     },
  other:      { dateFrom: 'Fecha de inicio',    dateTo: 'Fecha de fin',       supplier: 'Proveedor',   confirmation: 'Referencia'          },
};

export function NewFileDialog({ open, onOpenChange, onSaveSuccess }: NewFileDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  // Principal file form state
  const [form, setForm] = useState({
    client_id: 'new',
    client_name: '',
    destination: '',
    start_date: '',
    end_date: '',
    travelers: '1',
    currency: 'USD',
    total_price: '0',
    total_cost: '0',
    status: 'confirmed',
    internal_notes: '',
  });

  // Client search state for main file client
  const [mainClientSearch, setMainClientSearch] = useState('');
  const [selectedMainClient, setSelectedMainClient] = useState<ClientOption | null>(null);

  // Sub-items arrays
  const [passengersList, setPassengersList] = useState<PassengerForm[]>([]);
  const [servicesList, setServicesList] = useState<ServiceForm[]>([]);

  // Passenger modal state
  const [isPassengerOpen, setIsPassengerOpen] = useState(false);
  const [editingPassengerIdx, setEditingPassengerIdx] = useState<number | null>(null);
  const [passengerForm, setPassengerForm] = useState<PassengerForm>({ ...emptyPassenger });
  const [passengerSearch, setPassengerSearch] = useState('');
  const [importPassengerMode, setImportPassengerMode] = useState(false);

  // Service modal state
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [editingServiceIdx, setEditingServiceIdx] = useState<number | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm>({ ...emptyService });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null);

  // Reset form and load lists on open
  useEffect(() => {
    if (open) {
      setActiveTab('info');
      setForm({
        client_id: 'new',
        client_name: '',
        destination: '',
        start_date: '',
        end_date: '',
        travelers: '1',
        currency: 'USD',
        total_price: '0',
        total_cost: '0',
        status: 'confirmed',
        internal_notes: '',
      });
      setSelectedMainClient(null);
      setMainClientSearch('');
      setPassengersList([]);
      setServicesList([]);

      // Load clients
      (async () => {
        const PAGE = 1000;
        let from = 0;
        const all: any[] = [];
        while (true) {
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name')
            .range(from, from + PAGE - 1);
          if (error) {
            console.error('Error loading clients in NewFileDialog:', error);
            break;
          }
          if (!data || data.length === 0) break;
          all.push(...data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        setClients(all as ClientOption[]);
      })();

      // Load suppliers
      supabase
        .from('suppliers')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          if (data) setSuppliers(data);
        });
    }
  }, [open]);

  // Auto-calculate travelers count when passengers list changes
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      travelers: String(1 + passengersList.length),
    }));
  }, [passengersList]);

  // Auto-calculate total price and total cost when services list changes
  useEffect(() => {
    const totalP = servicesList.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const totalC = servicesList.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
    setForm(prev => ({
      ...prev,
      total_price: String(totalP),
      total_cost: String(totalC),
    }));
  }, [servicesList]);

  // Clients filters
  const filteredMainClients = useMemo(() => {
    const q = mainClientSearch.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.dni && c.dni.includes(q))
    );
  }, [clients, mainClientSearch]);

  const filteredCRMPassengers = useMemo(() => {
    const q = passengerSearch.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.dni && c.dni.includes(q)) ||
      (c.passport && c.passport.includes(q))
    );
  }, [clients, passengerSearch]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(s => s.name.toLowerCase().includes(q));
  }, [suppliers, supplierSearch]);

  // Passenger sub-form handlers
  const openNewPassenger = () => {
    setPassengerForm({ ...emptyPassenger });
    setEditingPassengerIdx(null);
    setPassengerSearch('');
    setImportPassengerMode(false);
    setIsPassengerOpen(true);
  };

  const openEditPassenger = (idx: number) => {
    setPassengerForm(passengersList[idx]);
    setEditingPassengerIdx(idx);
    setPassengerSearch('');
    setImportPassengerMode(false);
    setIsPassengerOpen(true);
  };

  const importPassenger = (c: ClientOption) => {
    setPassengerForm({
      client_id: c.id,
      name: c.name,
      sex: c.sex || '',
      birth_date: c.birth_date || null,
      nationality: c.nationality || '',
      notes: c.notes || '',
      dni: c.dni || '',
      dni_expiry: c.dni_expiry || null,
      passport: c.passport || '',
      passport_issue: c.passport_issue || null,
      passport_expiry: c.passport_expiry || null,
      cuil_cuit: c.cuil_cuit || '',
      email: c.email || '',
      phone: c.phone || '',
      phone_work: c.phone_work || '',
      phone_mobile: c.phone_mobile || '',
      address: c.address || '',
      locality: c.locality || '',
    });
    setImportPassengerMode(false);
  };

  const handleSavePassenger = () => {
    if (!passengerForm.name.trim()) {
      toast.error('El nombre del pasajero es obligatorio');
      return;
    }

    if (editingPassengerIdx !== null) {
      setPassengersList(prev => prev.map((p, i) => i === editingPassengerIdx ? passengerForm : p));
    } else {
      setPassengersList(prev => [...prev, passengerForm]);
    }
    setIsPassengerOpen(false);
  };

  const handleDeletePassenger = (idx: number) => {
    setPassengersList(prev => prev.filter((_, i) => i !== idx));
  };

  // Service sub-form handlers
  const enrichDescription = (f: ServiceForm): string => {
    if (f.description.trim()) return f.description;
    
    if (f.service_type === 'flight') {
      const route = `${f.origin || ''} → ${f.destination || ''}`.trim();
      const code = `${f.airline || ''} ${f.flight_number || ''}`.trim();
      return `Vuelo ${code} (${route})`.trim() || 'Servicio de Vuelo';
    }
    if (f.service_type === 'lodging') {
      return `Hotel: ${f.supplier_name || 'Alojamiento'} (${f.room_type || ''})`.trim() || 'Alojamiento';
    }
    if (f.service_type === 'rental_car') {
      return `Alquiler de Auto: ${f.company || f.supplier_name || ''} (${f.pickup_location || ''} → ${f.dropoff_location || ''})`.trim() || 'Alquiler de Auto';
    }
    if (f.service_type === 'insurance') {
      return `Seguro de Viaje: ${f.company || f.supplier_name || ''} (${f.insurance_plan || ''})`.trim() || 'Seguro';
    }
    if (f.service_type === 'cruise') {
      return `Crucero: ${f.ship_name || ''} (${f.company || f.supplier_name || ''})`.trim() || 'Crucero';
    }
    return f.description;
  };

  const openNewService = () => {
    setServiceForm({ ...emptyService });
    setEditingServiceIdx(null);
    setSupplierSearch('');
    setSelectedSupplier(null);
    setIsServiceOpen(true);
  };

  const openEditService = (idx: number) => {
    const s = servicesList[idx];
    setServiceForm({
      ...s,
      cost: s.cost !== undefined && s.cost !== null ? String(s.cost) : '',
      price: s.price !== undefined && s.price !== null ? String(s.price) : '',
    });
    setEditingServiceIdx(idx);
    setSupplierSearch(s.supplier_name);
    setSelectedSupplier(s.supplier_id ? { id: s.supplier_id, name: s.supplier_name } : null);
    setIsServiceOpen(true);
  };

  const handleSaveService = () => {
    const finalDesc = serviceForm.description.trim() || enrichDescription(serviceForm);
    if (!finalDesc) {
      toast.error('La descripción del servicio es obligatoria');
      return;
    }

    const payload = {
      ...serviceForm,
      description: finalDesc,
      supplier_name: selectedSupplier ? selectedSupplier.name : supplierSearch.trim(),
      supplier_id: selectedSupplier ? selectedSupplier.id : null,
    };

    if (editingServiceIdx !== null) {
      setServicesList(prev => prev.map((s, i) => i === editingServiceIdx ? payload : s));
    } else {
      setServicesList(prev => [...prev, payload]);
    }
    setIsServiceOpen(false);
  };

  const handleDeleteService = (idx: number) => {
    setServicesList(prev => prev.filter((_, i) => i !== idx));
  };

  // Main CRUD Save action
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let mainClientId = (!form.client_id || form.client_id === 'new') ? null : form.client_id;
      const mainClientName = form.client_name.trim();

      // Sync manually entered main client to CRM
      if (!mainClientId && mainClientName && mainClientName.toLowerCase() !== 'sin cliente') {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('name', mainClientName)
          .maybeSingle();

        if (existing) {
          mainClientId = existing.id;
        } else {
          const { data: newC, error: newCErr } = await supabase
            .from('clients')
            .insert({ name: mainClientName, user_id: user.id })
            .select('id')
            .single();
          if (!newCErr && newC) {
            mainClientId = newC.id;
          }
        }
      }

      const payload: any = {
        user_id: user.id,
        client_name: mainClientName || 'Sin cliente',
        client_id: mainClientId,
        destination: form.destination.trim(),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        travelers: parseInt(form.travelers, 10) || 1,
        currency: form.currency,
        total_price: parseFloat(form.total_price) || 0,
        total_cost: parseFloat(form.total_cost) || 0,
        status: form.status,
        internal_notes: form.internal_notes.trim(),
      };

      const { data: fileData, error: fileErr } = await supabase
        .from('files')
        .insert(payload)
        .select('id, file_number')
        .single();

      if (fileErr || !fileData) throw fileErr || new Error('No se pudo crear el expediente principal');

      // 2. Insert Passengers (Sync with CRM)
      for (const pass of passengersList) {
        let clientId = pass.client_id;
        
        // Match or create in CRM
        if (!clientId) {
          const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('name', pass.name.trim())
            .maybeSingle();
          if (existing) {
            clientId = existing.id;
          }
        }

        const clientPayload = {
          name: pass.name.trim(),
          sex: pass.sex || null,
          birth_date: pass.birth_date || null,
          nationality: pass.nationality || null,
          notes: pass.notes || null,
          dni: pass.dni || null,
          dni_expiry: pass.dni_expiry || null,
          passport: pass.passport || null,
          passport_issue: pass.passport_issue || null,
          passport_expiry: pass.passport_expiry || null,
          cuil_cuit: pass.cuil_cuit || null,
          email: pass.email || null,
          phone: pass.phone || null,
          phone_work: pass.phone_work || null,
          phone_mobile: pass.phone_mobile || null,
          address: pass.address || null,
          locality: pass.locality || null,
        };

        if (!clientId) {
          const { data: newC, error: cErr } = await supabase
            .from('clients')
            .insert({ ...clientPayload, user_id: user.id })
            .select('id')
            .single();
          if (!cErr && newC) clientId = newC.id;
        } else {
          await supabase.from('clients').update(clientPayload).eq('id', clientId);
        }

        // Write passenger row (guard all optional columns with || null)
        const passPayload = {
          file_id: fileData.id,
          user_id: user.id,
          client_id: clientId || null,
          name: pass.name.trim(),
          dni: pass.dni || null,
          passport: pass.passport || null,
          passport_expiry: pass.passport_expiry || null,
          birth_date: pass.birth_date || null,
          nationality: pass.nationality || null,
          notes: pass.notes || null,
        };
        await supabase.from('file_passengers').insert(passPayload);
      }

      // 3. Insert Services (clean all string & date fields to avoid syntax format errors)
      if (servicesList.length > 0) {
        const servicesPayload = servicesList.map(svc => ({
          file_id: fileData.id,
          user_id: user.id,
          service_type: svc.service_type,
          description: svc.description?.trim() || '',
          supplier_id: svc.supplier_id || null,
          supplier_name: svc.supplier_name?.trim() || null,
          status: svc.status || 'pending',
          confirmation_number: svc.confirmation_number?.trim() || null,
          cost: Number(svc.cost) || 0,
          price: Number(svc.price) || 0,
          currency: svc.currency || 'USD',
          service_date: svc.service_date || null,
          end_date: svc.end_date || null,
          payment_due_date: svc.payment_due_date || null,
          notes: svc.notes?.trim() || null,
          origin: svc.origin?.trim() || null,
          destination: svc.destination?.trim() || null,
          airline: svc.airline?.trim() || null,
          flight_number: svc.flight_number?.trim() || null,
          cabin_class: svc.cabin_class || null,
          regime: svc.regime || null,
          room_type: svc.room_type?.trim() || null,
          pickup_location: svc.pickup_location?.trim() || null,
          dropoff_location: svc.dropoff_location?.trim() || null,
          company: svc.company?.trim() || null,
          departure_time: svc.departure_time?.trim() || null,
          arrival_time: svc.arrival_time?.trim() || null,
          luggage: svc.luggage?.trim() || null,
          luggage_type: svc.luggage_type || null,
          hotel_category: svc.hotel_category?.trim() || null,
          ship_name: svc.ship_name?.trim() || null,
          embarkation_port: svc.embarkation_port?.trim() || null,
          disembarkation_port: svc.disembarkation_port?.trim() || null,
          deck: svc.deck?.trim() || null,
          cabin_number: svc.cabin_number?.trim() || null,
          coverage: svc.coverage?.trim() || null,
          insurance_plan: svc.insurance_plan?.trim() || null,
        }));
        const { error: svcErr } = await supabase.from('file_services').insert(servicesPayload);
        if (svcErr) throw svcErr;
      }

      toast.success(`Expediente FILE-${String(fileData.file_number).padStart(3, '0')} creado con éxito`);
      onSaveSuccess();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(`Error al crear expediente: ${e.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  const getServiceIcon = (type: string) => {
    const t = SERVICE_TYPES.find(x => x.value === type);
    const I = t?.icon || Activity;
    return <I className="h-4 w-4" />;
  };

  const getServiceTypeLabel = (type: string) =>
    SERVICE_TYPES.find(x => x.value === type)?.label || type;

  const lbl = LABELS[serviceForm.service_type] || LABELS.other;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nuevo Expediente Completo
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-3 p-1 mb-4 h-auto bg-muted/60">
              <TabsTrigger value="info" className="py-2.5 text-xs sm:text-sm rounded-md font-semibold">
                1. Datos Generales
              </TabsTrigger>
              <TabsTrigger value="passengers" className="py-2.5 text-xs sm:text-sm rounded-md font-semibold">
                2. Pasajeros ({passengersList.length})
              </TabsTrigger>
              <TabsTrigger value="services" className="py-2.5 text-xs sm:text-sm rounded-md font-semibold">
                3. Servicios ({servicesList.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DATOS GENERALES */}
            <TabsContent value="info" className="space-y-4 outline-none m-0">
              {/* Sección 1: Selección de Cliente */}
              <div className="border-b pb-4 space-y-3">
                <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider">Cliente del Expediente</h3>
                
                {selectedMainClient ? (
                  <div className="flex items-center justify-between p-3 border rounded-xl bg-primary/5 border-primary/20 shadow-sm transition-all duration-200">
                    <div>
                      <p className="font-bold text-foreground">{selectedMainClient.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedMainClient.dni ? `DNI: ${selectedMainClient.dni}` : 'DNI: Sin registrar'} 
                        {selectedMainClient.email && ` · Email: ${selectedMainClient.email}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMainClient(null);
                        setForm(p => ({ ...p, client_id: 'new', client_name: '' }));
                      }}
                      className="text-xs hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                    >
                      <X className="mr-1 h-3.5 w-3.5" /> Quitar
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="client-search">Buscar en CRM</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="client-search"
                          placeholder="Buscar por nombre o DNI..."
                          value={mainClientSearch}
                          onChange={e => setMainClientSearch(e.target.value)}
                          className="pl-9 h-10"
                        />
                      </div>
                      
                      {mainClientSearch && (
                        <div className="max-h-[160px] overflow-y-auto border rounded-lg bg-card divide-y shadow-md [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full mt-1.5">
                          {filteredMainClients.length === 0 ? (
                            <p className="p-3 text-xs text-center text-muted-foreground">No se encontraron clientes.</p>
                          ) : (
                            filteredMainClients.slice(0, 10).map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedMainClient(c);
                                  setForm(p => ({ ...p, client_id: c.id, client_name: c.name }));
                                }}
                                className="w-full text-left p-2.5 hover:bg-accent/60 transition-colors flex justify-between items-center text-sm"
                              >
                                <div>
                                  <span className="font-semibold">{c.name}</span>
                                  {c.dni && <span className="text-xs text-muted-foreground ml-2">(DNI: {c.dni})</span>}
                                </div>
                                <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                                  <Check className="h-3 w-3" /> Seleccionar
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="manual-client-name">Nombre Manual (Opcional si no está en CRM)</Label>
                      <Input
                        id="manual-client-name"
                        placeholder="Nombre completo"
                        value={form.client_name}
                        onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sección 2: Info Básica */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-4">
                <div className="space-y-1.5">
                  <Label htmlFor="destination">Destino</Label>
                  <Input
                    id="destination"
                    placeholder="Ej: Rio de Janeiro"
                    value={form.destination}
                    onChange={e => setForm(p => ({ ...p, destination: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="in_progress">En curso</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Pasajeros (Pax)</Label>
                  <div className="h-9 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm font-medium flex items-center justify-between">
                    <span>{form.travelers}</span>
                    <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                      Automático (Tab 2)
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 3: Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b pb-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start_date">Fecha Salida</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="end_date">Fecha Fin Viaje</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Sección 4: Precios y Moneda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Moneda Principal</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD (Dólares)</SelectItem>
                      <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                      <SelectItem value="EUR">EUR (Euros)</SelectItem>
                      <SelectItem value="BRL">BRL (Reales)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Precio de Venta</Label>
                  <div className="h-9 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm font-medium flex items-center justify-between">
                    <span>{form.currency} {Number(form.total_price).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                      Automático (Tab 3)
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Costo Total</Label>
                  <div className="h-9 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm font-medium flex items-center justify-between">
                    <span>{form.currency} {Number(form.total_cost).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border">
                      Automático (Tab 3)
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 6: Notas */}
              <div className="space-y-1.5">
                <Label htmlFor="internal_notes">Notas Internas</Label>
                <Textarea
                  id="internal_notes"
                  placeholder="Notas privadas de oficina..."
                  value={form.internal_notes}
                  onChange={e => setForm(p => ({ ...p, internal_notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* TAB 2: PASAJEROS */}
            <TabsContent value="passengers" className="space-y-4 outline-none m-0">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider">Pasajeros del Expediente</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Podés importar clientes del CRM o cargarlos de forma manual.</p>
                </div>
                <Button size="sm" onClick={openNewPassenger} className="shadow-sm">
                  <Plus className="mr-2 h-4 w-4" /> Agregar Pasajero
                </Button>
              </div>

              {passengersList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                  <User className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No cargaste ningún pasajero todavía.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                  {passengersList.map((p, idx) => (
                    <Card key={idx} className="bg-card/50 border hover:bg-card transition-all duration-200">
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className="h-9 w-9 bg-primary/10 text-primary flex items-center justify-center rounded-full shrink-0">
                          <User className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {p.dni ? `DNI: ${p.dni}` : ''} {p.passport ? ` | Pasap: ${p.passport}` : ''}
                            {!p.dni && !p.passport && 'Sin documentos registrados'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPassenger(idx)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeletePassenger(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: SERVICIOS */}
            <TabsContent value="services" className="space-y-4 outline-none m-0">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider">Servicios del Expediente</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Cargá vuelos, hoteles, traslados y otros servicios que conforman el viaje.</p>
                </div>
                <Button size="sm" onClick={openNewService} className="shadow-sm">
                  <Plus className="mr-2 h-4 w-4" /> Agregar Servicio
                </Button>
              </div>

              {servicesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No cargaste ningún servicio todavía.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {servicesList.map((s, idx) => (
                    <Card key={idx} className="bg-card/50 border hover:bg-card transition-all duration-200">
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className="h-9 w-9 bg-primary/10 text-primary flex items-center justify-center rounded-lg shrink-0">
                          {getServiceIcon(s.service_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-muted-foreground uppercase">{getServiceTypeLabel(s.service_type)}</span>
                            {s.confirmation_number && <Badge variant="outline" className="text-[10px] font-mono leading-none py-0.5">#{s.confirmation_number}</Badge>}
                          </div>
                          <p className="text-sm font-semibold text-foreground truncate mt-0.5">{s.description}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {s.supplier_name && `Proveedor: ${s.supplier_name}`}
                            {s.service_date && ` · Fecha: ${formatDateSafe(s.service_date)}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0 px-2 font-mono text-xs">
                          <p className="font-bold text-foreground">{s.currency} {Number(s.price || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-muted-foreground">Costo: {s.currency} {Number(s.cost || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditService(idx)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteService(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center w-full">
              <div>
                {activeTab === 'info' && (
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                )}
                {activeTab !== 'info' && (
                  <Button variant="outline" onClick={() => setActiveTab(activeTab === 'services' ? 'passengers' : 'info')}>
                    <ChevronLeft className="mr-1.5 h-4 w-4" /> Anterior
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {activeTab !== 'services' ? (
                  <Button onClick={() => setActiveTab(activeTab === 'info' ? 'passengers' : 'services')}>
                    Siguiente <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold shadow-md">
                    {saving ? 'Guardando expediente...' : 'Crear Expediente'}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUB-MODAL 1: PASAJERO (NUEVO/EDITAR) */}
      <Dialog open={isPassengerOpen} onOpenChange={setIsPassengerOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {editingPassengerIdx !== null ? 'Editar Pasajero' : 'Nuevo Pasajero'}
            </DialogTitle>
          </DialogHeader>

          {!editingPassengerIdx && !importPassengerMode && (
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 py-2" onClick={() => setImportPassengerMode(true)}>
              <Search className="h-4 w-4 text-muted-foreground" /> Importar desde CRM
            </Button>
          )}

          {importPassengerMode && (
            <div className="border p-3 rounded-xl bg-accent/10 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en CRM por nombre, DNI o pasaporte..."
                  value={passengerSearch}
                  onChange={e => setPassengerSearch(e.target.value)}
                  className="pl-9 h-10 bg-card"
                />
              </div>

              {passengerSearch && (
                <div className="max-h-[160px] overflow-y-auto border rounded-lg bg-card divide-y shadow-inner [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full mt-1.5">
                  {filteredCRMPassengers.length === 0 ? (
                    <p className="p-3 text-xs text-center text-muted-foreground">No se encontraron clientes.</p>
                  ) : (
                    filteredCRMPassengers.slice(0, 10).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => importPassenger(c)}
                        className="w-full text-left p-2.5 hover:bg-accent/60 transition-colors flex justify-between items-center text-sm"
                      >
                        <div>
                          <span className="font-semibold">{c.name}</span>
                          {c.dni && <span className="text-xs text-muted-foreground ml-2">(DNI: {c.dni})</span>}
                        </div>
                        <span className="text-xs text-primary font-medium flex items-center gap-0.5">
                          <Check className="h-3 w-3" /> Seleccionar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button variant="ghost" size="xs" onClick={() => setImportPassengerMode(false)}>Cancelar Importación</Button>
              </div>
            </div>
          )}

          <div className="grid gap-4 mt-2">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4 p-1 mb-4 h-auto bg-muted/60">
                <TabsTrigger value="personal" className="py-2 text-xs">Personal</TabsTrigger>
                <TabsTrigger value="documents" className="py-2 text-xs">Documentos</TabsTrigger>
                <TabsTrigger value="contact" className="py-2 text-xs">Contacto</TabsTrigger>
                <TabsTrigger value="notes" className="py-2 text-xs">Notas</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4 m-0 outline-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nombre completo *</Label>
                    <Input value={passengerForm.name} onChange={e => setPassengerForm({ ...passengerForm, name: e.target.value.toUpperCase() })} placeholder="APELLIDO NOMBRE" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sexo</Label>
                    <Select value={passengerForm.sex} onValueChange={v => setPassengerForm({ ...passengerForm, sex: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Femenino</SelectItem>
                        <SelectItem value="X">No binario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Fecha de nacimiento</Label>
                    <Input type="date" value={passengerForm.birth_date || ''} onChange={e => setPassengerForm({ ...passengerForm, birth_date: e.target.value || null })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nacionalidad</Label>
                    <Input value={passengerForm.nationality} onChange={e => setPassengerForm({ ...passengerForm, nationality: e.target.value })} placeholder="Argentina" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 m-0 outline-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>DNI</Label>
                    <Input value={passengerForm.dni} onChange={e => setPassengerForm({ ...passengerForm, dni: e.target.value.replace(/\D/g, '') })} placeholder="12345678" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vto. DNI</Label>
                    <Input type="date" value={passengerForm.dni_expiry || ''} onChange={e => setPassengerForm({ ...passengerForm, dni_expiry: e.target.value || null })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Pasaporte</Label>
                    <Input value={passengerForm.passport} onChange={e => setPassengerForm({ ...passengerForm, passport: e.target.value.toUpperCase() })} placeholder="AAA123456" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Emisión</Label>
                    <Input type="date" value={passengerForm.passport_issue || ''} onChange={e => setPassengerForm({ ...passengerForm, passport_issue: e.target.value || null })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vencimiento</Label>
                    <Input type="date" value={passengerForm.passport_expiry || ''} onChange={e => setPassengerForm({ ...passengerForm, passport_expiry: e.target.value || null })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>CUIL/CUIT</Label>
                  <Input value={passengerForm.cuil_cuit} onChange={e => setPassengerForm({ ...passengerForm, cuil_cuit: e.target.value })} placeholder="20-12345678-9" />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 m-0 outline-none">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={passengerForm.email} onChange={e => setPassengerForm({ ...passengerForm, email: e.target.value })} placeholder="ejemplo@email.com" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tel. Particular</Label>
                    <Input value={passengerForm.phone} onChange={e => setPassengerForm({ ...passengerForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tel. Comercial</Label>
                    <Input value={passengerForm.phone_work} onChange={e => setPassengerForm({ ...passengerForm, phone_work: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Celular</Label>
                    <Input value={passengerForm.phone_mobile} onChange={e => setPassengerForm({ ...passengerForm, phone_mobile: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Dirección</Label>
                    <Input value={passengerForm.address} onChange={e => setPassengerForm({ ...passengerForm, address: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Localidad</Label>
                    <Input value={passengerForm.locality} onChange={e => setPassengerForm({ ...passengerForm, locality: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4 m-0 outline-none">
                <div className="space-y-1.5">
                  <Label>Notas del Pasajero</Label>
                  <Textarea value={passengerForm.notes} onChange={e => setPassengerForm({ ...passengerForm, notes: e.target.value })} rows={4} placeholder="Datos médicos, dieta, notas de pasaporte, etc..." />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="border-t pt-3">
              <Button variant="outline" onClick={() => setIsPassengerOpen(false)}>Cancelar</Button>
              <Button onClick={handleSavePassenger}>{editingPassengerIdx !== null ? 'Guardar Cambios' : 'Agregar Pasajero'}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* SUB-MODAL 2: SERVICIO (NUEVO/EDITAR) */}
      <Dialog open={isServiceOpen} onOpenChange={setIsServiceOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {editingServiceIdx !== null ? 'Editar Servicio' : 'Nuevo Servicio'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 mt-2">
            {/* Tipo + Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de Servicio *</Label>
                <Select value={serviceForm.service_type} onValueChange={v => setServiceForm({ ...serviceForm, service_type: v as ServiceType })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado del Servicio</Label>
                <Select value={serviceForm.status} onValueChange={v => setServiceForm({ ...serviceForm, status: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label>Descripción del Servicio</Label>
              <Input
                value={serviceForm.description}
                onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                placeholder={
                  serviceForm.service_type === 'flight'    ? 'Ej: AR 1234 EZE → MAD' :
                  serviceForm.service_type === 'lodging'   ? 'Ej: Hotel Marriott Madrid' :
                  serviceForm.service_type === 'insurance' ? 'Ej: Assist Card Gold' :
                  serviceForm.service_type === 'cruise'    ? 'Ej: MSC Bellissima' :
                  'Ej: Entrada al Louvre, Transfer privado'
                }
                className="h-10"
              />
            </div>

            {/* Búsqueda de Proveedor */}
            <div className="border p-3.5 rounded-xl bg-slate-50/50 space-y-3">
              <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Proveedor / Operador del Servicio</p>
              
              {selectedSupplier ? (
                <div className="flex items-center justify-between p-2 border rounded-lg bg-card text-sm">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold">{selectedSupplier.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setSelectedSupplier(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Buscar en CRM</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar operador..."
                        value={supplierSearch}
                        onChange={e => setSupplierSearch(e.target.value)}
                        className="pl-8 h-9 text-xs bg-card"
                      />
                    </div>
                    {supplierSearch && (
                      <div className="max-h-[140px] overflow-y-auto border rounded-md bg-card divide-y mt-1 text-xs shadow-sm [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20">
                        {filteredSuppliers.length === 0 ? (
                          <p className="p-2 text-center text-muted-foreground">Sin resultados</p>
                        ) : (
                          filteredSuppliers.slice(0, 10).map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setSelectedSupplier({ id: s.id, name: s.name })}
                              className="w-full text-left p-2 hover:bg-accent/60 transition-colors flex justify-between items-center"
                            >
                              <span>{s.name}</span>
                              <span className="text-[10px] text-primary">Vincular</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Nombre Proveedor Manual</Label>
                    <Input
                      placeholder="Escribir nombre..."
                      value={supplierSearch}
                      onChange={e => setSupplierSearch(e.target.value)}
                      className="h-9 text-xs bg-card"
                      disabled={!!selectedSupplier}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-1">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">{lbl.confirmation}</Label>
                <Input
                  value={serviceForm.confirmation_number}
                  onChange={e => setServiceForm({ ...serviceForm, confirmation_number: e.target.value })}
                  placeholder="Código de confirmación / localizador"
                  className="h-9 text-xs bg-card"
                />
              </div>
            </div>

            {/* Fechas */}
            <div className={`grid gap-4 ${lbl.dateTo ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div className="space-y-1.5">
                <Label>{lbl.dateFrom}</Label>
                <Input
                  type={serviceForm.service_type === 'flight' ? 'datetime-local' : 'date'}
                  value={serviceForm.service_date || ''}
                  onChange={e => setServiceForm({ ...serviceForm, service_date: e.target.value || null })}
                  className="h-10"
                />
              </div>
              {lbl.dateTo && (
                <div className="space-y-1.5">
                  <Label>{lbl.dateTo}</Label>
                  <Input
                    type={serviceForm.service_type === 'flight' || serviceForm.service_type === 'train' || serviceForm.service_type === 'ferry' ? 'datetime-local' : 'date'}
                    value={serviceForm.end_date || ''}
                    onChange={e => setServiceForm({ ...serviceForm, end_date: e.target.value || null })}
                    className="h-10"
                  />
                </div>
              )}
            </div>

            {/* CAMPOS ESPECÍFICOS SEGÚN TIPO */}
            {serviceForm.service_type === 'flight' && (
              <div className="border border-border bg-slate-50/50 p-3 rounded-lg space-y-3 text-xs">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Detalles de Vuelo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Origen (EZE, MAD)</Label>
                    <Input value={serviceForm.origin} onChange={e => setServiceForm({ ...serviceForm, origin: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Destino</Label>
                    <Input value={serviceForm.destination} onChange={e => setServiceForm({ ...serviceForm, destination: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Aerolínea</Label>
                    <Input value={serviceForm.airline} onChange={e => setServiceForm({ ...serviceForm, airline: e.target.value.toUpperCase() })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Nro Vuelo</Label>
                    <Input value={serviceForm.flight_number} onChange={e => setServiceForm({ ...serviceForm, flight_number: e.target.value.toUpperCase() })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Hora Salida</Label>
                    <Input placeholder="Ej: 14:30" value={serviceForm.departure_time} onChange={e => setServiceForm({ ...serviceForm, departure_time: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Hora Llegada</Label>
                    <Input placeholder="Ej: 06:15" value={serviceForm.arrival_time} onChange={e => setServiceForm({ ...serviceForm, arrival_time: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Cabina / Clase</Label>
                    <Select value={serviceForm.cabin_class} onValueChange={v => setServiceForm({ ...serviceForm, cabin_class: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CLASES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Equipaje permitido</Label>
                    <Input placeholder="Ej: 1x23kg" value={serviceForm.luggage} onChange={e => setServiceForm({ ...serviceForm, luggage: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            )}

            {serviceForm.service_type === 'lodging' && (
              <div className="border border-border bg-slate-50/50 p-3 rounded-lg space-y-3 text-xs">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Detalles de Alojamiento</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Tipo de Habitación</Label>
                    <Input placeholder="Ej: Standard Doble" value={serviceForm.room_type} onChange={e => setServiceForm({ ...serviceForm, room_type: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Régimen</Label>
                    <Select value={serviceForm.regime} onValueChange={v => setServiceForm({ ...serviceForm, regime: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{REGIMENES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Categoría del hotel</Label>
                  <Input placeholder="Ej: 4 estrellas" value={serviceForm.hotel_category} onChange={e => setServiceForm({ ...serviceForm, hotel_category: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
            )}

            {serviceForm.service_type === 'rental_car' && (
              <div className="border border-border bg-slate-50/50 p-3 rounded-lg space-y-3 text-xs">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Detalles de Auto</p>
                <div className="space-y-1">
                  <Label className="text-[10px]">Compañía Rentadora</Label>
                  <Input placeholder="Ej: Hertz" value={serviceForm.company} onChange={e => setServiceForm({ ...serviceForm, company: e.target.value })} className="h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Lugar de Retiro</Label>
                    <Input value={serviceForm.pickup_location} onChange={e => setServiceForm({ ...serviceForm, pickup_location: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Lugar de Devolución</Label>
                    <Input value={serviceForm.dropoff_location} onChange={e => setServiceForm({ ...serviceForm, dropoff_location: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Categoría / Modelo de Auto</Label>
                  <Input placeholder="Ej: SUV Económico" value={serviceForm.room_type} onChange={e => setServiceForm({ ...serviceForm, room_type: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
            )}

            {serviceForm.service_type === 'insurance' && (
              <div className="border border-border bg-slate-50/50 p-3 rounded-lg space-y-3 text-xs">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Detalles de Asistencia / Seguro</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Plan de Seguro</Label>
                    <Input placeholder="Ej: Gold 150k" value={serviceForm.insurance_plan} onChange={e => setServiceForm({ ...serviceForm, insurance_plan: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Cobertura</Label>
                    <Input placeholder="Ej: USD 150.000" value={serviceForm.coverage} onChange={e => setServiceForm({ ...serviceForm, coverage: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            )}

            {serviceForm.service_type === 'cruise' && (
              <div className="border border-border bg-slate-50/50 p-3 rounded-lg space-y-3 text-xs">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Detalles de Crucero</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Nombre del Barco</Label>
                    <Input value={serviceForm.ship_name} onChange={e => setServiceForm({ ...serviceForm, ship_name: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Naviera / Compañía</Label>
                    <Input value={serviceForm.company} onChange={e => setServiceForm({ ...serviceForm, company: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Nro Cabina</Label>
                    <Input value={serviceForm.cabin_number} onChange={e => setServiceForm({ ...serviceForm, cabin_number: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Cubierta (Deck)</Label>
                    <Input value={serviceForm.deck} onChange={e => setServiceForm({ ...serviceForm, deck: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Puerto de Embarque</Label>
                    <Input value={serviceForm.embarkation_port} onChange={e => setServiceForm({ ...serviceForm, embarkation_port: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Puerto de Desembarque</Label>
                    <Input value={serviceForm.disembarkation_port} onChange={e => setServiceForm({ ...serviceForm, disembarkation_port: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            )}

            {(serviceForm.service_type === 'train' || serviceForm.service_type === 'ferry') && (
              <div className="border border-border bg-slate-50/50 p-3 rounded-lg space-y-3 text-xs">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Detalles de {serviceForm.service_type === 'train' ? 'Tren' : 'Ferry'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Compañía Operadora</Label>
                    <Input value={serviceForm.company} onChange={e => setServiceForm({ ...serviceForm, company: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">{serviceForm.service_type === 'train' ? 'Nro Tren' : 'Nombre Barco'}</Label>
                    <Input value={serviceForm.ship_name} onChange={e => setServiceForm({ ...serviceForm, ship_name: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Origen</Label>
                    <Input value={serviceForm.origin} onChange={e => setServiceForm({ ...serviceForm, origin: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Destino</Label>
                    <Input value={serviceForm.destination} onChange={e => setServiceForm({ ...serviceForm, destination: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Clase</Label>
                    <Input placeholder="Ej: Standard" value={serviceForm.cabin_class} onChange={e => setServiceForm({ ...serviceForm, cabin_class: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Nro Asiento / Cabina</Label>
                    <Input value={serviceForm.cabin_number} onChange={e => setServiceForm({ ...serviceForm, cabin_number: e.target.value })} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* Vencimiento de pago */}
            <div className="space-y-1.5">
              <Label>Vencimiento de Pago Proveedor</Label>
              <Input
                type="date"
                value={serviceForm.payment_due_date || ''}
                onChange={e => setServiceForm({ ...serviceForm, payment_due_date: e.target.value || null })}
                className="h-10"
              />
            </div>

            {/* Moneda + Costo + Precio */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select value={serviceForm.currency} onValueChange={v => setServiceForm({ ...serviceForm, currency: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Costo Neto</Label>
                <Input
                  type="number"
                  min="0"
                  value={serviceForm.cost}
                  onChange={e => setServiceForm({ ...serviceForm, cost: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Precio Venta</Label>
                <Input
                  type="number"
                  min="0"
                  value={serviceForm.price}
                  onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label>Notas del Servicio</Label>
              <Textarea
                value={serviceForm.notes}
                onChange={e => setServiceForm({ ...serviceForm, notes: e.target.value })}
                rows={2}
                placeholder="Detalles adicionales, número de confirmación alternativo, etc..."
              />
            </div>

            <DialogFooter className="border-t pt-3">
              <Button variant="outline" onClick={() => setIsServiceOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveService}>{editingServiceIdx !== null ? 'Guardar Cambios' : 'Agregar Servicio'}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
