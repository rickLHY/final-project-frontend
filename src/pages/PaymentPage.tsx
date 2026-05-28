import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Order } from '../types';
import apiService from '../services/api';
import '../styles/Payment.css';

interface PaymentPageProps {
  order: Order;
  onPaymentSuccess: (order: Order) => void;
  onBack: () => void;
}

export function PaymentPage({ order, onPaymentSuccess, onBack }: PaymentPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'atm'>('credit_card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  const handlePayment = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would process the payment through a payment gateway
      // For demo purposes, we'll just mark the order as paid
      const updatedOrder = await apiService.payOrder(order.order_id);
      onPaymentSuccess(updatedOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : '付款失敗');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h2>付款</h2>

        <div className="order-summary">
          <div className="summary-item">
            <span>訂單編號:</span>
            <strong>{order.booking_code}</strong>
          </div>
          <div className="summary-item">
            <span>應付金額:</span>
            <strong>NT$ {order.total_amount.toLocaleString()}</strong>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handlePayment}>
          <div className="payment-method">
            <h3>選擇付款方式</h3>
            <label>
              <input
                type="radio"
                value="credit_card"
                checked={paymentMethod === 'credit_card'}
                onChange={(e) => setPaymentMethod(e.target.value as 'credit_card' | 'atm')}
              />
              信用卡
            </label>
            <label>
              <input
                type="radio"
                value="atm"
                checked={paymentMethod === 'atm'}
                onChange={(e) => setPaymentMethod(e.target.value as 'credit_card' | 'atm')}
              />
              ATM 轉帳
            </label>
          </div>

          {paymentMethod === 'credit_card' && (
            <div className="credit-card-form">
              <div className="form-group">
                <label htmlFor="card-number">卡號 (演示用)</label>
                <input
                  id="card-number"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="card-expiry">有效期限</label>
                  <input
                    id="card-expiry"
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="card-cvv">CVV</label>
                  <input
                    id="card-cvv"
                    type="text"
                    placeholder="123"
                    value={cardCVV}
                    onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'atm' && (
            <div className="atm-info">
              <p>
                <strong>轉帳帳號:</strong>
              </p>
              <p>銀行代號: 700</p>
              <p>帳號: 0123456789</p>
              <p>戶名: 台灣高鐵股份有限公司</p>
              <p>
                <strong>轉帳金額: NT$ {order.total_amount.toLocaleString()}</strong>
              </p>
              <p className="warning">
                ⚠️ 請於 30 分鐘內完成轉帳，否則訂單將自動取消
              </p>
            </div>
          )}

          <div className="actions">
            <button type="button" onClick={onBack} className="btn-secondary" disabled={loading}>
              取消
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '處理中...' : '完成付款'}
            </button>
          </div>
        </form>

        <div className="test-info">
          <p>💡 <strong>測試提示:</strong> 點擊「完成付款」即可完成模擬付款</p>
        </div>
      </div>
    </div>
  );
}
