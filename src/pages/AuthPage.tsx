import React, { useState, useEffect } from 'react';
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
          prompt: () => void;
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

  const { login, register } = useAuth();
  const { t } = useI18n();

  // ── Google Identity Services ──────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Stable global callback (not a closure over React state)
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
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false,  // disable FedCM, use legacy popup
        });
        setGoogleReady(true);
      } catch (e) {
        console.warn('Google GIS init failed:', e);
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      // Script loaded via index.html — poll until ready
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          initGoogle();
        }
      }, 150);
      return () => clearInterval(timer);
    }
  }, []);

  const handleGoogleClick = () => {
    if (!window.google?.accounts?.id) {
      setError('Google 登入尚未就緒，請稍候再試');
      return;
    }
    window.google.accounts.id.prompt();
  };

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
        {/* ── Top tabs ── */}
        <div className="auth-tabs">
          <button type="button" className={tab === 'auth' ? 'active' : ''} onClick={() => setTab('auth')}>
            會員登入
          </button>
          <button type="button" className={tab === 'lookup' ? 'active' : ''} onClick={() => setTab('lookup')}>
            訂位代號查詢
          </button>
        </div>

        {/* ── Auth tab ── */}
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

            {/* Google sign-in */}
            {GOOGLE_CLIENT_ID && (
              <div className="google-signin-wrapper">
                <div className="divider"><span>或</span></div>
                <button
                  type="button"
                  className="google-signin-btn"
                  onClick={handleGoogleClick}
                  disabled={loading}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  使用 Google 帳號登入
                  {!googleReady && <span className="google-loading"> ...</span>}
                </button>
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

        {/* ── Booking lookup tab ── */}
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
