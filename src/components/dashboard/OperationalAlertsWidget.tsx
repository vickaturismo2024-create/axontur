import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CollapsibleWidget } from '@/components/dashboard/CollapsibleWidget';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, ShieldAlert, FileText, Receipt, ChevronRight } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { getDocStatus } from '@/components/clients/DocumentAlertBadge';

interface AlertItem {
  id: string;
  kind: 'service_due' | 'doc_expiring' | 'file_to_close' | 'receipt_draft';
  label: string;
  detail: string;
  severity: 'warning' | 'destructive';
  href: string;
}

export function OperationalAlertsWidget({ defaultOpen, raw }: { defaultOpen?: boolean; raw?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: alerts, isLoading } = useQuery<AlertItem[]>({
    queryKey: ['operational-alerts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const items: AlertItem[] = [];
      const today = new Date();
      const todayIso = today.toISOString().split('T')[0];

      // 1) Servicios con payment_due_date vencido o en <3 días
      const in3 = new Date();
      in3.setDate(in3.getDate() + 3);
      const { data: services } = await supabase
        .from('file_services')
        .select('id, description, payment_due_date, file_id, supplier_name, status')
        .not('payment_due_date', 'is', null)
        .neq('status', 'paid')
        .lte('payment_due_date', in3.toISOString().split('T')[0]);
      (services || []).forEach((s: any) => {
        const dueDate = parseISO(s.payment_due_date);
        const days = differenceInDays(dueDate, today);
        items.push({
          id: `svc-${s.id}`,
          kind: 'service_due',
          label: days < 0 ? `Pago vencido hace ${Math.abs(days)}d` : days === 0 ? 'Pago vence hoy' : `Pago vence en ${days}d`,
          detail: `${s.description || 'Servicio'} · ${s.supplier_name || 'Operador'}`,
          severity: days < 0 ? 'destructive' : 'warning',
          href: `/files/${s.file_id}`,
        });
      });

      // 2) Documentos próximos a vencer (DNI/Pasaporte <6 meses)
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name, dni_expiry, passport_expiry')
          .range(from, from + PAGE - 1);
        if (!clients || clients.length === 0) break;
        clients.forEach((c: any) => {
          const dni = getDocStatus(c.dni_expiry);
          const pas = getDocStatus(c.passport_expiry);
          if (dni === 'expired' || dni === 'expiring') {
            items.push({
              id: `dni-${c.id}`,
              kind: 'doc_expiring',
              label: dni === 'expired' ? 'DNI vencido' : 'DNI por vencer',
              detail: c.name,
              severity: dni === 'expired' ? 'destructive' : 'warning',
              href: `/clients/${c.id}`,
            });
          }
          if (pas === 'expired' || pas === 'expiring') {
            items.push({
              id: `pas-${c.id}`,
              kind: 'doc_expiring',
              label: pas === 'expired' ? 'Pasaporte vencido' : 'Pasaporte por vencer',
              detail: c.name,
              severity: pas === 'expired' ? 'destructive' : 'warning',
              href: `/clients/${c.id}`,
            });
          }
        });
        if (clients.length < PAGE) break;
        from += PAGE;
      }

      // 3) Expedientes con end_date < hoy y no marcados como completed/cancelled
      const { data: files } = await supabase
        .from('files')
        .select('id, file_number, client_name, end_date, status')
        .lt('end_date', todayIso)
        .in('status', ['confirmed', 'in_progress']);
      (files || []).forEach((f: any) => {
        items.push({
          id: `file-${f.id}`,
          kind: 'file_to_close',
          label: 'Marcar como completado',
          detail: `FILE-${String(f.file_number).padStart(3, '0')} · ${f.client_name}`,
          severity: 'warning',
          href: `/files/${f.id}`,
        });
      });

      // 4) Recibos en draft con más de 7 días
      const sevenAgo = new Date();
      sevenAgo.setDate(sevenAgo.getDate() - 7);
      const { data: receipts } = await supabase
        .from('file_receipts')
        .select('id, receipt_number, client_name, file_id, created_at, status')
        .eq('status', 'draft')
        .lt('created_at', sevenAgo.toISOString());
      (receipts || []).forEach((r: any) => {
        items.push({
          id: `rec-${r.id}`,
          kind: 'receipt_draft',
          label: 'Recibo en borrador hace +7d',
          detail: `REC-${String(r.receipt_number).padStart(4, '0')} · ${r.client_name}`,
          severity: 'warning',
          href: `/files/${r.file_id}`,
        });
      });

      // 5) Presupuestos aprobados recientemente (últimos 7 días)
      const { data: approvedQuotes } = await supabase
        .from('quotes')
        .select('id, client, trip, approved_at')
        .eq('status', 'approved')
        .gte('approved_at', sevenAgo.toISOString());
      (approvedQuotes || []).forEach((q: any) => {
        const clientName = (q.client as any)?.name || 'Cliente';
        const destination = (q.trip as any)?.destination || 'Sin destino';
        items.push({
          id: `quote-${q.id}`,
          kind: 'quote_approved',
          label: 'Presupuesto aprobado',
          detail: `${clientName} · ${destination}`,
          severity: 'warning',
          href: `/quote/${q.id}`,
        });
      });

      return items;
    },
    enabled: !!user,
  });

  const grouped = {
    service_due: (alerts || []).filter(a => a.kind === 'service_due'),
    doc_expiring: (alerts || []).filter(a => a.kind === 'doc_expiring'),
    file_to_close: (alerts || []).filter(a => a.kind === 'file_to_close'),
    receipt_draft: (alerts || []).filter(a => a.kind === 'receipt_draft'),
    quote_approved: (alerts || []).filter(a => a.kind === 'quote_approved'),
  };

  const total = alerts?.length || 0;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2.5">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      );
    }

    if (total === 0) {
      return (
        <div className="py-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">✓ No hay alertas operativas pendientes</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {grouped.service_due.length > 0 && (
          <Section icon={<Clock className="h-3.5 w-3.5 text-amber-500" />} title="Pagos a operadores" items={grouped.service_due} navigate={navigate} />
        )}
        {grouped.doc_expiring.length > 0 && (
          <Section icon={<ShieldAlert className="h-3.5 w-3.5 text-destructive" />} title="Documentos vencidos o por vencer" items={grouped.doc_expiring} navigate={navigate} />
        )}
        {grouped.file_to_close.length > 0 && (
          <Section icon={<FileText className="h-3.5 w-3.5 text-amber-500" />} title="Expedientes a cerrar" items={grouped.file_to_close} navigate={navigate} />
        )}
        {grouped.receipt_draft.length > 0 && (
          <Section icon={<Receipt className="h-3.5 w-3.5 text-amber-500" />} title="Recibos en borrador" items={grouped.receipt_draft} navigate={navigate} />
        )}
        {grouped.quote_approved.length > 0 && (
          <Section icon={<FileText className="h-3.5 w-3.5 text-emerald-500" />} title="Presupuestos aprobados" items={grouped.quote_approved} navigate={navigate} />
        )}
      </div>
    );
  };

  if (raw) {
    return renderContent();
  }

  return (
    <CollapsibleWidget
      widgetKey="operational-alerts"
      icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
      title="Alertas operativas"
      count={total}
      badgeVariant={
        (alerts || []).some(a => a.severity === 'destructive') ? 'destructive' : 'warning'
      }
      defaultOpen={defaultOpen}
    >
      {renderContent()}
    </CollapsibleWidget>
  );
}

function Section({ icon, title, items, navigate }: {
  icon: React.ReactNode;
  title: string;
  items: AlertItem[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [visibleCount, setVisibleCount] = useState(5);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {icon}
        <span>{title}</span>
        <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px]">{items.length}</span>
      </div>

      <div className="space-y-2">
        {items.slice(0, visibleCount).map(a => {
          const isDestructive = a.severity === 'destructive';
          const isApproved = a.kind === 'quote_approved';
          
          return (
            <button
              key={a.id}
              onClick={() => navigate(a.href)}
              className={`group flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left hover:scale-[1.01] hover:shadow-sm transition-all duration-300 bg-background/50 ${
                isDestructive 
                  ? 'border-l-4 border-l-destructive border-border/60 hover:border-destructive/30 hover:bg-destructive/[0.02]' 
                  : isApproved 
                  ? 'border-l-4 border-l-emerald-500 border-border/60 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02]'
                  : 'border-l-4 border-l-amber-500 border-border/60 hover:border-amber-500/30 hover:bg-amber-500/[0.02]'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={isDestructive ? 'destructive' : isApproved ? 'secondary' : 'outline'} 
                    className={`text-[9px] font-bold px-1.5 h-4.5 ${
                      isApproved 
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0' 
                        : !isDestructive 
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0'
                        : ''
                    }`}
                  >
                    {a.label}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs font-semibold text-foreground truncate group-hover:text-primary dark:group-hover:text-gold transition-colors">
                  {a.detail}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })}
        {items.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(prev => prev + 5)}
            className="w-full text-center text-[10px] font-bold text-primary hover:text-primary/80 dark:text-gold dark:hover:text-gold/80 pt-2 pb-2 block bg-muted/10 hover:bg-muted/30 rounded-lg border border-dashed border-border/50 transition-colors"
          >
            + Ver {Math.min(5, items.length - visibleCount)} alertas más (quedan {items.length - visibleCount})
          </button>
        )}
      </div>
    </div>
  );
}
