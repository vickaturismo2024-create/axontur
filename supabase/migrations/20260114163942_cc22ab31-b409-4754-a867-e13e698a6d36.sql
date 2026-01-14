-- Force RLS to apply to all users including table owners
ALTER TABLE public.quotes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.templates FORCE ROW LEVEL SECURITY;