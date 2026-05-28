/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import type { Order, Station } from '../types';
import apiService from '../services/api';
import { useI18n } from '../i18n';
import '../styles/MyBookings.css';

interface MyBookingsProps {
  stations: Station[];
}

export function MyBookings({ stations }: MyBookingsProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const { t } = useI18n();

  const loadOrders = async () => {
    try {
      const data = await apiService.getMyOrders();
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadOrdersFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleRefund = async (orderId: number, ticketId: number) => {
    if (!window.confirm(t('confirmRefund'))) return;

    try {
      const updatedOrder = await apiService.refundTicket(orderId, ticketId);
      setOrders(
        orders.map((o) => (o.order_id === orderId ? updatedOrder : o))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : t('refundFailed'));
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm(t('confirmCancelOrder'))) return;

    try {
      const updatedOrder = await apiService.cancelOrder(orderId);
      setOrders(
        orders.map((o) => (o.order_id === orderId ? updatedOrder : o))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : t('cancelOrderFailed'));
    }
  };

  const getStationName = (id: number) => {
    return stations.find((s) => s.station_id === id)?.station_name || `車站 ${id}`;
  };

  const getPaymentStatusLabel = (status: string) => {
    return t(status) || status;
  };

  const getTicketStatusLabel = (status: string) => {
    return t(status) || status;
  };

  const getTicketTypeLabel = (type: string) => {
    return t(type) || type;
  };

  if (loading) {
    return <div className="loading">{t('loading')}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="my-bookings">
        <h2>{t('myOrders')}</h2>
        <div className="empty-state">
          <p>{t('emptyOrders')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-bookings">
      <h2>{t('myOrders')}</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.order_id} className="order-card">
            <div className="order-header" onClick={() => setExpandedOrder(expandedOrder === order.order_id ? null : order.order_id)}>
              <div className="order-info">
                <div className="booking-code">
                  <strong>{t('bookingCode')}:</strong> {order.booking_code}
                </div>
                <div className="order-status">
                  <span className={`status-badge ${order.payment_status}`}>
                    {getPaymentStatusLabel(order.payment_status)}
                  </span>
                </div>
              </div>
              <div className="order-amount">NT$ {(order.total_amount ?? 0).toLocaleString()}</div>
              <div className="expand-icon">{expandedOrder === order.order_id ? '▼' : '▶'}</div>
            </div>

            {expandedOrder === order.order_id && (
              <div className="order-details">
                <div className="tickets">
                  <h4>{t('ticketDetails')}</h4>
                  {(order.tickets ?? order.order_tickets ?? []).map((ticket) => (
                    <div key={ticket.ticket_id} className="ticket-detail">
                      <div className="ticket-info">
                        <p>
                          <strong>{t('route')}:</strong> {getStationName(ticket.start_station_id)} →{' '}
                          {getStationName(ticket.end_station_id)}
                        </p>
                        <p>
                          <strong>{t('ticketType')}:</strong> {getTicketTypeLabel(ticket.ticket_type)}
                        </p>
                        <p>
                          <strong>{t('amount')}:</strong> NT$ {(ticket.actual_price ?? 0).toLocaleString()}
                        </p>
                        <p>
                          <strong>{t('status')}:</strong> {getTicketStatusLabel(ticket.ticket_status)}
                        </p>
                      </div>
                      {ticket.ticket_status === 'valid' && order.payment_status === 'paid' && (
                        <button
                          onClick={() => handleRefund(order.order_id, ticket.ticket_id)}
                          className="btn-refund"
                        >
                          {t('refund')}
                        </button>
                      )}
                    </div>
                  ))}
                  {(order.tickets ?? order.order_tickets ?? []).length === 0 && (
                    <p>{t('noTicketDetails')}</p>
                  )}
                </div>

                {order.payment_status === 'unpaid' && (
                  <div className="order-actions">
                    <button
                      onClick={() => handleCancelOrder(order.order_id)}
                      className="btn-danger"
                    >
                      {t('cancelOrder')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
