
CREATE TABLE public.client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own client notes"
ON public.client_notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own client notes"
ON public.client_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client notes"
ON public.client_notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client notes"
ON public.client_notes FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_client_notes_updated_at
BEFORE UPDATE ON public.client_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
