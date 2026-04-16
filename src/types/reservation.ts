// Tipos para el módulo de Reservas de Vuelos (integrado desde Vicka Viajes Central)

export interface Reservation {
  id: string;
  user_id: string;
  locator?: string | null;
  source_type: string;
  gds?: string | null;
  notes?: string | null;
  raw_text_latest?: string | null;
  file_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationPassenger {
  id: string;
  reservation_id: string;
  last_name: string;
  first_name?: string | null;
  title?: string | null;
  document?: string | null;
  created_at: string;
}

export interface FlightSegment {
  id: string;
  reservation_id: string;
  seq: number;
  airline_code: string;
  flight_number: string;
  origin_iata: string;
  destination_iata: string;
  dep_datetime_local?: string | null;
  arr_datetime_local?: string | null;
  booking_class?: string | null;
  segment_status?: string | null;
  airline_locator?: string | null;
  raw_text?: string | null;
  is_incomplete: boolean;
  has_changes: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlightCheckin {
  id: string;
  flight_segment_id: string;
  passenger_id?: string | null;
  checked_in_at: string;
  notes?: string | null;
}

export interface ReservationChange {
  id: string;
  reservation_id: string;
  flight_segment_id?: string | null;
  change_type: string;
  field_name: string;
  before_value?: string | null;
  after_value?: string | null;
  status: string;
  detected_at: string;
}

export interface ReservationAttachment {
  id: string;
  reservation_id: string;
  filename: string;
  file_url: string;
  created_at: string;
}

// Tipos extendidos
export interface FlightSegmentWithCheckins extends FlightSegment {
  checkins: FlightCheckin[];
}

export interface ReservationWithDetails extends Reservation {
  passengers: ReservationPassenger[];
  flight_segments: FlightSegmentWithCheckins[];
  attachments: ReservationAttachment[];
  changes: ReservationChange[];
}

export interface UpcomingFlight {
  segment: FlightSegment;
  reservation: Reservation;
  passengers: ReservationPassenger[];
  checkins: FlightCheckin[];
}
