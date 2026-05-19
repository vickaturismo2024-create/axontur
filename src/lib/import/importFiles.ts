import { supabase } from '@/integrations/supabase/client';
import { ParsedLegacyReservation, buildLegacyNotes } from '@/lib/reservationExcelParser';

const LEGACY_NOTE_PREFIX = 'Importado del sistema antiguo';

const detectCurrency = (r: ParsedLegacyReservation): string => {
  if (r.totals.saleUsd > 0 || r.totals.costUsd > 0) return 'USD';
  if (r.totals.saleArs > 0 || r.totals.costArs > 0) return 'ARS';
  return 'USD';
};

export interface FileImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function insertFiles(
  reservations: ParsedLegacyReservation[],
  userId: string,
  agencyId: string | null,
  onProgress: (current: number, total: number) => void
): Promise<FileImportResult> {
  const result: FileImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  if (!agencyId) {
    result.errors.push('No se pudo determinar la agencia del usuario.');
    return result;
  }

  // Cargar clientes para matchear
  const clients: { id: string; name: string }[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('agency_id', agencyId)
      .range(from, from + PAGE - 1);
    const batch = data || [];
    clients.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const byName = new Map<string, { id: string; name: string }>();
  for (const c of clients) {
    const n = norm(c.name || '');
    if (n && !byName.has(n)) byName.set(n, c);
    const first = n.split(' ')[0];
    if (first && !byName.has(first)) byName.set(first, c);
  }

  for (let i = 0; i < reservations.length; i++) {
    const r = reservations[i];
    try {
      const currency = detectCurrency(r);
      const totalPrice = currency === 'USD' ? r.totals.saleUsd : r.totals.saleArs;
      const totalCost = currency === 'USD' ? r.totals.costUsd : r.totals.costArs;
      const fullName = (r.clientLastName + ' ' + r.clientFirstName).trim();
      const clientName = fullName || 'Sin cliente';
      const notes = buildLegacyNotes(r);
      const opDate = r.travelDate || r.openDate || new Date().toISOString().slice(0, 10);
      
      const match = byName.get(norm(fullName)) || byName.get(norm(r.clientLastName)) || null;
      const matchedClientId = match?.id || null;

      const { data: existing } = await supabase
        .from('files')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('legacy_id', r.legacyId)
        .maybeSingle();

      let fileId: string;

      if (existing?.id) {
        await supabase.from('files').update({
          client_name: clientName,
          client_id: matchedClientId,
          destination: r.destination || '',
          start_date: r.travelDate,
          travelers: r.numPax,
          currency,
          total_price: totalPrice,
          total_cost: totalCost,
          internal_notes: notes,
        }).eq('id', existing.id);
        fileId = existing.id;
        
        // Clean up legacy financials
        await supabase.from('file_services').delete().eq('file_id', fileId);
        
        const { data: oldReceipts } = await supabase.from('file_receipts').select('id').eq('file_id', fileId).like('notes', `${LEGACY_NOTE_PREFIX}%`);
        const oldReceiptIds = (oldReceipts || []).map(rcpt => rcpt.id);
        if (oldReceiptIds.length) {
          await supabase.from('file_receipt_items').delete().in('receipt_id', oldReceiptIds);
          await supabase.from('file_receipts').delete().in('id', oldReceiptIds);
        }
        await supabase.from('file_supplier_payments').delete().eq('file_id', fileId).like('notes', `${LEGACY_NOTE_PREFIX}%`);
        await supabase.from('account_movements').delete().eq('file_id', fileId).like('notes', `${LEGACY_NOTE_PREFIX}%`);
        
      } else {
        const { data: created, error } = await supabase.from('files').insert({
          user_id: userId,
          agency_id: agencyId,
          legacy_id: parseInt(r.legacyId, 10) || null,
          client_name: clientName,
          client_id: matchedClientId,
          destination: r.destination || '',
          start_date: r.travelDate,
          travelers: r.numPax,
          currency,
          total_price: totalPrice,
          total_cost: totalCost,
          internal_notes: notes,
          status: 'confirmed',
        }).select('id').single();
        if (error || !created) throw error || new Error('No se pudo crear el expediente');
        fileId = created.id;
      }

      // Services
      const servicesToInsert = r.services.filter(s => s.operatorName || s.saleArs || s.costArs || s.saleUsd || s.costUsd).map(s => {
        const svcCurrency = s.saleUsd > 0 || s.costUsd > 0 ? 'USD' : 'ARS';
        return {
          user_id: userId,
          agency_id: agencyId,
          file_id: fileId,
          service_type: 'other',
          description: s.operatorName || 'Servicio',
          supplier_name: s.operatorName || '',
          currency: svcCurrency,
          price: svcCurrency === 'USD' ? s.saleUsd : s.saleArs,
          cost: svcCurrency === 'USD' ? s.costUsd : s.costArs,
          status: 'confirmed' as const,
        };
      });
      if (servicesToInsert.length) await supabase.from('file_services').insert(servicesToInsert);

      // Receipts
      const receiptsArs = r.services.reduce((a, s) => a + s.receivedArs, 0);
      const receiptsUsd = r.services.reduce((a, s) => a + s.receivedUsd, 0);
      const items: { currency: 'ARS' | 'USD'; amount: number }[] = [];
      if (receiptsArs > 0) items.push({ currency: 'ARS', amount: receiptsArs });
      if (receiptsUsd > 0) items.push({ currency: 'USD', amount: receiptsUsd });

      if (items.length) {
        const headerCurrency = items.find(it => it.currency === currency)?.currency || items[0].currency;
        const headerAmount = items.find(it => it.currency === headerCurrency)!.amount;
        const { data: receipt } = await supabase.from('file_receipts').insert({
          user_id: userId,
          agency_id: agencyId,
          file_id: fileId,
          client_name: clientName,
          concept: `${LEGACY_NOTE_PREFIX} (Nº ${r.legacyId})`,
          payment_date: opDate,
          payment_method: 'transfer',
          currency: headerCurrency,
          amount: headerAmount,
          notes: `${LEGACY_NOTE_PREFIX} - cobros agrupados`,
        }).select('id').single();

        if (receipt) {
          await supabase.from('file_receipt_items').insert(items.map(it => ({
            user_id: userId,
            agency_id: agencyId,
            receipt_id: receipt.id,
            currency: it.currency,
            amount: it.amount,
            payment_method: 'transfer',
            notes: `${LEGACY_NOTE_PREFIX} - ${it.currency}`,
          })));
        }

        if (matchedClientId) {
          await supabase.from('account_movements').insert(items.map(it => ({
            user_id: userId,
            agency_id: agencyId,
            file_id: fileId,
            account_id: matchedClientId,
            account_type: 'client',
            movement_type: 'credit',
            currency: it.currency,
            amount: it.amount,
            concept: `Cobro expediente Nº ${r.legacyId}`,
            reference: `LEG-${r.legacyId}`,
            movement_date: opDate,
            notes: `${LEGACY_NOTE_PREFIX} - cobro pasajero`,
          })));
        }
      }

      // Supplier Payments
      const supplierPayments: any[] = [];
      for (const s of r.services) {
        if (s.paymentsArs > 0) {
          supplierPayments.push({
            user_id: userId, agency_id: agencyId, file_id: fileId,
            supplier_name: s.operatorName || 'Operador', currency: 'ARS', amount: s.paymentsArs,
            payment_date: opDate, payment_method: 'transfer', reference: `LEG-${r.legacyId}`, notes: `${LEGACY_NOTE_PREFIX}`,
          });
        }
        if (s.paymentsUsd > 0) {
          supplierPayments.push({
            user_id: userId, agency_id: agencyId, file_id: fileId,
            supplier_name: s.operatorName || 'Operador', currency: 'USD', amount: s.paymentsUsd,
            payment_date: opDate, payment_method: 'transfer', reference: `LEG-${r.legacyId}`, notes: `${LEGACY_NOTE_PREFIX}`,
          });
        }
      }
      if (supplierPayments.length) await supabase.from('file_supplier_payments').insert(supplierPayments);

      result.imported++;
    } catch (e) {
      result.errors.push(`Fila ${i+1}: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    }
    onProgress(i + 1, reservations.length);
  }

  return result;
}
