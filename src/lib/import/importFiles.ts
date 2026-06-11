import { supabase } from '@/integrations/supabase/client';
import { ParsedLegacyReservation, buildLegacyNotes } from '@/lib/reservationExcelParser';

const LEGACY_NOTE_PREFIX = 'Importado del sistema antiguo';

const detectCurrency = (r: ParsedLegacyReservation): string => {
  // Primary currency based on which total is larger
  const usdTotal = r.totals.saleUsd + r.totals.costUsd;
  const arsTotal = r.totals.saleArs + r.totals.costArs;
  if (usdTotal > 0 && arsTotal > 0) return usdTotal >= arsTotal ? 'USD' : 'ARS';
  if (usdTotal > 0) return 'USD';
  if (arsTotal > 0) return 'ARS';
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
          legacy_id: r.legacyId || null,
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
        // Determine per-service currency: prefer USD if has USD amounts, else ARS
        const hasUsd = (s.saleUsd || 0) > 0 || (s.costUsd || 0) > 0;
        const hasArs = (s.saleArs || 0) > 0 || (s.costArs || 0) > 0;
        const svcCurrency = hasUsd ? 'USD' : 'ARS';
        
        // Infer service type based on operator name keywords
        let serviceType = 'other';
        const opNorm = (s.operatorName || '').toLowerCase();
        if (opNorm.includes('aereo') || opNorm.includes('vuelo') || opNorm.includes('airline') || opNorm.includes('latam') || opNorm.includes('aerolineas') || opNorm.includes('iberia') || opNorm.includes('american') || opNorm.includes('gol') || opNorm.includes('avianca') || opNorm.includes('copa')) {
          serviceType = 'flight';
        } else if (opNorm.includes('hotel') || opNorm.includes('alojamiento') || opNorm.includes('hostel') || opNorm.includes('resort') || opNorm.includes('sheraton') || opNorm.includes('marriott') || opNorm.includes('terrestre') || opNorm.includes('hospedaje') || opNorm.includes('apart') || opNorm.includes('posada')) {
          serviceType = 'lodging';
        } else if (opNorm.includes('traslado') || opNorm.includes('transfer') || opNorm.includes('shuttle') || opNorm.includes('taxi')) {
          serviceType = 'transfer';
        } else if (opNorm.includes('asistencia') || opNorm.includes('seguro') || opNorm.includes('assist') || opNorm.includes('universal assistance') || opNorm.includes('assist card') || opNorm.includes('coris')) {
          serviceType = 'insurance';
        } else if (opNorm.includes('crucero') || opNorm.includes('cruise') || opNorm.includes('royal caribbean') || opNorm.includes('msc') || opNorm.includes('costa crucer')) {
          serviceType = 'cruise';
        } else if (opNorm.includes('tren') || opNorm.includes('train') || opNorm.includes('renfe') || opNorm.includes('amtrak') || opNorm.includes('eurostar')) {
          serviceType = 'train';
        } else if (opNorm.includes('ferry') || opNorm.includes('barco') || opNorm.includes('buquebus') || opNorm.includes('colonia express') || opNorm.includes('gnv')) {
          serviceType = 'ferry';
        } else if (opNorm.includes('auto') || opNorm.includes('car') || opNorm.includes('rent') || opNorm.includes('hertz') || opNorm.includes('avis') || opNorm.includes('localiza') || opNorm.includes('alamo')) {
          serviceType = 'rental_car';
        }

        // Build descriptive text based on type
        const typeLabel: Record<string, string> = {
          flight: 'Aéreos', lodging: 'Alojamiento', transfer: 'Traslados',
          insurance: 'Asistencia al viajero', cruise: 'Crucero', train: 'Tren',
          ferry: 'Ferry', rental_car: 'Alquiler de auto', other: 'Servicios',
          activity: 'Actividad'
        };
        const descText = typeLabel[serviceType] || 'Servicios';

        return {
          user_id: userId,
          agency_id: agencyId,
          file_id: fileId,
          service_type: serviceType,
          description: descText,
          supplier_name: s.operatorName || '',
          currency: svcCurrency,
          price: svcCurrency === 'USD' ? (s.saleUsd || 0) : (s.saleArs || 0),
          cost: svcCurrency === 'USD' ? (s.costUsd || 0) : (s.costArs || 0),
          status: 'confirmed' as const,
        };
      });
      if (servicesToInsert.length) await supabase.from('file_services').insert(servicesToInsert);

      // Receipts - create per-service items for better detail
      const receiptItems: { currency: 'ARS' | 'USD'; amount: number; serviceName: string }[] = [];
      for (const s of r.services) {
        if ((s.receivedArs || 0) > 0) receiptItems.push({ currency: 'ARS', amount: s.receivedArs, serviceName: s.operatorName || 'Servicio' });
        if ((s.receivedUsd || 0) > 0) receiptItems.push({ currency: 'USD', amount: s.receivedUsd, serviceName: s.operatorName || 'Servicio' });
      }
      // Group by currency for header
      const arsTotal = receiptItems.filter(it => it.currency === 'ARS').reduce((a, it) => a + it.amount, 0);
      const usdTotal = receiptItems.filter(it => it.currency === 'USD').reduce((a, it) => a + it.amount, 0);
      const items: { currency: 'ARS' | 'USD'; amount: number }[] = [];
      if (arsTotal > 0) items.push({ currency: 'ARS', amount: arsTotal });
      if (usdTotal > 0) items.push({ currency: 'USD', amount: usdTotal });

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
