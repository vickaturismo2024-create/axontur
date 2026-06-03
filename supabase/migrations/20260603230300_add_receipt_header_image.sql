-- Migration: Add custom receipt header banner image to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS receipt_header_image_url TEXT DEFAULT '';
