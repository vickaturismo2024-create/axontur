import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Reservation,
  ReservationPassenger,
  FlightSegment,
  FlightCheckin,
  ReservationChange,
  ReservationWithDetails,
  FlightSegmentWithCheckins,
  UpcomingFlight,
} from '@/types/reservation';
import { ParsedReservation, getStatusMeaning, toLocalISOString } from '@/lib/pnrParser';

// Fetch all reservations
export function useReservationsList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reservations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Reservation[];
    },
    enabled: !!user,
  });
}

// Fetch single reservation with all details
export function useReservationDetails(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reservation', id],
    queryFn: async () => {
      if (!id || !user) return null;

      const { data: reservation, error: resError } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', id)
        .single();
      if (resError) throw resError;

      const [passengersRes, segmentsRes, attachmentsRes, changesRes, checkinsRes] = await Promise.all([
        supabase.from('reservation_passengers').select('*').eq('reservation_id', id),
        supabase.from('flight_segments').select('*').eq('reservation_id', id).order('seq'),
        supabase.from('reservation_attachments').select('*').eq('reservation_id', id),
        supabase.from('reservation_changes').select('*').eq('reservation_id', id).order('detected_at', { ascending: false }),
        supabase.from('flight_checkins').select('*').in(
          'flight_segment_id',
          (await supabase.from('flight_segments').select('id').eq('reservation_id', id)).data?.map(s => s.id) || []
        ),
      ]);

      const segmentsWithCheckins: FlightSegmentWithCheckins[] = ((segmentsRes.data || []) as unknown as FlightSegment[]).map(seg => ({
        ...seg,
        checkins: ((checkinsRes.data || []) as unknown as FlightCheckin[]).filter(c => c.flight_segment_id === seg.id),
      }));

      return {
        ...reservation,
        passengers: (passengersRes.data || []) as unknown as ReservationPassenger[],
        flight_segments: segmentsWithCheckins,
        attachments: (attachmentsRes.data || []),
        changes: (changesRes.data || []) as unknown as ReservationChange[],
      } as ReservationWithDetails;
    },
    enabled: !!id && !!user,
  });
}

// Upcoming flights
export function useUpcomingFlights(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['upcoming-flights', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const now = new Date();

      const { data: reservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', user.id);
      if (!reservations?.length) return [];

      const reservationMap = new Map(reservations.map(r => [r.id, r]));
      const reservationIds = reservations.map(r => r.id);

      const { data: segments } = await supabase
        .from('flight_segments')
        .select('*')
        .in('reservation_id', reservationIds)
        .gte('dep_datetime_local', now.toISOString())
        .order('dep_datetime_local')
        .limit(limit);
      if (!segments?.length) return [];

      const [passengersRes, checkinsRes] = await Promise.all([
        supabase.from('reservation_passengers').select('*').in('reservation_id', reservationIds),
        supabase.from('flight_checkins').select('*').in('flight_segment_id', segments.map(s => s.id)),
      ]);

      const passengersByRes = new Map<string, ReservationPassenger[]>();
      ((passengersRes.data || []) as unknown as ReservationPassenger[]).forEach(p => {
        if (!passengersByRes.has(p.reservation_id)) passengersByRes.set(p.reservation_id, []);
        passengersByRes.get(p.reservation_id)!.push(p);
      });

      return (segments as unknown as FlightSegment[]).map(seg => ({
        segment: seg,
        reservation: reservationMap.get(seg.reservation_id)! as unknown as Reservation,
        passengers: passengersByRes.get(seg.reservation_id) || [],
        checkins: ((checkinsRes.data || []) as unknown as FlightCheckin[]).filter(c => c.flight_segment_id === seg.id),
      })) as UpcomingFlight[];
    },
    enabled: !!user,
  });
}

// Create reservation
export function useCreateReservation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      parsed,
      sourceType,
      gds,
      fileId,
    }: {
      parsed: ParsedReservation;
      sourceType: 'text' | 'pdf';
      gds?: string;
      fileId?: string;
    }) => {
      if (!user) throw new Error('No user');

      const { data: reservation, error: resError } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          locator: parsed.locator,
          source_type: sourceType,
          gds,
          raw_text_latest: parsed.rawText,
          file_id: fileId || null,
        })
        .select()
        .single();
      if (resError) throw resError;

      // Create passengers
      if (parsed.passengers.length > 0) {
        const { error: paxError } = await supabase
          .from('reservation_passengers')
          .insert(
            parsed.passengers.map(p => ({
              reservation_id: reservation.id,
              last_name: p.lastName,
              first_name: p.firstName,
              title: p.title,
              document: p.document,
            }))
          );
        if (paxError) throw paxError;
      }

      // Create segments and detect changes
      for (let i = 0; i < parsed.segments.length; i++) {
        const seg = parsed.segments[i];
        const statusInfo = getStatusMeaning(seg.segmentStatus);

        const { data: segment, error: segError } = await supabase
          .from('flight_segments')
          .insert({
            reservation_id: reservation.id,
            seq: i + 1,
            airline_code: seg.airlineCode,
            flight_number: seg.flightNumber,
            origin_iata: seg.originIata,
            destination_iata: seg.destinationIata,
            dep_datetime_local: seg.depDatetime ? toLocalISOString(seg.depDatetime) : null,
            arr_datetime_local: seg.arrDatetime ? toLocalISOString(seg.arrDatetime) : null,
            booking_class: seg.bookingClass,
            segment_status: seg.segmentStatus,
            airline_locator: seg.airlineLocator,
            raw_text: seg.rawText,
            is_incomplete: seg.isIncomplete,
            has_changes: statusInfo.isCancelled || statusInfo.hasChanges,
          })
          .select()
          .single();
        if (segError) throw segError;

        if (statusInfo.isCancelled) {
          await supabase.from('reservation_changes').insert({
            reservation_id: reservation.id,
            flight_segment_id: segment.id,
            change_type: 'cancellation',
            field_name: 'status',
            before_value: 'Confirmado (HK)',
            after_value: `Cancelado (${statusInfo.code})`,
            status: 'pending',
          });
        } else if (statusInfo.hasChanges) {
          await supabase.from('reservation_changes').insert({
            reservation_id: reservation.id,
            flight_segment_id: segment.id,
            change_type: 'schedule_change',
            field_name: 'schedule',
            before_value: 'Horario original',
            after_value: `Cambio de horario (${statusInfo.code})`,
            status: 'pending',
          });
        }
      }

      return reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-flights'] });
    },
  });
}

// Toggle checkin
export function useToggleCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      segmentId,
      passengerId,
      isCheckedIn,
    }: {
      segmentId: string;
      passengerId?: string;
      isCheckedIn: boolean;
    }) => {
      if (isCheckedIn) {
        let query = supabase.from('flight_checkins').delete().eq('flight_segment_id', segmentId);
        if (passengerId) query = query.eq('passenger_id', passengerId);
        await query;
      } else {
        await supabase.from('flight_checkins').insert({
          flight_segment_id: segmentId,
          passenger_id: passengerId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-flights'] });
    },
  });
}

// Update reservation
export function useUpdateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<Reservation, 'locator' | 'notes' | 'gds'>>;
    }) => {
      const { error } = await supabase.from('reservations').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

// Update passenger
export function useUpdatePassenger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<ReservationPassenger, 'first_name' | 'last_name' | 'title' | 'document'>>;
    }) => {
      const { error } = await supabase.from('reservation_passengers').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
    },
  });
}

// Update flight segment
export function useUpdateFlightSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<FlightSegment,
        'airline_code' | 'flight_number' | 'origin_iata' | 'destination_iata' |
        'dep_datetime_local' | 'arr_datetime_local' | 'booking_class' |
        'segment_status' | 'airline_locator'
      >>;
    }) => {
      const { error } = await supabase.from('flight_segments').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-flights'] });
    },
  });
}

// Delete flight segment
export function useDeleteFlightSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segmentId: string) => {
      await supabase.from('flight_checkins').delete().eq('flight_segment_id', segmentId);
      await supabase.from('reservation_changes').delete().eq('flight_segment_id', segmentId);
      const { error } = await supabase.from('flight_segments').delete().eq('id', segmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-flights'] });
    },
  });
}

// Delete reservation
export function useDeleteReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const { data: segments } = await supabase
        .from('flight_segments')
        .select('id')
        .eq('reservation_id', reservationId);
      const segmentIds = segments?.map(s => s.id) || [];

      if (segmentIds.length > 0) {
        await supabase.from('flight_checkins').delete().in('flight_segment_id', segmentIds);
      }
      await supabase.from('reservation_changes').delete().eq('reservation_id', reservationId);
      await supabase.from('flight_segments').delete().eq('reservation_id', reservationId);
      await supabase.from('reservation_passengers').delete().eq('reservation_id', reservationId);
      await supabase.from('reservation_attachments').delete().eq('reservation_id', reservationId);

      const { error } = await supabase.from('reservations').delete().eq('id', reservationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-flights'] });
    },
  });
}

// Resolve change
export function useResolveChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changeId: string) => {
      const { error } = await supabase
        .from('reservation_changes')
        .update({ status: 'resolved' })
        .eq('id', changeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
    },
  });
}
