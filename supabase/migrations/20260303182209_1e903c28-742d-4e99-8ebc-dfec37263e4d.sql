-- Add NOT NULL constraints to user_id columns to prevent orphaned records
DELETE FROM public.quotes WHERE user_id IS NULL;
ALTER TABLE public.quotes ALTER COLUMN user_id SET NOT NULL;

DELETE FROM public.templates WHERE user_id IS NULL;
ALTER TABLE public.templates ALTER COLUMN user_id SET NOT NULL;