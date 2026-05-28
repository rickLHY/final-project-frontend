import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import apiService from '../services/api';
import '../styles/Auth.css';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
    __thsrGoogleCb?: (resp: { credential: string }) => void;
  }
}

export function AuthPage({ initialMode = 'login', onSuccess }: AuthPageProps) {
  const [tab, setTab] = useState<'auth' | 'lookup'>('auth');
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleReady, setGoogleReady] = useState(false);

  const [bookingCode, setBookingCode] = useState('');
  const [lookupResult, setLookupResult] = useState<null | {
    booking_code: string; payment_status: string; total_amount: number;
  }>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const { login, register } = useAuth();
  const { t } = useI18n();

  // ── Step 1: initialize Google GIS when script is ready ────────────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    window.__thsrGoogleCb = async (response) => {
      setError(null);
      setLoading(true);
      try {
        const tokenResp = await apiService.googleLogin(response.credential);
        apiService.setToken(tokenResp.access_token);
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google 登入失敗');
        setLoading(false);
      }
    };

    const initGoogle = () => {
      try {
        window.google?.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp: { credential: string }) => window.__thsrGoogleCb?.(resp),
          auto_select: false,
          use_fedcm_for_prompt: false,
        });
        setGoogleReady(true);
      } catch (e) {
        console.warn('Google GIS init error:', e);
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          initGoogle();
        }
      }, 150);
      return () => clearInterval(timer);
    }
  }, []);

  // ── Step 2: render the button once GIS is ready and div is in DOM ─────────
  useEffect(() => {
    if (!googleReady || !googleBtnRef.current || !window.google?.accounts?.id) return;
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      locale: 'zh-TW',
      width: Math.min(googleBtnRef.current.offsetWidth || 300, 400),
    });
  }, [googleReady, tab]); // re-render when tab switches back to 'auth'

  // ── Email / password ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name, phone);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authFailed'));
    } finally {
      setLoading(false);
    }
  };

  // ── Booking lookup ────────────────────────────────────────────────────────
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingCode.trim()) return;
    setLookupError(null);
    setLookupResult(null);
    setLookupLoading(true);
    try {
      const order = await apiService.getOrderByBookingCode(bookingCode.trim().toUpperCase());
      setLookupResult(order);
    } catch {
      setLookupError('查無此訂位代號，請確認後再試。');
    } finally {
      setLookupLoading(false);
    }
  };

  const STATUS_LABEL: Record<string, string> = {
    unpaid: '⏳ 未付款', paid: '✅ 已付款', cancelled: '❌ 已取消',
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-tabs">
          <button type="button" className={tab === 'auth' ? 'active' : ''} onClick={() => setTab('auth')}>
            會員登入
          </button>
          <button type="button" className={tab === 'lookup' ? 'active' : ''} onClick={() => setTab('lookup')}>
            訂位代號查詢
          </button>
        </div>

        {tab === 'auth' && (
          <>
            <h2>{mode === 'login' ? t('login') : t('register')}</h2>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">{t('email')}</label>
                <input id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required placeholder="example@gmail.com" />
              </div>
              <div className="form-group">
                <label htmlFor="password">{t('password')}</label>
                <input id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required placeholder={t('passwordPlaceholder')} />
              </div>
              {mode === 'register' && (
                <>
                  <div className="form-group">
                    <label htmlFor="name">{t('name')}</label>
                    <input id="name" type="text" value={name}
                      onChange={(e) => setName(e.target.value)} required placeholder={t('namePlaceholder')} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">{t('phone')}</label>
                    <input id="phone" type="tel" value={phone}
                      onChange={(e) => setPhone(e.target.value)} required placeholder={t('phonePlaceholder')} />
                  </div>
                </>
              )}

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? t('processing') : mode === 'login' ? t('login') : t('register')}
              </button>

              {mode === 'register' && (
                <button type="button" className="btn-secondary btn-back"
                  onClick={() => { setMode('login'); setError(null); }}>
                  {t('previous')}
                </button>
              )}
            </form>

            {GOOGLE_CLIENT_ID && (
              <div className="google-signin-wrapper">
                <div className="divider"><span>或</span></div>
                {/* Google renders its official button into this div */}
                <div ref={googleBtnRef} className="google-btn-container" />
                {!googleReady && (
                  <p style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem', margin: '8px 0' }}>
                    Google 登入載入中...
                  </p>
                )}
              </div>
            )}

            <div className="auth-toggle">
              {mode === 'login' ? (
                <>{t('noAccount')}{' '}
                  <button type="button" onClick={() => setMode('register')} className="link-button">{t('register')}</button>
                </>
              ) : (
                <>{t('hasAccount')}{' '}
                  <button type="button" onClick={() => setMode('login')} className="link-button">{t('login')}</button>
                </>
              )}
            </div>

            <div className="demo-accounts">
              <p>{t('demoAccounts')}</p>
              <p><strong>{t('admin')}:</strong> admin@thsr.com / admin1234</p>
              <p><strong>{t('generalUser')}:</strong> user@thsr.com / user1234</p>
            </div>
          </>
        )}

        {tab === 'lookup' && (
          <div className="lookup-section">
            <h2>訂位代號查詢</h2>
            <p className="lookup-hint">不需登入，輸入 8 碼訂位代號即可查詢票況。</p>

            <form onSubmit={handleLookup} className="lookup-form-inline">
              <input value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                placeholder="例如：AB12CD34" maxLength={8} className="lookup-input" />
              <button type="submit" disabled={lookupLoading} className="btn-primary">
                {lookupLoading ? '查詢中...' : '查詢'}
              </button>
            </form>

            {lookupError && <div className="error-message">{lookupError}</div>}
            {lookupResult && (
              <div className="lookup-result">
                <div className="lookup-row"><span>訂位代號</span><strong>{lookupResult.booking_code}</strong></div>
                <div className="lookup-row">
                  <span>付款狀態</span>
                  <strong className={`status-${lookupResult.payment_status}`}>
                    {STATUS_LABEL[lookupResult.payment_status] ?? lookupResult.payment_status}
                  </strong>
                </div>
                <div className="lookup-row">
                  <span>訂單金額</span>
                  <strong>NT$ {(lookupResult.total_amount ?? 0).toLocaleString()}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
