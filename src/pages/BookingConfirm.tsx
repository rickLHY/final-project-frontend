import { useState } from 'react';
import type { Order } from '../types';
import apiService from '../services/api';
import type { TicketInfo } from './SeatSelection';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();

  const totalPrice = tickets.reduce((sum, t) => sum + t.price, 0);

  const handleConfirm = async () => {
    if (!agreed) {
      alert(t('agreeAlert'));
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
      setError(err instanceof Error ? err.message : t('createOrderFailed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-confirm-container">
      <h2>{t('confirmOrder')}</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="ticket-list">
        <h3>{t('ticketDetails')}</h3>
        {tickets.map((ticket, index) => (
          <div key={index} className="ticket-item">
            <div className="ticket-number">{t('seatNumber', { no: index + 1 })}</div>
            <div className="ticket-details">
              <p>
                <strong>{t('ticketType')}:</strong> {t(ticket.ticketType)}
              </p>
              <p>
                <strong>{t('amount')}:</strong> NT$ {ticket.price.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="summary">
        <div className="summary-row">
          <span>{t('ticketCount')}:</span>
          <span>{t('ticketsUnit', { count: tickets.length })}</span>
        </div>
        <div className="summary-row total">
          <span>{t('totalAmount')}:</span>
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
          {t('agreeTerms')}
        </label>
      </div>

      <div className="actions">
        <button onClick={onBack} className="btn-secondary" disabled={loading}>
          {t('previous')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!agreed || loading}
          className="btn-primary"
        >
          {loading ? t('processing') : t('confirmOrder')}
        </button>
      </div>
    </div>
  );
}
