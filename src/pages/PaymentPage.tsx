import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Order } from '../types';
import apiService from '../services/api';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();

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
      setError(err instanceof Error ? err.message : t('paymentFailed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h2>{t('payment')}</h2>

        <div className="order-summary">
          <div className="summary-item">
            <span>{t('bookingCode')}:</span>
            <strong>{order.booking_code}</strong>
          </div>
          <div className="summary-item">
            <span>{t('payableAmount')}:</span>
            <strong>NT$ {order.total_amount.toLocaleString()}</strong>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handlePayment}>
          <div className="payment-method">
            <h3>{t('paymentMethod')}</h3>
            <label>
              <input
                type="radio"
                value="credit_card"
                checked={paymentMethod === 'credit_card'}
                onChange={(e) => setPaymentMethod(e.target.value as 'credit_card' | 'atm')}
              />
              {t('creditCard')}
            </label>
            <label>
              <input
                type="radio"
                value="atm"
                checked={paymentMethod === 'atm'}
                onChange={(e) => setPaymentMethod(e.target.value as 'credit_card' | 'atm')}
              />
              {t('atm')}
            </label>
          </div>

          {paymentMethod === 'credit_card' && (
            <div className="credit-card-form">
              <div className="form-group">
                <label htmlFor="card-number">{t('cardNumber')}</label>
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
                  <label htmlFor="card-expiry">{t('cardExpiry')}</label>
                  <input
                    id="card-expiry"
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="card-cvv">{t('cardCvv')}</label>
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
                <strong>{t('transferAccount')}</strong>
              </p>
              <p>{t('bankCode')}</p>
              <p>{t('accountNumber')}</p>
              <p>{t('accountName')}</p>
              <p>
                <strong>{t('payableAmount')}: NT$ {order.total_amount.toLocaleString()}</strong>
              </p>
              <p className="warning">
                {t('transferWarning')}
              </p>
            </div>
          )}

          <div className="actions">
            <button type="button" onClick={onBack} className="btn-secondary" disabled={loading}>
              {t('cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? t('processing') : t('completePayment')}
            </button>
          </div>
        </form>

        <div className="test-info">
          <p>{t('paymentHint')}</p>
        </div>
      </div>
    </div>
  );
}
