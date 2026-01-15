-- Add new columns for multiple lodgings, transport options, activities and cruises
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS lodgings jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS trains jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS ferries jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS rental_cars jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS activities jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS cruise jsonb DEFAULT NULL;

-- Update sections_toggles default in templates to include new sections
ALTER TABLE public.templates 
ALTER COLUMN sections_toggles 
SET DEFAULT '{"flights": true, "lodging": true, "transfers": true, "insurance": true, "itinerary": true, "trains": true, "ferries": true, "rentalCars": true, "activities": true, "cruise": true}'::jsonb;