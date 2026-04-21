import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function OperationalAlertsWidget() {
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
              href: `/clients?highlight=${encodeURIComponent(c.name)}`,
            });
          }
          if (pas === 'expired' || pas === 'expiring') {
            items.push({
              id: `pas-${c.id}`,
              kind: 'doc_expiring',
              label: pas === 'expired' ? 'Pasaporte vencido' : 'Pasaporte por vencer',
              detail: c.name,
              severity: pas === 'expired' ? 'destructive' : 'warning',
              href: `/clients?highlight=${encodeURIComponent(c.name)}`,
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

      return items;
    },
    enabled: !!user,
  });

  const grouped = {
    service_due: (alerts || []).filter(a => a.kind === 'service_due'),
    doc_expiring: (alerts || []).filter(a => a.kind === 'doc_expiring'),
    file_to_close: (alerts || []).filter(a => a.kind === 'file_to_close'),
    receipt_draft: (alerts || []).filter(a => a.kind === 'receipt_draft'),
  };

  const total = alerts?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Alertas operativas
          {total > 0 && <Badge variant="secondary">{total}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            ✓ No hay alertas pendientes
          </p>
        ) : (
          <div className="space-y-3">
            {grouped.service_due.length > 0 && (
              <Section icon={<Clock className="h-4 w-4" />} title="Pagos a operadores" items={grouped.service_due} navigate={navigate} />
            )}
            {grouped.doc_expiring.length > 0 && (
              <Section icon={<ShieldAlert className="h-4 w-4" />} title="Documentos" items={grouped.doc_expiring} navigate={navigate} />
            )}
            {grouped.file_to_close.length > 0 && (
              <Section icon={<FileText className="h-4 w-4" />} title="Expedientes a cerrar" items={grouped.file_to_close} navigate={navigate} />
            )}
            {grouped.receipt_draft.length > 0 && (
              <Section icon={<Receipt className="h-4 w-4" />} title="Recibos en borrador" items={grouped.receipt_draft} navigate={navigate} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ icon, title, items, navigate }: {
  icon: React.ReactNode;
  title: string;
  items: AlertItem[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {icon} {title} ({items.length})
      </div>
      <div className="space-y-1">
        {items.slice(0, 5).map(a => (
          <button
            key={a.id}
            onClick={() => navigate(a.href)}
            className="group flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm hover:bg-accent"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant={a.severity === 'destructive' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {a.label}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.detail}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
          </button>
        ))}
        {items.length > 5 && (
          <p className="pl-2 text-xs text-muted-foreground">+ {items.length - 5} más</p>
        )}
      </div>
    </div>
  );
}
