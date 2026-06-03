import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { generateReceiptPDF } from '@/components/files/receiptPdfUtils';
import { sendReceiptEmail, isInfraReady } from '@/lib/emailService';

// Import newly extracted components
import { Receipt, ReceiptItem, METHODS, STATUS_LABELS } from './receipts/types';
import { ReceiptCard } from './receipts/ReceiptCard';
import { NewReceiptDialog } from './receipts/NewReceiptDialog';
import { ReceiptDetailDialog } from './receipts/ReceiptDetailDialog';
import { EmailReceiptDialog } from './receipts/EmailReceiptDialog';

interface Props {
  fileId: string;
  clientName: string;
  currency: string;
  clientId?: string | null;
}

export function FileReceiptsTab({ fileId, clientName, currency, clientId }: Props) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  
  // Email states
  const [emailReceipt, setEmailReceipt] = useState<Receipt | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailIncludeBreakdown, setEmailIncludeBreakdown] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  
  // Detail states
  const [detailReceipt, setDetailReceipt] = useState<Receipt | null>(null);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('file_receipts')
      .select('*')
      .eq('file_id', fileId)
      .order('receipt_number', { ascending: false });
    setReceipts((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [fileId]);

  const handleSaveReceipt = async (form: any, items: ReceiptItem[], totalAmount: number) => {
    if (!user) return;
    if (items.every((it) => it.amount <= 0)) {
      toast.error('Al menos una línea debe tener monto > 0');
      return;
    }
    if (!form.concept.trim()) {
      toast.error('Ingresá un concepto');
      return;
    }

    const mainCurrency = items[0].currency;
    const mainMethod = items[0].payment_method;

    const { data: nextNum } = await supabase.rpc('next_receipt_number' as any, { p_user_id: user.id });
    const receiptNumber = (nextNum as number) || 1;

    const { data: receiptData, error } = await supabase
      .from('file_receipts')
      .insert({
        file_id: fileId,
        user_id: user.id,
        receipt_number: receiptNumber,
        client_name: form.client_name,
        amount: totalAmount,
        currency: mainCurrency,
        payment_method: mainMethod,
        payment_date: form.payment_date,
        concept: form.concept,
        notes: form.notes,
        status: 'issued',
      } as any)
      .select()
      .single();

    if (error || !receiptData) {
      toast.error('Error al crear recibo');
      return;
    }

    const receiptId = (receiptData as any).id;
    const itemsToInsert = items
      .filter((it) => it.amount > 0)
      .map((it) => ({
        receipt_id: receiptId,
        user_id: user.id,
        amount: it.amount,
        currency: it.currency,
        payment_method: it.payment_method,
        exchange_rate: it.exchange_rate,
        service_currency: it.service_currency,
        notes: it.notes,
      }));

    if (itemsToInsert.length > 0) {
      await supabase.from('file_receipt_items').insert(itemsToInsert as any);
    }

    if (clientId) {
      const movements = items
        .filter((i) => i.amount > 0)
        .map((it) => ({
          user_id: user.id,
          account_type: 'client',
          account_id: clientId,
          file_id: fileId,
          receipt_id: receiptId,
          movement_type: 'credit',
          amount: it.amount,
          currency: it.currency,
          concept: `Recibo REC-${String(receiptNumber).padStart(4, '0')}: ${form.concept}`,
          reference: `REC-${String(receiptNumber).padStart(4, '0')}`,
          movement_date: form.payment_date,
        }));
      if (movements.length > 0) {
        await supabase.from('account_movements').insert(movements as any);
      }
    }

    toast.success(`Recibo REC-${String(receiptNumber).padStart(4, '0')} generado`);
    setDialogOpen(false);
    load();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('file_receipts')
      .update({ status: newStatus } as any)
      .eq('id', id);
    if (error) {
      toast.error('Error al actualizar estado');
      return;
    }
    toast.success(`Estado actualizado a ${STATUS_LABELS[newStatus]}`);
    load();
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    await handleStatusChange(cancelId, 'cancelled');
    setCancelId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('file_receipt_items').delete().eq('receipt_id', deleteId);
    await supabase.from('account_movements').delete().eq('receipt_id', deleteId);
    await supabase.from('file_receipts').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Recibo eliminado');
    load();
  };

  const downloadReceipt = async (r: Receipt) => {
    let agency = {
      name: '',
      phone: '',
      address: '',
      cuit: '',
      email: '',
      logo_url: '',
      receipt_header_layout: 'classic',
      receipt_primary_color: '#1E3A5F',
      receipt_accent_color: '#BA7EF2'
    };
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        agency = {
          name: (data as any).agency_name || '',
          phone: (data as any).phone || '',
          address: (data as any).address || '',
          cuit: (data as any).cuit || '',
          email: (data as any).email || '',
          logo_url: (data as any).logo_url || '',
          receipt_header_layout: (data as any).receipt_header_layout || 'classic',
          receipt_primary_color: (data as any).receipt_primary_color || '#1E3A5F',
          receipt_accent_color: (data as any).receipt_accent_color || '#BA7EF2',
        };
      }
    }

    // Fetch client address & locality and file number for receipt header details
    let extraDetails = { address: '', locality: '', file_number: undefined as number | undefined };
    if (clientId) {
      const { data: cli } = await supabase.from('clients').select('address, locality').eq('id', clientId).maybeSingle();
      if (cli) {
        extraDetails.address = cli.address || '';
        extraDetails.locality = cli.locality || '';
      }
    }

    const { data: fil } = await supabase.from('files').select('file_number').eq('id', fileId).maybeSingle();
    if (fil) {
      extraDetails.file_number = fil.file_number;
    }

    const { data: items } = await supabase
      .from('file_receipt_items')
      .select('*')
      .eq('receipt_id', r.id);
    await generateReceiptPDF(r as any, agency, (items as any[]) || [], extraDetails);
  };

  const openDetail = async (r: Receipt) => {
    setDetailReceipt(r);
    setDetailLoading(true);
    const { data } = await supabase
      .from('file_receipt_items')
      .select('*')
      .eq('receipt_id', r.id)
      .order('created_at', { ascending: true });
    setDetailItems((data as any[]) || []);
    setDetailLoading(false);
  };

  const openEmailDialog = async (r: Receipt) => {
    setEmailReceipt(r);
    setEmailIncludeBreakdown(true);
    if (clientId) {
      const { data } = await supabase.from('clients').select('email').eq('id', clientId).maybeSingle();
      setEmailTo((data as any)?.email || '');
    } else {
      setEmailTo('');
    }
  };

  const handleSendEmail = async () => {
    if (!emailReceipt || !user || !emailTo.trim()) {
      toast.error('Ingresá un email destinatario');
      return;
    }
    setEmailSending(true);
    try {
      const infra = await isInfraReady();
      if (!infra.domainReady) {
        const ok = window.confirm(
          'El dominio de email todavía no está verificado o presenta errores recientes. El recibo puede no llegar al destinatario. ¿Querés enviarlo igual?',
        );
        if (!ok) {
          setEmailSending(false);
          return;
        }
      } else if (!infra.queueHealthy) {
        toast.warning('La cola de envíos tiene errores recientes — el envío puede demorar.');
      }

      const { data: itemsData } = await supabase
        .from('file_receipt_items')
        .select('*')
        .eq('receipt_id', emailReceipt.id);
      const items = ((itemsData as any[]) || []).map((it) => ({
        amount: Number(it.amount),
        currency: it.currency,
        method: it.payment_method || 'other',
        notes: it.notes || '',
      }));

      const result = await sendReceiptEmail({
        to: emailTo.trim(),
        userId: user.id,
        fileId,
        receiptId: emailReceipt.id,
        data: {
          clientName: emailReceipt.client_name,
          receiptNumber: `REC-${String(emailReceipt.receipt_number).padStart(4, '0')}`,
          amount: emailReceipt.amount,
          currency: emailReceipt.currency,
          paymentDate: emailReceipt.payment_date,
          concept: emailReceipt.concept,
          paymentMethod: emailReceipt.payment_method,
          notes: emailReceipt.notes,
          includeBreakdown: emailIncludeBreakdown,
          items,
        },
      });

      if (result.success) {
        toast.success('Email enviado');
        setEmailReceipt(null);
      } else {
        toast.error(`Error al enviar: ${result.error || 'desconocido'}`);
      }
    } finally {
      setEmailSending(false);
    }
  };

  const getMethodLabel = (v: string) => METHODS.find((m) => m.value === v)?.label || v;

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando recibos...</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Recibos ({receipts.length})</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Nuevo recibo
        </Button>
      </div>

      {receipts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No hay recibos emitidos</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {receipts.map((r) => (
            <ReceiptCard
              key={r.id}
              receipt={r}
              getMethodLabel={getMethodLabel}
              onOpenDetail={openDetail}
              onDownload={downloadReceipt}
              onOpenEmail={openEmailDialog}
              onChangeStatus={handleStatusChange}
              onCancel={setCancelId}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <NewReceiptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveReceipt}
        defaultClientName={clientName}
        defaultCurrency={currency}
      />

      <ReceiptDetailDialog
        receipt={detailReceipt}
        items={detailItems}
        loading={detailLoading}
        onOpenChange={(o) => !o && setDetailReceipt(null)}
        getMethodLabel={getMethodLabel}
      />

      <EmailReceiptDialog
        receipt={emailReceipt}
        emailTo={emailTo}
        setEmailTo={setEmailTo}
        emailIncludeBreakdown={emailIncludeBreakdown}
        setEmailIncludeBreakdown={setEmailIncludeBreakdown}
        emailSending={emailSending}
        onSend={handleSendEmail}
        onOpenChange={(o) => !o && setEmailReceipt(null)}
      />

      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular recibo?</AlertDialogTitle>
            <AlertDialogDescription>
              El recibo quedará marcado como ANULADO con marca de agua en el PDF y no se contará en el cobrado del expediente.
              Los movimientos en cuenta corriente NO se eliminan automáticamente; podés borrarlos manualmente si corresponde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recibo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también las líneas y los movimientos de cuenta corriente vinculados a este recibo. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
