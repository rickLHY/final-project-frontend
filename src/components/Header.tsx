import { useAuth } from '../contexts/AuthContext';
import type { AppPage } from '../App';
import '../styles/Header.css';

interface HeaderProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const navItems: { page: AppPage; label: string }[] = [
  { page: 'search', label: '訂票' },
  { page: 'orders', label: '我的訂單' },
  { page: 'waitlist', label: '候補' },
];

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="utility-bar">
        <span>會員專區</span>
        <span>常見問題</span>
        <span>聯絡我們</span>
      </div>
      <div className="header-container">
        <div className="brand-block">
          <div className="rail-mark" aria-hidden="true"></div>
          <div>
            <h1 className="logo">台灣高鐵訂票系統</h1>
            <p>Taiwan High Speed Rail Ticketing</p>
          </div>
        </div>
        {user && (
          <nav className="main-nav" aria-label="主要功能">
            {navItems.map((item) => (
              <button
                key={item.page}
                type="button"
                className={currentPage === item.page ? 'active' : ''}
                onClick={() => onNavigate(item.page)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
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
