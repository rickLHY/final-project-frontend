import { useAuth } from '../contexts/AuthContext';
import '../styles/Header.css';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-container">
        <h1 className="logo">🚄 台灣高鐵訂票系統</h1>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-info">
                {user.name} (TGo: {user.tgo_balance} 點)
              </span>
              <button onClick={logout} className="btn-logout">
                登出
              </button>
            </>
          ) : (
            <span className="auth-prompt">請先登入</span>
          )}
        </div>
      </div>
    </header>
  );
}
