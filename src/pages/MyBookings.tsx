/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import type { Order, Station } from '../types';
import apiService from '../services/api';
import '../styles/MyBookings.css';

interface MyBookingsProps {
  stations: Station[];
}

export function MyBookings({ stations }: MyBookingsProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const loadOrders = async () => {
    try {
      const data = await apiService.getMyOrders();
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入訂單失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleRefund = async (orderId: number, ticketId: number) => {
    if (!window.confirm('確認退票？')) return;

    try {
      const updatedOrder = await apiService.refundTicket(orderId, ticketId);
      setOrders(
        orders.map((o) => (o.order_id === orderId ? updatedOrder : o))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '退票失敗');
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm('確認取消訂單？')) return;

    try {
      const updatedOrder = await apiService.cancelOrder(orderId);
      setOrders(
        orders.map((o) => (o.order_id === orderId ? updatedOrder : o))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '取消訂單失敗');
    }
  };

  const getStationName = (id: number) => {
    return stations.find((s) => s.station_id === id)?.station_name || `車站 ${id}`;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      unpaid: '未付款',
      paid: '已付款',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  const getTicketStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      valid: '有效',
      used: '已使用',
      refunded: '已退票',
    };
    return labels[status] || status;
  };

  const getTicketTypeLabel = (type: string) => {
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
  };

  if (loading) {
    return <div className="loading">載入中...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="my-bookings">
        <h2>我的訂單</h2>
        <div className="empty-state">
          <p>尚無訂單</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-bookings">
      <h2>我的訂單</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.order_id} className="order-card">
            <div className="order-header" onClick={() => setExpandedOrder(expandedOrder === order.order_id ? null : order.order_id)}>
              <div className="order-info">
                <div className="booking-code">
                  <strong>訂位代號:</strong> {order.booking_code}
                </div>
                <div className="order-status">
                  <span className={`status-badge ${order.payment_status}`}>
                    {getPaymentStatusLabel(order.payment_status)}
                  </span>
                </div>
              </div>
              <div className="order-amount">NT$ {order.total_amount.toLocaleString()}</div>
              <div className="expand-icon">{expandedOrder === order.order_id ? '▼' : '▶'}</div>
            </div>

            {expandedOrder === order.order_id && (
              <div className="order-details">
                <div className="tickets">
                  <h4>車票</h4>
                  {(order.tickets ?? order.order_tickets ?? []).map((ticket) => (
                    <div key={ticket.ticket_id} className="ticket-detail">
                      <div className="ticket-info">
                        <p>
                          <strong>路線:</strong> {getStationName(ticket.start_station_id)} →{' '}
                          {getStationName(ticket.end_station_id)}
                        </p>
                        <p>
                          <strong>票種:</strong> {getTicketTypeLabel(ticket.ticket_type)}
                        </p>
                        <p>
                          <strong>金額:</strong> NT$ {ticket.actual_price.toLocaleString()}
                        </p>
                        <p>
                          <strong>狀態:</strong> {getTicketStatusLabel(ticket.ticket_status)}
                        </p>
                      </div>
                      {ticket.ticket_status === 'valid' && order.payment_status === 'paid' && (
                        <button
                          onClick={() => handleRefund(order.order_id, ticket.ticket_id)}
                          className="btn-refund"
                        >
                          退票
                        </button>
                      )}
                    </div>
                  ))}
                  {(order.tickets ?? order.order_tickets ?? []).length === 0 && (
                    <p>這筆訂單沒有車票明細。</p>
                  )}
                </div>

                {order.payment_status === 'unpaid' && (
                  <div className="order-actions">
                    <button
                      onClick={() => handleCancelOrder(order.order_id)}
                      className="btn-danger"
                    >
                      取消訂單
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
