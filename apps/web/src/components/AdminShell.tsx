import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { adminApi } from '../api/client';
import type { AdminUser } from '../api/types';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Contrôle',
    items: [
      { to: '/admin', label: 'Vue d’ensemble', end: true },
      { to: '/admin/operations', label: 'Opérations en direct' },
      { to: '/admin/campaigns', label: 'Campagnes' },
    ],
  },
  {
    section: 'Acteurs',
    items: [
      { to: '/admin/users', label: 'Étudiants & utilisateurs' },
      { to: '/admin/companies', label: 'Entreprises & recruteurs' },
    ],
  },
  {
    section: 'Communication',
    items: [{ to: '/admin/notifications', label: 'Notifications' }],
  },
  {
    section: 'Système',
    items: [
      { to: '/admin/audit', label: 'Journal d’audit' },
      { to: '/admin/health', label: 'Santé du système' },
      { to: '/admin/configuration', label: 'Configuration' },
      { to: '/admin/data', label: 'Gestion des données' },
      { to: '/admin/security', label: 'Sécurité & sessions' },
    ],
  },
];

const ENV = import.meta.env.VITE_API_BASE_URL ? 'staging' : 'local';

export default function AdminShell({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const users = await adminApi.get<AdminUser[]>(`/users?q=${encodeURIComponent(query)}`);
        setResults(users.slice(0, 8));
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/admin/users?q=${encodeURIComponent(query)}`);
      setSearchOpen(false);
    }
    if (e.key === 'Escape') setSearchOpen(false);
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        <div className="admin-brand">
          <span className="logo-mark" style={{ width: 26, height: 26, borderRadius: 7, background: '#fff', color: 'var(--navy)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>F</span>
          FAME Control Center
        </div>
        <div className="admin-env">Superadmin · {ENV}</div>
        <nav className="admin-nav">
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="nav-section">{group.section}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          </div>

          <div className="admin-search">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onKeyDown={onKeyDown}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Rechercher un utilisateur…"
              aria-label="Recherche globale"
            />
            {searchOpen && results.length > 0 && (
              <div className="admin-search-results">
                <div className="search-label">Utilisateurs</div>
                {results.map((u) => (
                  <Link key={u.id} to={`/admin/users?q=${encodeURIComponent(u.username)}`}>
                    {u.displayName} <span className="muted">({u.username})</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="row" style={{ gap: 12 }}>
            <span className="muted small">{me?.kind === 'staff' ? me.displayName : ''}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>Déconnexion</button>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
