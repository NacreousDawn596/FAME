import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useI18n } from '../i18n/LocaleContext';

interface Analytics {
  totalRegistered: number;
  completed: number;
  absent: number;
  withdrawn: number;
  waiting: number;
  inInterview: number;
  meanWaitingSeconds: number;
  medianWaitingSeconds: number;
  meanInterviewSeconds: number;
  medianInterviewSeconds: number;
  noShowRate: number;
  volumeByFiliere: Record<string, number>;
}

interface EventEntry {
  id: string;
  entityType: string;
  actorRole: string;
  action: string;
  occurredAt: string;
}

function fmtSeconds(s: number): string {
  if (s <= 0) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function AnalyticsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { t } = useI18n();

  const { data: analytics } = useQuery({
    queryKey: ['analytics', campaignId],
    queryFn: () => api.get<Analytics>(`/campaigns/${campaignId}/analytics`),
  });

  const { data: events } = useQuery({
    queryKey: ['events', campaignId],
    queryFn: () => api.get<EventEntry[]>(`/campaigns/${campaignId}/events?limit=50`),
  });

  const csvUrl = `/api/v1/campaigns/${campaignId}/export/registrations?format=csv`;

  return (
    <div>
      <div className="page-header spread">
        <div>
          <h1>{t('analytics')}</h1>
        </div>
        <a className="btn btn-secondary btn-sm" href={csvUrl} download>CSV</a>
      </div>

      {analytics && (
        <div className="grid cols-4">
          <div className="kpi"><div className="kpi-value">{analytics.totalRegistered}</div><div className="kpi-label">Inscrits</div></div>
          <div className="kpi"><div className="kpi-value">{analytics.completed}</div><div className="kpi-label">{t('completed')}</div></div>
          <div className="kpi"><div className="kpi-value" style={{ color: 'var(--danger)' }}>{analytics.absent}</div><div className="kpi-label">{t('absent')}</div></div>
          <div className="kpi"><div className="kpi-value">{Math.round(analytics.noShowRate * 100)}%</div><div className="kpi-label">No-show</div></div>
        </div>
      )}

      {analytics && (
        <div className="grid cols-2 mt24">
          <div className="card">
            <h3>Temps d’attente</h3>
            <div className="mt16">
              <div className="row spread"><span className="muted">Moyenne</span><strong>{fmtSeconds(analytics.meanWaitingSeconds)}</strong></div>
              <div className="row spread mt8"><span className="muted">Médiane</span><strong>{fmtSeconds(analytics.medianWaitingSeconds)}</strong></div>
              <div className="row spread mt8"><span className="muted">Durée entretien (moy.)</span><strong>{fmtSeconds(analytics.meanInterviewSeconds)}</strong></div>
            </div>
          </div>
          <div className="card">
            <h3>Volume par filière</h3>
            {Object.entries(analytics.volumeByFiliere).map(([f, n]) => (
              <div key={f} className="row spread mt8"><span>{f}</span><strong>{n}</strong></div>
            ))}
          </div>
        </div>
      )}

      <div className="section-title">Journal des événements</div>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Action</th><th>Entité</th><th>Acteur</th><th>Heure</th></tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => (
              <tr key={e.id}>
                <td><span className="badge badge-gray">{e.action}</span></td>
                <td className="small">{e.entityType}</td>
                <td className="small">{e.actorRole}</td>
                <td className="small">{new Date(e.occurredAt).toLocaleTimeString('fr-MA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
