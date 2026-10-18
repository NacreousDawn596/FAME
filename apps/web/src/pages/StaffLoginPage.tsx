import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/LocaleContext';
import type { StaffMe } from '../api/types';

export default function StaffLoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { setMe } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.get('/auth/csrf');
      const me = await api.post<StaffMe>('/auth/login', { email, password });
      setMe(me);
      if (me.role === 'SUPERADMIN') navigate('/admin', { replace: true });
      else navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: '10vh' }}>
      <div className="card" style={{ padding: 32 }}>
        <div className="text-center mb16">
          <span className="logo-mark" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--navy)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>F</span>
          <h1 style={{ marginTop: 12 }}>{t('appName')}</h1>
          <p className="muted">{t('appTagline')}</p>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">{t('password')}</label>
            <input id="password" className="input" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? t('loading') : t('signIn')}
          </button>
        </form>
      </div>
    </div>
  );
}
