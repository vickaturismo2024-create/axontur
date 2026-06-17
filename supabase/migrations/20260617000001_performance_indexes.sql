-- Performance indexes for high-concurrency (30+ users)
-- wallet_transfers: queried by user_id in CashBox
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_user_id ON public.wallet_transfers (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_created_at ON public.wallet_transfers (created_at DESC);

-- file_receipt_items: joined to file_receipts via receipt_id
CREATE INDEX IF NOT EXISTS idx_file_receipt_items_receipt_id ON public.file_receipt_items (receipt_id);
CREATE INDEX IF NOT EXISTS idx_file_receipt_items_created_at ON public.file_receipt_items (created_at DESC);

-- file_receipts: filtered by payment_date in CashBox
CREATE INDEX IF NOT EXISTS idx_file_receipts_payment_date ON public.file_receipts (payment_date DESC);

-- file_supplier_payments: filtered by payment_date in CashBox
CREATE INDEX IF NOT EXISTS idx_file_supplier_payments_payment_date ON public.file_supplier_payments (payment_date DESC);

-- file_incidencias: filtered by fecha + impacto_caja in CashBox
CREATE INDEX IF NOT EXISTS idx_file_incidencias_fecha ON public.file_incidencias (fecha DESC);

-- quotes: ordered by created_at in QuotesContext
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes (created_at DESC);

-- reservation related tables: frequently queried with IN(reservation_id)
CREATE INDEX IF NOT EXISTS idx_flight_segments_reservation_id ON public.flight_segments (reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_changes_reservation_id ON public.reservation_changes (reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_attachments_reservation_id ON public.reservation_attachments (reservation_id);
