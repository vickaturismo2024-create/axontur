-- Add legacy_id to reservations for tracking imports from old systems
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS legacy_id text;

CREATE INDEX IF NOT EXISTS idx_reservations_user_legacy
  ON public.reservations (user_id, legacy_id)
  WHERE legacy_id IS NOT NULL;

-- Add client_id to reservation_passengers to link with CRM clients
ALTER TABLE public.reservation_passengers
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservation_passengers_client
  ON public.reservation_passengers (client_id)
  WHERE client_id IS NOT NULL;