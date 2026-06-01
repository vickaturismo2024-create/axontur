import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Mail, Copy, Plane, Hotel, Bus, Anchor, Umbrella, Car, Train, Ship, Activity, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { sendSupplierVoucher, isInfraReady } from '@/lib/emailService';
import { toast } from 'sonner';

interface Props {
  fileId: string;
  clientName: string;
}

interface ServiceRecord {
  id: string;
  service_type: string;
  description: string;
  supplier_name: string | null;
  supplier_id: string | null;
  confirmation_number: string | null;
  service_date: string | null;
  end_date: string | null;
  status: string;
}

const SERVICE_TYPES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  flight:     { label: 'Vuelo',        icon: Plane,    color: 'text-sky-500 bg-sky-500/10' },
  lodging:    { label: 'Alojamiento',  icon: Hotel,    color: 'text-amber-500 bg-amber-500/10' },
  transfer:   { label: 'Traslado',     icon: Bus,      color: 'text-indigo-500 bg-indigo-500/10' },
  activity:   { label: 'Actividad',    icon: Activity, color: 'text-pink-500 bg-pink-500/10' },
  insurance:  { label: 'Seguro',       icon: Umbrella, color: 'text-teal-500 bg-teal-500/10' },
  cruise:     { label: 'Crucero',      icon: Ship,     color: 'text-blue-500 bg-blue-500/10' },
  train:      { label: 'Tren',         icon: Train,    color: 'text-purple-500 bg-purple-500/10' },
  rental_car: { label: 'Auto',         icon: Car,      color: 'text-emerald-500 bg-emerald-500/10' },
  ferry:      { label: 'Ferry',        icon: Anchor,   color: 'text-cyan-500 bg-cyan-500/10' },
  other:      { label: 'Otro',         icon: Activity, color: 'text-gray-500 bg-gray-500/10' },
};

export function FileVouchersTab({ fileId, clientName }: Props) {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('file_services')
      .select('id, service_type, description, supplier_name, supplier_id, confirmation_number, service_date, end_date, status')
      .eq('file_id', fileId)
      .neq('status', 'cancelled')
      .order('service_date');
    setServices((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [fileId]);

  const handleCopy = (s: ServiceRecord) => {
    const text = `Servicio: ${s.description}\nProveedor: ${s.supplier_name || 'Sin especificar'}\nCódigo Confirmación: ${s.confirmation_number || 'N/D'}\nFecha: ${s.service_date ? new Date(s.service_date).toLocaleDateString('es-AR') : 'N/D'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(s.id);
    toast.success('Detalles del voucher copiados');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEmailVoucher = async (s: ServiceRecord) => {
    if (!user) return;
    
    // Resolve supplier email
    let supplierEmail = '';
    if (s.supplier_id) {
      const { data: sup } = await supabase
        .from('suppliers')
        .select('email')
        .eq('id', s.supplier_id)
        .maybeSingle();
      supplierEmail = sup?.email || '';
    }

    if (!supplierEmail) {
      const inputEmail = window.prompt(`Ingrese el email del operador (${s.supplier_name || 'Proveedor'}):`);
      if (!inputEmail) return;
      supplierEmail = inputEmail;
    }

    setSendingEmailId(s.id);
    const infra = await isInfraReady();
    if (!infra.domainReady) {
      const ok = window.confirm('El dominio de email aún no está verificado. ¿Enviar igual?');
      if (!ok) {
        setSendingEmailId(null);
        return;
      }
    }

    const { data: fData } = await supabase.from('files').select('file_number').eq('id', fileId).single();
    const fileLabel = `FILE-${String(fData?.file_number || 1).padStart(3, '0')}`;

    const result = await sendSupplierVoucher({
      to: supplierEmail,
      userId: user.id,
      fileId: fileId,
      data: {
        supplierName: s.supplier_name || 'Proveedor',
        fileNumber: fileLabel,
        serviceDescription: s.description,
        serviceDate: s.service_date ?? undefined,
        passengerNames: [clientName],
        confirmationNumber: s.confirmation_number ?? undefined,
      },
    });

    setSendingEmailId(null);
    if (result.success) {
      toast.success('Voucher enviado por email al operador');
    } else {
      toast.error(result.error || 'No se pudo enviar el voucher');
    }
  };

  const getIcon = (type: string) => {
    const info = SERVICE_TYPES[type] || SERVICE_TYPES.other;
    const Icon = info.icon;
    return (
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${info.color}`}>
        <Icon className="h-5 w-5" />
      </div>
    );
  };

  const getTypeLabel = (type: string) => {
    return SERVICE_TYPES[type]?.label || 'Servicio';
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando vouchers...</div>;

  return (
    <div className="space-y-4 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Vouchers del Viaje</h3>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm">No hay servicios con vouchers disponibles</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Agregá servicios al expediente para poder emitir sus vouchers correspondientes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <Card key={s.id} className="overflow-hidden relative group">
              <CardContent className="p-4 flex gap-3.5">
                {getIcon(s.service_type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-foreground truncate">{s.description}</p>
                    <Badge variant={s.confirmation_number ? 'default' : 'secondary'} className="text-[10px] uppercase font-mono">
                      {s.confirmation_number ? 'Confirmado' : 'Sin código'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Operador: <span className="font-medium text-foreground">{s.supplier_name || 'N/D'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Fecha: <span className="font-medium text-foreground">
                      {s.service_date ? new Date(s.service_date).toLocaleDateString('es-AR') : 'N/D'}
                      {s.end_date && ` → ${new Date(s.end_date).toLocaleDateString('es-AR')}`}
                    </span>
                  </p>
                  {s.confirmation_number && (
                    <div className="mt-3 bg-muted/50 rounded p-2 text-xs font-mono flex items-center justify-between text-muted-foreground">
                      <span>Cód: <span className="text-foreground font-semibold font-mono">{s.confirmation_number}</span></span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(s)}
                      >
                        {copiedId === s.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs gap-1.5 h-8"
                      onClick={() => handleEmailVoucher(s)}
                      disabled={sendingEmailId === s.id}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {sendingEmailId === s.id ? 'Enviando...' : 'Enviar Email'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
