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
import { diffReservation, DiffChange } from '@/lib/pnrDiff';
import { ParsedLegacyReservation, buildLegacyNotes, normalizeName } from '@/lib/reservationExcelParser';

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

// Find reservation by locator (for re-import detection)
export function useFindReservationByLocator() {
  const { user } = useAuth();
  return async (locator: string): Promise<Reservation | null> => {
    if (!user || !locator) return null;
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', user.id)
      .eq('locator', locator.toUpperCase())
      .maybeSingle();
    return (data as unknown as Reservation) || null;
  };
}

// Count of pending changes for the current user (for global badge)
export function usePendingChangesCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending-changes-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id')
        .eq('user_id', user.id);
      const ids = (reservations || []).map(r => r.id);
      if (ids.length === 0) return 0;
      const { count } = await supabase
        .from('reservation_changes')
        .select('id', { count: 'exact', head: true })
        .in('reservation_id', ids)
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

// Re-import a PNR: diff against existing, apply changes, log them
export function useUpdateReservationFromPNR() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      reservationId,
      parsed,
      gds,
    }: {
      reservationId: string;
      parsed: ParsedReservation;
      gds?: string;
    }) => {
      if (!user) throw new Error('No user');

      // Load existing segments
      const { data: existingSegmentsRaw, error: segLoadErr } = await supabase
        .from('flight_segments')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('seq');
      if (segLoadErr) throw segLoadErr;

      const existingSegments = (existingSegmentsRaw || []) as unknown as FlightSegment[];

      // Compute diff
      const changes: DiffChange[] = diffReservation(existingSegments, parsed.segments);

      // Update reservation raw_text and gds
      await supabase
        .from('reservations')
        .update({
          raw_text_latest: parsed.rawText,
          gds: gds || null,
          locator: parsed.locator?.toUpperCase() || null,
        })
        .eq('id', reservationId);

      // Build map of existing by key for updates
      const existingByKey = new Map<string, FlightSegment>();
      existingSegments.forEach(s => {
        existingByKey.set(
          `${s.airline_code.toUpperCase()}${s.flight_number}-${s.origin_iata.toUpperCase()}-${s.destination_iata.toUpperCase()}`,
          s
        );
      });

      // Apply: upsert each parsed segment (by match) or insert new
      for (let i = 0; i < parsed.segments.length; i++) {
        const seg = parsed.segments[i];
        const key = `${seg.airlineCode.toUpperCase()}${seg.flightNumber}-${seg.originIata.toUpperCase()}-${seg.destinationIata.toUpperCase()}`;
        const matched = existingByKey.get(key);
        const statusInfo = getStatusMeaning(seg.segmentStatus);
        const hasChange = changes.some(
          c => c.flightSegmentId === matched?.id || (c.matchKey === key && c.changeType === 'new_segment')
        );

        const payload = {
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
          has_changes: hasChange || statusInfo.isCancelled || statusInfo.hasChanges,
        };

        if (matched) {
          await supabase.from('flight_segments').update(payload).eq('id', matched.id);
        } else {
          await supabase.from('flight_segments').insert({ ...payload, reservation_id: reservationId });
        }
      }

      // Log changes
      for (const c of changes) {
        // Resolve flight_segment_id for new_segment by re-querying
        let segmentId: string | null = c.flightSegmentId || null;
        if (!segmentId && c.matchKey) {
          const parts = c.matchKey.split('-');
          const flight = parts[0];
          const origin = parts[1];
          const destination = parts[2];
          const airline = flight.replace(/[0-9]+$/, '');
          const flightNumber = flight.replace(airline, '');
          const { data: newSeg } = await supabase
            .from('flight_segments')
            .select('id')
            .eq('reservation_id', reservationId)
            .eq('airline_code', airline)
            .eq('flight_number', flightNumber)
            .eq('origin_iata', origin)
            .eq('destination_iata', destination)
            .maybeSingle();
          segmentId = newSeg?.id || null;
        }

        await supabase.from('reservation_changes').insert({
          reservation_id: reservationId,
          flight_segment_id: segmentId,
          change_type: c.changeType,
          field_name: c.fieldName,
          before_value: c.beforeValue,
          after_value: c.afterValue,
          status: 'pending',
        });
      }

      return { reservationId, changesCount: changes.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-flights'] });
      queryClient.invalidateQueries({ queryKey: ['pending-changes-count'] });
    },
  });
}
