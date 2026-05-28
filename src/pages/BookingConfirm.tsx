import { useState } from 'react';
import type { Order } from '../types';
import apiService from '../services/api';
import type { TicketInfo } from './SeatSelection';
import '../styles/BookingConfirm.css';

interface BookingConfirmProps {
  tickets: TicketInfo[];
  scheduleId: number;
  onConfirm: (order: Order) => void;
  onBack: () => void;
}

export function BookingConfirm({ tickets, scheduleId, onConfirm, onBack }: BookingConfirmProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const totalPrice = tickets.reduce((sum, t) => sum + t.price, 0);

  const handleConfirm = async () => {
    if (!agreed) {
      alert('請同意條款');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orderRequest = {
        schedule_id: scheduleId,
        tickets: tickets.map((t) => ({
          seat_id: t.seatId,
          start_station_id: t.startStationId,
          end_station_id: t.endStationId,
          ticket_type: t.ticketType,
        })),
      };

      const order = await apiService.createOrder(orderRequest);
      onConfirm(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : '訂單建立失敗');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-confirm-container">
      <h2>確認訂單</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="ticket-list">
        <h3>訂票明細</h3>
        {tickets.map((ticket, index) => (
          <div key={index} className="ticket-item">
            <div className="ticket-number">座位 #{index + 1}</div>
            <div className="ticket-details">
              <p>
                <strong>票種:</strong> {getTicketTypeLabel(ticket.ticketType)}
              </p>
              <p>
                <strong>金額:</strong> NT$ {ticket.price.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="summary">
        <div className="summary-row">
          <span>票數:</span>
          <span>{tickets.length} 張</span>
        </div>
        <div className="summary-row total">
          <span>總金額:</span>
          <span>NT$ {totalPrice.toLocaleString()}</span>
        </div>
      </div>

      <div className="terms">
        <label>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          我同意台灣高鐵訂票系統的條款與條件
        </label>
      </div>

      <div className="actions">
        <button onClick={onBack} className="btn-secondary" disabled={loading}>
          上一步
        </button>
        <button
          onClick={handleConfirm}
          disabled={!agreed || loading}
          className="btn-primary"
        >
          {loading ? '處理中...' : '確認訂單'}
        </button>
      </div>
    </div>
  );
}

function getTicketTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    full: '全票',
    'early-bird': '早鳥',
    student: '大學生',
    elderly: '敬老',
    companion: '愛心',
    friend: '愛陪',
    child: '兒童',
  };
  return labels[type] || type;
}
