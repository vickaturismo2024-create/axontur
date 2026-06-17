-- Add cross-currency support to wallet_transfers
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS from_currency text NULL;
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS to_currency text NULL;
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS to_amount numeric NULL;
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS exchange_rate numeric NULL;
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS transfer_date date NULL DEFAULT CURRENT_DATE;

-- Backfill: existing rows use single 'currency' for both from/to (same currency transfers)
UPDATE public.wallet_transfers
SET from_currency = currency,
    to_currency = currency,
    to_amount = amount
WHERE from_currency IS NULL;
