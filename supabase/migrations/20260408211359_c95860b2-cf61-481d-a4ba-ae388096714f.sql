
-- Expand clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone_work text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone_mobile text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nationality text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS dni text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS dni_expiry date;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS passport text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS passport_issue date;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS passport_expiry date;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS locality text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cuil_cuit text DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sex text DEFAULT '';

-- Create client_groups table
CREATE TABLE public.client_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own groups" ON public.client_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own groups" ON public.client_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own groups" ON public.client_groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own groups" ON public.client_groups FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_client_groups_updated_at BEFORE UPDATE ON public.client_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create client_group_members table
CREATE TABLE public.client_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.client_groups(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  UNIQUE(group_id, client_id)
);

ALTER TABLE public.client_group_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check group ownership
CREATE OR REPLACE FUNCTION public.owns_client_group(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_groups WHERE id = _group_id AND user_id = _user_id
  )
$$;

CREATE POLICY "Users can view members of their groups" ON public.client_group_members FOR SELECT USING (public.owns_client_group(auth.uid(), group_id));
CREATE POLICY "Users can add members to their groups" ON public.client_group_members FOR INSERT WITH CHECK (public.owns_client_group(auth.uid(), group_id));
CREATE POLICY "Users can remove members from their groups" ON public.client_group_members FOR DELETE USING (public.owns_client_group(auth.uid(), group_id));
