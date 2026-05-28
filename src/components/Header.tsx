import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n';
import type { AppPage } from '../App';
import '../styles/Header.css';

interface HeaderProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const navItems: { page: AppPage; labelKey: string }[] = [
  { page: 'search', labelKey: 'navBooking' },
  { page: 'orders', labelKey: 'navOrders' },
  { page: 'waitlist', labelKey: 'navWaitlist' },
  { page: 'non-reserved', labelKey: 'tabNonReserved' },
  { page: 'peak-sales', labelKey: 'tabHolidaySales' },
];

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="header">
      <div className="utility-bar">
        <button type="button" className={locale === 'zh-TW' ? 'active' : ''} onClick={() => setLocale('zh-TW')}>
          {t('languageTraditionalChinese')}
        </button>
        <button type="button" className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>
          {t('languageEnglish')}
        </button>
        <button type="button" className={locale === 'ja' ? 'active' : ''} onClick={() => setLocale('ja')}>
          {t('languageJapanese')}
        </button>
      </div>
      <div className="header-container">
        <div className="brand-block">
          <div>
            <h1 className="logo">{t('appTitle')}</h1>
            <p>{t('appSubtitle')}</p>
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
                {t(item.labelKey)}
              </button>
            ))}
          </nav>
        )}
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-info">
                {user.name} ({t('tgoPoints')}: {user.tgo_balance})
              </span>
              <button onClick={logout} className="btn-logout">
                {t('logout')}
              </button>
            </>
          ) : (
            <span className="auth-prompt">{t('loginRequired')}</span>
          )}
        </div>
      </div>
    </header>
  );
}
