import { supabase } from '@/integrations/supabase/client';

/**
 * Elimina un expediente y todas sus dependencias en cascada.
 *
 * Orden de borrado (respetar para evitar errores de FK):
 * 1. file_receipt_items  (depende de file_receipts)
 * 2. file_receipts, file_services, file_passengers,
 *    file_supplier_payments, account_movements  (dependen de files)
 * 3. files  (raíz)
 *
 * Si algo falla, lanza un error para que el llamador lo maneje con su propio toast/UI.
 */
export async function deleteFileWithCascade(fileId: string): Promise<void> {
  // 1. Buscar recibos del expediente para borrar sus ítems primero
  const { data: receipts } = await supabase
    .from('file_receipts')
    .select('id')
    .eq('file_id', fileId);

  if (receipts && receipts.length > 0) {
    const receiptIds = receipts.map(r => r.id);
    const { error: itemsError } = await supabase.from('file_receipt_items').delete().in('receipt_id', receiptIds);
    if (itemsError) throw itemsError;
  }

  // 2. Borrar todas las tablas dependientes en paralelo y verificar errores
  const results = await Promise.all([
    supabase.from('file_services').delete().eq('file_id', fileId),
    supabase.from('file_passengers').delete().eq('file_id', fileId),
    supabase.from('file_receipts').delete().eq('file_id', fileId),
    supabase.from('file_supplier_payments').delete().eq('file_id', fileId),
    supabase.from('account_movements').delete().eq('file_id', fileId),
  ]);

  const firstError = results.find(res => res.error)?.error;
  if (firstError) throw firstError;

  // 3. Borrar el expediente raíz
  const { error } = await supabase.from('files').delete().eq('id', fileId);
  if (error) throw error;
}
