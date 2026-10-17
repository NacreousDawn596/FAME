import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/LocaleContext';
import type { CampaignPublicInfo, Registration } from '../api/types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string | undefined;

export default function StudentRegisterPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { setMe } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: campaign } = useQuery({
    queryKey: ['public-campaign', campaignId],
    queryFn: () => api.get<CampaignPublicInfo>(`/public/campaigns/${campaignId}`),
  });

  useEffect(() => {
    if (campaign && campaign.status !== 'ACTIVE') {
      setError(t('notEligible'));
    }
  }, [campaign, t]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignId) return;
    setBusy(true);
    setError(null);
    try {
      await api.get('/auth/csrf');
      const challenge = await api.post<{ challenge: string; nonce: string }>('/auth/student/challenge');

      if (!WORKER_URL) {
        throw new Error('SchoolApp worker not configured');
      }
      const workerRes = await fetch(`${WORKER_URL}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, challenge: challenge.challenge, nonce: challenge.nonce }),
      });
      const workerBody = await workerRes.json();
      if (!workerRes.ok) {
        throw new Error(workerBody?.error === 'INVALID_CREDENTIALS' ? t('notEligible') : 'Authentication failed');
      }

      const reg = await api.post<Registration>('/auth/student/assert', {
        assertion: workerBody.assertion,
        campaignId,
      });
      setMe({ kind: 'student', registration: reg });
      navigate('/student', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 440, paddingTop: '8vh' }}>
      <div className="card" style={{ padding: 28 }}>
        <div className="text-center mb16">
          <h2>{campaign?.name ?? t('registration')}</h2>
          {campaign?.companyName && <p className="muted">{campaign.companyName}</p>}
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="email">{t('schoolAppEmail')}</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label" htmlFor="pw">{t('password')}</label>
            <input id="pw" className="input" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? t('authenticating') : t('schoolAppLogin')}
          </button>
        </form>
      </div>
    </div>
  );
}
