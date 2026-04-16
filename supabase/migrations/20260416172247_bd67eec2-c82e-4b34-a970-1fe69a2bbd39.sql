
-- 1. RESERVATIONS
CREATE TABLE public.reservations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  locator text,
  source_type text NOT NULL DEFAULT 'manual',
  gds text,
  notes text,
  raw_text_latest text,
  file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reservations" ON public.reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own reservations" ON public.reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reservations" ON public.reservations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reservations" ON public.reservations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RESERVATION PASSENGERS
CREATE TABLE public.reservation_passengers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  last_name text NOT NULL DEFAULT '',
  first_name text,
  title text,
  document text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservation_passengers ENABLE ROW LEVEL SECURITY;

-- 3. FLIGHT SEGMENTS
CREATE TABLE public.flight_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  seq integer NOT NULL DEFAULT 1,
  airline_code text NOT NULL DEFAULT '',
  flight_number text NOT NULL DEFAULT '',
  origin_iata text NOT NULL DEFAULT '',
  destination_iata text NOT NULL DEFAULT '',
  dep_datetime_local timestamptz,
  arr_datetime_local timestamptz,
  booking_class text,
  segment_status text,
  airline_locator text,
  raw_text text,
  is_incomplete boolean NOT NULL DEFAULT false,
  has_changes boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flight_segments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_flight_segments_updated_at BEFORE UPDATE ON public.flight_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. FLIGHT CHECKINS
CREATE TABLE public.flight_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flight_segment_id uuid NOT NULL REFERENCES public.flight_segments(id) ON DELETE CASCADE,
  passenger_id uuid REFERENCES public.reservation_passengers(id) ON DELETE SET NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
ALTER TABLE public.flight_checkins ENABLE ROW LEVEL SECURITY;

-- 5. RESERVATION CHANGES
CREATE TABLE public.reservation_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  flight_segment_id uuid REFERENCES public.flight_segments(id) ON DELETE SET NULL,
  change_type text NOT NULL DEFAULT '',
  field_name text NOT NULL DEFAULT '',
  before_value text,
  after_value text,
  status text NOT NULL DEFAULT 'pending',
  detected_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservation_changes ENABLE ROW LEVEL SECURITY;

-- 6. RESERVATION ATTACHMENTS
CREATE TABLE public.reservation_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  filename text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reservation_attachments ENABLE ROW LEVEL SECURITY;

-- Now create helper functions (tables exist)
CREATE OR REPLACE FUNCTION public.owns_reservation(_user_id uuid, _reservation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.reservations WHERE id = _reservation_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.owns_flight_segment(_user_id uuid, _segment_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flight_segments fs
    JOIN public.reservations r ON r.id = fs.reservation_id
    WHERE fs.id = _segment_id AND r.user_id = _user_id
  )
$$;

-- RLS for reservation_passengers
CREATE POLICY "Users can view their reservation passengers" ON public.reservation_passengers FOR SELECT USING (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can create their reservation passengers" ON public.reservation_passengers FOR INSERT WITH CHECK (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can update their reservation passengers" ON public.reservation_passengers FOR UPDATE USING (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can delete their reservation passengers" ON public.reservation_passengers FOR DELETE USING (public.owns_reservation(auth.uid(), reservation_id));

-- RLS for flight_segments
CREATE POLICY "Users can view their flight segments" ON public.flight_segments FOR SELECT USING (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can create their flight segments" ON public.flight_segments FOR INSERT WITH CHECK (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can update their flight segments" ON public.flight_segments FOR UPDATE USING (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can delete their flight segments" ON public.flight_segments FOR DELETE USING (public.owns_reservation(auth.uid(), reservation_id));

-- RLS for flight_checkins
CREATE POLICY "Users can view their flight checkins" ON public.flight_checkins FOR SELECT USING (public.owns_flight_segment(auth.uid(), flight_segment_id));
CREATE POLICY "Users can create their flight checkins" ON public.flight_checkins FOR INSERT WITH CHECK (public.owns_flight_segment(auth.uid(), flight_segment_id));
CREATE POLICY "Users can update their flight checkins" ON public.flight_checkins FOR UPDATE USING (public.owns_flight_segment(auth.uid(), flight_segment_id));
CREATE POLICY "Users can delete their flight checkins" ON public.flight_checkins FOR DELETE USING (public.owns_flight_segment(auth.uid(), flight_segment_id));

-- RLS for reservation_changes
CREATE POLICY "Users can view their reservation changes" ON public.reservation_changes FOR SELECT USING (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can create their reservation changes" ON public.reservation_changes FOR INSERT WITH CHECK (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can update their reservation changes" ON public.reservation_changes FOR UPDATE USING (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can delete their reservation changes" ON public.reservation_changes FOR DELETE USING (public.owns_reservation(auth.uid(), reservation_id));

-- RLS for reservation_attachments
CREATE POLICY "Users can view their reservation attachments" ON public.reservation_attachments FOR SELECT USING (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can create their reservation attachments" ON public.reservation_attachments FOR INSERT WITH CHECK (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can update their reservation attachments" ON public.reservation_attachments FOR UPDATE USING (public.owns_reservation(auth.uid(), reservation_id));
CREATE POLICY "Users can delete their reservation attachments" ON public.reservation_attachments FOR DELETE USING (public.owns_reservation(auth.uid(), reservation_id));
