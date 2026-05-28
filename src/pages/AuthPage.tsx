import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
      setError(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{mode === 'login' ? '登入' : '註冊'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">電子信箱</label>
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
            <label htmlFor="password">密碼</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="至少 8 個字元"
            />
          </div>

          {mode === 'register' && (
            <>
              <div className="form-group">
                <label htmlFor="name">姓名</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="請輸入姓名"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">電話</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="例：0912345678"
                />
              </div>
            </>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '處理中...' : mode === 'login' ? '登入' : '註冊'}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>
              沒有帳號？{' '}
              <button type="button" onClick={() => setMode('register')} className="link-button">
                註冊
              </button>
            </>
          ) : (
            <>
              已有帳號？{' '}
              <button type="button" onClick={() => setMode('login')} className="link-button">
                登入
              </button>
            </>
          )}
        </div>

        {/* Demo accounts */}
        <div className="demo-accounts">
          <p>測試帳號:</p>
          <p>
            <strong>管理員:</strong> admin@thsr.com / admin1234
          </p>
          <p>
            <strong>一般用戶:</strong> user@thsr.com / user1234
          </p>
        </div>
      </div>
    </div>
  );
}
