
-- Tags table
CREATE TABLE public.quote_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tags" ON public.quote_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tags" ON public.quote_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON public.quote_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON public.quote_tags FOR DELETE USING (auth.uid() = user_id);

-- Tag assignments table
CREATE TABLE public.quote_tag_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  UNIQUE(quote_id, tag_id)
);

ALTER TABLE public.quote_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Use a security definer function to check tag ownership
CREATE OR REPLACE FUNCTION public.owns_quote_tag(_user_id uuid, _tag_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quote_tags WHERE id = _tag_id AND user_id = _user_id
  )
$$;

CREATE POLICY "Users can view their tag assignments" ON public.quote_tag_assignments FOR SELECT USING (owns_quote_tag(auth.uid(), tag_id));
CREATE POLICY "Users can create their tag assignments" ON public.quote_tag_assignments FOR INSERT WITH CHECK (owns_quote_tag(auth.uid(), tag_id));
CREATE POLICY "Users can delete their tag assignments" ON public.quote_tag_assignments FOR DELETE USING (owns_quote_tag(auth.uid(), tag_id));
