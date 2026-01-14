-- Add user_id column to quotes table for ownership tracking
ALTER TABLE public.quotes
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to templates table for ownership tracking
ALTER TABLE public.templates
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing overly permissive policies on quotes
DROP POLICY IF EXISTS "Allow public read quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public delete quotes" ON public.quotes;

-- Drop existing overly permissive policies on templates
DROP POLICY IF EXISTS "Allow public read templates" ON public.templates;
DROP POLICY IF EXISTS "Allow public insert templates" ON public.templates;
DROP POLICY IF EXISTS "Allow public update templates" ON public.templates;
DROP POLICY IF EXISTS "Allow public delete templates" ON public.templates;

-- Create secure RLS policies for quotes based on user ownership
CREATE POLICY "Users can view their own quotes"
ON public.quotes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes"
ON public.quotes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes"
ON public.quotes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes"
ON public.quotes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create secure RLS policies for templates based on user ownership
CREATE POLICY "Users can view their own templates"
ON public.templates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
ON public.templates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.templates
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.templates
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);