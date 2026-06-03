-- Migration: Add receipt layout and colors to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS receipt_header_layout TEXT DEFAULT 'classic';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS receipt_primary_color TEXT DEFAULT '#1E3A5F';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS receipt_accent_color TEXT DEFAULT '#BA7EF2';
