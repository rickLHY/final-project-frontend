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

export function AuthPage({ initialMode = 'login', onSuccess }: AuthPageProps) {
  const [tab, setTab] = useState<'auth' | 'lookup'>('auth');
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Booking lookup state (public, no auth)
  const [bookingCode, setBookingCode] = useState('');
  const [lookupResult, setLookupResult] = useState<null | { booking_code: string; payment_status: string; total_amount: number }>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const { login, register } = useAuth();
  const { t } = useI18n();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // ── Google Identity Services ──────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const scriptId = 'google-gsi-script';
    if (document.getElementById(scriptId)) {
      initGoogle();
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogle;
    document.body.appendChild(script);

    return () => { /* keep script loaded */ };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initGoogle() {
    // @ts-ignore
    window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    if (googleBtnRef.current) {
      // @ts-ignore
      window.google?.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'signin_with',
        size: 'large',
        locale: 'zh-TW',
        width: '100%',
      });
    }
  }

  async function handleGoogleCredential(response: { credential: string }) {
    setError(null);
    setLoading(true);
    try {
      const tokenResp = await apiService.googleLogin(response.credential);
      apiService.setToken(tokenResp.access_token);
      window.location.reload();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google 登入失敗');
    } finally {
      setLoading(false);
    }
  }

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
          <button
            type="button"
            className={tab === 'auth' ? 'active' : ''}
            onClick={() => setTab('auth')}
          >
            會員登入
          </button>
          <button
            type="button"
            className={tab === 'lookup' ? 'active' : ''}
            onClick={() => setTab('lookup')}
          >
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
                <div ref={googleBtnRef} className="google-btn-container" />
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

        {/* ── Booking lookup tab (no auth required) ── */}
        {tab === 'lookup' && (
          <div className="lookup-section">
            <h2>訂位代號查詢</h2>
            <p className="lookup-hint">不需登入，輸入 8 碼訂位代號即可查詢票況。</p>

            <form onSubmit={handleLookup} className="lookup-form-inline">
              <input
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                placeholder="例如：AB12CD34"
                maxLength={8}
                className="lookup-input"
              />
              <button type="submit" disabled={lookupLoading} className="btn-primary">
                {lookupLoading ? '查詢中...' : '查詢'}
              </button>
            </form>

            {lookupError && <div className="error-message">{lookupError}</div>}

            {lookupResult && (
              <div className="lookup-result">
                <div className="lookup-row">
                  <span>訂位代號</span>
                  <strong>{lookupResult.booking_code}</strong>
                </div>
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
