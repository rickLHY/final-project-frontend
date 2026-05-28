import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Station,
  Train,
  Schedule,
  ScheduleDetail,
  TicketPrice,
  Seat,
  EarlyBirdPool,
  AvailableSeat,
  Order,
  CreateOrderRequest,
  Waitlist,
  SearchParams,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/backend';

class ApiService {
  private token: string | null = null;

  constructor() {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      this.token = stored;
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private getHeaders(): RequestInit['headers'] {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = Array.isArray(error.detail)
        ? error.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(', ')
        : error.detail;
      throw new Error(detail || `HTTP ${response.status}`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json();
  }

  // ===== Auth =====
  async register(data: RegisterRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<User>(response);
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const form = new URLSearchParams({
      username: data.email,
      password: data.password,
    });

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    return this.handleResponse<AuthResponse>(response);
  }

  async getProfile(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<User>(response);
  }

  // ===== Stations =====
  async getStations(): Promise<Station[]> {
    const response = await fetch(`${API_BASE_URL}/stations/`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Station[]>(response);
  }

  // ===== Trains =====
  async getTrains(): Promise<Train[]> {
    const response = await fetch(`${API_BASE_URL}/trains/`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Train[]>(response);
  }

  // ===== Seats =====
  async getSeats(carriage?: number, businessClass?: boolean): Promise<Seat[]> {
    const params = new URLSearchParams();
    if (carriage !== undefined) params.append('carriage_no', carriage.toString());
    if (businessClass !== undefined) params.append('is_business_class', businessClass.toString());

    const response = await fetch(`${API_BASE_URL}/seats/?${params}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Seat[]>(response);
  }

  // ===== Ticket Prices =====
  async getTicketPrices(startStationId?: number, endStationId?: number, isBusiness?: boolean): Promise<TicketPrice[]> {
    const params = new URLSearchParams();
    if (startStationId !== undefined) params.append('start_station_id', startStationId.toString());
    if (endStationId !== undefined) params.append('end_station_id', endStationId.toString());
    if (isBusiness !== undefined) params.append('is_business', isBusiness.toString());

    const query = params.toString();
    const response = await fetch(`${API_BASE_URL}/ticket-prices/${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<TicketPrice[]>(response);
  }

  // ===== Schedules =====
  async searchSchedules(params: SearchParams): Promise<Schedule[]> {
    const queryParams = new URLSearchParams({
      departure_date: params.departure_date,
      start_station_id: params.start_station_id.toString(),
      end_station_id: params.end_station_id.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/schedules/?${queryParams}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Schedule[]>(response);
  }

  async getScheduleDetail(scheduleId: number): Promise<ScheduleDetail> {
    const response = await fetch(`${API_BASE_URL}/schedules/${scheduleId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<ScheduleDetail>(response);
  }

  async getAvailableSeats(scheduleId: number, startStationId: number, endStationId: number, isBusiness?: boolean): Promise<AvailableSeat[]> {
    const params = new URLSearchParams({
      start_station_id: startStationId.toString(),
      end_station_id: endStationId.toString(),
    });
    if (isBusiness !== undefined) params.append('is_business', isBusiness.toString());

    const response = await fetch(`${API_BASE_URL}/schedules/${scheduleId}/available-seats?${params}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<AvailableSeat[]>(response);
  }

  // ===== Early Bird =====
  async getEarlyBirdPools(scheduleId: number): Promise<EarlyBirdPool[]> {
    const response = await fetch(`${API_BASE_URL}/schedules/${scheduleId}/early-bird`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<EarlyBirdPool[]>(response);
  }

  // ===== Orders =====
  async createOrder(data: CreateOrderRequest): Promise<Order> {
    const ticketTypeMap: Record<string, string> = {
      'full': '全票',
      'early-bird': '早鳥',
      'student': '大學生',
      'elderly': '敬老',
      'companion': '愛心',
      'friend': '愛陪',
      'child': '兒童',
    };

    const payload = {
      ...data,
      tickets: data.tickets.map(({ companion_ticket_id, ...ticket }) => ({
        ...ticket,
        ticket_type: ticketTypeMap[ticket.ticket_type] ?? ticket.ticket_type,
        companion_idx: ticket.companion_idx ?? companion_ticket_id ?? null,
      })),
    };

    const response = await fetch(`${API_BASE_URL}/orders/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<Order>(response);
  }

  async getOrder(orderId: number): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Order>(response);
  }

  async getOrderByBookingCode(code: string): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/orders/booking/${code}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Order>(response);
  }

  async getMyOrders(): Promise<Order[]> {
    const response = await fetch(`${API_BASE_URL}/users/me/orders`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Order[]>(response);
  }

  async payOrder(orderId: number): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/pay`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Order>(response);
  }

  async cancelOrder(orderId: number): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Order>(response);
  }

  async refundTicket(orderId: number, ticketId: number): Promise<Order> {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/tickets/${ticketId}/refund`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Order>(response);
  }

  // ===== Waitlist =====
  async createWaitlist(data: Omit<Waitlist, 'waitlist_id' | 'created_at'>): Promise<Waitlist> {
    const response = await fetch(`${API_BASE_URL}/waitlists/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Waitlist>(response);
  }

  async getMyWaitlists(): Promise<Waitlist[]> {
    const response = await fetch(`${API_BASE_URL}/waitlists/my`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Waitlist[]>(response);
  }

  async cancelWaitlist(waitlistId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/waitlists/${waitlistId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to cancel waitlist: HTTP ${response.status}`);
    }
  }
}

export default new ApiService();
