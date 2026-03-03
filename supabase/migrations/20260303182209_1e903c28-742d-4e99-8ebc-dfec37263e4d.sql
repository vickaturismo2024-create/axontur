-- Add NOT NULL constraints to user_id columns to prevent orphaned records
ALTER TABLE public.quotes ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.templates ALTER COLUMN user_id SET NOT NULL;