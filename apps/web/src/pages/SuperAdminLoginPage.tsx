import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { StaffMe } from '../api/types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string | undefined;

/**
 * Superadmin login: verifies a SchoolApp identity and grants the superadmin
 * role only if the backend matches the verified email to the configured
 * `fame.admin.email`. The browser never submits a role or email directly.
 */
export default function SuperAdminLoginPage() {
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
      const challenge = await api.post<{ challenge: string; nonce: string }>('/auth/student/challenge');
      if (!WORKER_URL) throw new Error('SchoolApp worker not configured');

      const workerRes = await fetch(`${WORKER_URL}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, challenge: challenge.challenge, nonce: challenge.nonce }),
      });
      const workerBody = await workerRes.json();
      if (!workerRes.ok) {
        throw new Error('Authentication failed');
      }

      const me = await api.post<StaffMe>('/auth/admin/login', { assertion: workerBody.assertion });
      setMe(me);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 440, paddingTop: '8vh' }}>
      <div className="card" style={{ padding: 28 }}>
        <div className="text-center mb16">
          <span className="logo-mark" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--navy)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>F</span>
          <h2 style={{ marginTop: 12 }}>Superadmin</h2>
          <p className="muted">Authentification institutionnelle (SchoolApp)</p>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="email">Email institutionnel</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label" htmlFor="pw">Mot de passe</label>
            <input id="pw" className="input" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Vérification…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
