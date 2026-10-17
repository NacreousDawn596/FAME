import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/LocaleContext';

export default function AppShell({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth();
  const { t } = useI18n();
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const isAdmin = me?.kind === 'staff' && me.role === 'ADMIN';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo-mark">F</span>
          {t('appName')}
        </div>
        <nav className="row" style={{ gap: 18 }}>
          {isAdmin && <Link to="/admin">{t('campaigns')}</Link>}
          {me?.kind === 'staff' && <Link to="/dashboard">{t('dashboard')}</Link>}
          {!online && <span className="badge badge-orange">{t('offline')}</span>}
          <span className="muted small">{me?.kind === 'staff' ? me.displayName : ''}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>
            {t('signOut')}
          </button>
        </nav>
      </header>
      <main className="container page">{children}</main>
    </div>
  );
}
