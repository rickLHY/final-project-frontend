import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import '../styles/Auth.css';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export function AuthPage({ initialMode = 'login', onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, register } = useAuth();
  const { t } = useI18n();

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

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{mode === 'login' ? t('login') : t('register')}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t('email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@gmail.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={t('passwordPlaceholder')}
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="form-group">
                <label htmlFor="name">{t('name')}</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder={t('namePlaceholder')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">{t('phone')}</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder={t('phonePlaceholder')}
                />
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('processing') : mode === 'login' ? t('login') : t('register')}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>
              {t('noAccount')}{' '}
              <button type="button" onClick={() => setMode('register')} className="link-button">
                {t('register')}
              </button>
            </>
          ) : (
            <>
              {t('hasAccount')}{' '}
              <button type="button" onClick={() => setMode('login')} className="link-button">
                {t('login')}
              </button>
            </>
          )}
        </div>

        {/* Demo accounts */}
        <div className="demo-accounts">
          <p>{t('demoAccounts')}</p>
          <p>
            <strong>{t('admin')}:</strong> admin@thsr.com / admin1234
          </p>
          <p>
            <strong>{t('generalUser')}:</strong> user@thsr.com / user1234
          </p>
        </div>
      </div>
    </div>
  );
}
