import { supabase } from '@/integrations/supabase/client';

/**
 * Elimina un expediente y todas sus dependencias en cascada.
 *
 * Orden de borrado (respetar para evitar errores de FK):
 * 1. file_receipt_items, receipt_card_operations, email_logs
 * 2. file_supplier_payments, account_movements
 * 3. file_transfers, supplier_credit_transfers
 * 4. file_incidencias, file_passengers, file_services, file_receipts
 * 5. desvincular reservations
 * 6. files (raíz)
 *
 * Si algo falla, lanza un error para que el llamador lo maneje con su propio toast/UI.
 */
export async function deleteFileWithCascade(fileId: string): Promise<void> {
  // 1. Buscar recibos del expediente
  const { data: receipts } = await supabase
    .from('file_receipts')
    .select('id')
    .eq('file_id', fileId);

  const receiptIds = (receipts || []).map(r => r.id);

  if (receiptIds.length > 0) {
    // 2. Borrar dependencias directas de los recibos
    await supabase.from('file_receipt_items').delete().in('receipt_id', receiptIds);
    await supabase.from('receipt_card_operations' as any).delete().in('receipt_id', receiptIds);
    await supabase.from('email_logs' as any).delete().in('receipt_id', receiptIds);
  }

  // 3. Borrar logs de emails asociados al expediente
  await supabase.from('email_logs' as any).delete().eq('file_id', fileId);

  // 4. Borrar pagos a proveedores y movimientos contables asociados
  await supabase.from('file_supplier_payments' as any).delete().eq('file_id', fileId);
  if (receiptIds.length > 0) {
    await supabase.from('file_supplier_payments' as any).delete().in('linked_receipt_id', receiptIds);
    await supabase.from('account_movements').delete().in('receipt_id', receiptIds);
  }
  await supabase.from('account_movements').delete().eq('file_id', fileId);

  // 5. Borrar transferencias de saldo y crédito de proveedor asociadas
  await supabase.from('file_transfers' as any).delete().eq('source_file_id', fileId);
  await supabase.from('file_transfers' as any).delete().eq('dest_file_id', fileId);
  await supabase.from('supplier_credit_transfers' as any).delete().eq('source_file_id', fileId);
  await supabase.from('supplier_credit_transfers' as any).delete().eq('dest_file_id', fileId);

  // 6. Borrar incidencias, pasajeros, servicios y recibos
  await supabase.from('file_incidencias' as any).delete().eq('file_id', fileId);
  await supabase.from('file_passengers').delete().eq('file_id', fileId);
  await supabase.from('file_services').delete().eq('file_id', fileId);
  await supabase.from('file_receipts').delete().eq('file_id', fileId);

  // 7. Desvincular reservaciones aéreas
  await supabase.from('reservations').update({ file_id: null }).eq('file_id', fileId);

  // 8. Borrar el expediente raíz
  const { error } = await supabase.from('files').delete().eq('id', fileId);
  if (error) throw error;
}
