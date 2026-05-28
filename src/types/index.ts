// User & Auth types
export interface User {
  user_id: number;
  email: string;
  name: string;
  phone: string;
  user_type: 'general' | 'corporate' | 'admin';
  tgo_balance: number;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// Station types
export interface Station {
  station_id: number;
  station_name: string;
  sequence_no: number;
  latitude: number | string | null;
  longitude: number | string | null;
}

// Train types
export interface Train {
  train_no: string;
  train_type: string;
  total_carriages: number;
}

// Seat types
export interface Seat {
  seat_id: number;
  carriage_no: number;
  row_no: number;
  seat_letter: string;
  is_business_class: boolean;
}

// Ticket Price types
export interface TicketPrice {
  price_id: number;
  start_station_id: number;
  end_station_id: number;
  is_business: boolean;
  base_price: number;
  start_station?: Station | null;
  end_station?: Station | null;
}

// Schedule types
export interface Schedule {
  schedule_id: number;
  train_no: string;
  train_type?: string;
  departure_date: string;
  non_reserved_start_carriage: number;
  origin_departure_time?: string | null;
  destination_arrival_time?: string | null;
  available_seats?: number | null;
}

export interface StopTime {
  stop_id: number;
  schedule_id: number;
  station_id: number;
  arrival_time: string | null;
  departure_time: string | null;
  station?: Station | null;
}

export interface ScheduleDetail extends Schedule {
  train?: Train | null;
  stop_times: StopTime[];
  early_bird_pools?: EarlyBirdPool[];
}

// Early Bird types
export interface EarlyBirdPool {
  pool_id: number;
  schedule_id: number;
  discount_rate: number;
  initial_quota: number;
  available_quota: number;
}

// Order & Ticket types
export type TicketType = 'full' | 'early-bird' | 'student' | 'elderly' | 'companion' | 'friend' | 'child';

export interface OrderTicket {
  ticket_id: number;
  order_id: number;
  schedule_id: number;
  seat_id: number;
  start_station_id: number;
  end_station_id: number;
  ticket_type: TicketType;
  companion_ticket_id: number | null;
  actual_price: number;
  ticket_status: 'valid' | 'used' | 'refunded';
  seat?: Seat | null;
  start_station?: Station | null;
  end_station?: Station | null;
}

export interface Order {
  order_id: number;
  user_id: number;
  booking_code: string;
  total_amount: number;
  payment_status: 'unpaid' | 'paid' | 'cancelled';
  created_at: string;
  tickets?: OrderTicket[];
  order_tickets?: OrderTicket[];
}

export interface CreateOrderRequest {
  schedule_id: number;
  tickets: {
    seat_id: number;
    start_station_id: number;
    end_station_id: number;
    ticket_type: TicketType;
    companion_idx?: number | null;
    companion_ticket_id?: number | null;
  }[];
}

// Waitlist types
export interface Waitlist {
  waitlist_id: number;
  user_id: number;
  schedule_id: number;
  start_station_id: number;
  end_station_id: number;
  preferred_seat_type: 'standard' | 'business' | 'any';
  status: 'waiting' | 'matched' | 'expired' | 'cancelled';
  created_at: string;
}

// Available seat info for booking
export interface AvailableSeat {
  seat_id: number;
  carriage_no: number;
  row_no: number;
  seat_letter: string;
  is_business_class: boolean;
  is_available?: boolean;
}

// Search parameters
export interface SearchParams {
  departure_date: string;
  start_station_id: number;
  end_station_id: number;
}

// Non-reserved availability
export interface NonReservedAvailability {
  schedule_id: number;
  train_no: string;
  train_type: string;
  departure_time: string | null;
  non_reserved_total: number;
  non_reserved_sold: number;
  non_reserved_available: number;
  congestion_level: 'low' | 'medium' | 'high' | 'full';
}

// Peak sales summary
export interface PeakSalesSummary {
  schedule_id: number;
  train_no: string;
  train_type: string;
  departure_date: string;
  first_departure_time: string | null;
  last_arrival_time: string | null;
  total_seats: number;
  sold_seats: number;
  available_seats: number;
  occupancy_rate: number;
}

// Booking context types
export interface BookingState {
  selectedSchedule: ScheduleDetail | null;
  selectedSeats: Map<number, Seat>;
  tickets: BookingTicket[];
  totalPrice: number;
}

export interface BookingTicket {
  seat: Seat;
  ticketType: TicketType;
  startStation: Station;
  endStation: Station;
  price: number;
}
