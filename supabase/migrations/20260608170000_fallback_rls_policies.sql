-- Fallback RLS policies for templates to allow users to view, update and delete their own templates regardless of agency_id
CREATE POLICY "Users can view their own templates fallback" ON public.templates FOR SELECT USING (user_id = auth.uid() OR agency_id IS NULL);
CREATE POLICY "Users can update their own templates fallback" ON public.templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own templates fallback" ON public.templates FOR DELETE USING (user_id = auth.uid());

-- Fallback RLS policies for quotes to allow users to view, update and delete their own quotes regardless of agency_id
CREATE POLICY "Users can view their own quotes fallback" ON public.quotes FOR SELECT USING (user_id = auth.uid() OR agency_id IS NULL);
CREATE POLICY "Users can update their own quotes fallback" ON public.quotes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own quotes fallback" ON public.quotes FOR DELETE USING (user_id = auth.uid());
