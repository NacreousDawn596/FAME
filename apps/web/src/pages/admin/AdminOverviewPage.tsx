import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import type { OverviewData } from '../../api/types';

export default function AdminOverviewPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.get<OverviewData>('/overview'),
    refetchInterval: 15000,
  });

  return (
    <div>
      <div className="page-header spread">
        <h1>Vue d’ensemble</h1>
        <button className="btn btn-secondary btn-sm" onClick={() => void refetch()}>Actualiser</button>
      </div>

      {isLoading && <div className="loading-center"><span className="spinner" /></div>}
      {error && <div className="alert alert-error">Impossible de charger les données.</div>}

      {data && (
        <>
          <div className="kpi-grid">
            <Kpi label="Campagnes actives" value={data.campaigns.ACTIVE ?? 0} to="/admin/campaigns" />
            <Kpi label="Campagnes en pause" value={data.campaigns.PAUSED ?? 0} to="/admin/campaigns" />
            <Kpi label="Inscrits" value={data.students.registered ?? 0} to="/admin/users" />
            <Kpi label="En attente" value={data.students.waiting ?? 0} to="/admin/operations" />
            <Kpi label="Appelés" value={data.students.called ?? 0} to="/admin/operations" />
            <Kpi label="En entretien" value={data.students.inInterview ?? 0} to="/admin/operations" />
            <Kpi label="Terminés" value={data.students.completed ?? 0} to="/admin/users" />
            <Kpi label="Absents" value={data.students.absent ?? 0} to="/admin/users" />
            <Kpi label="Postes actifs" value={data.stations.available ?? 0} to="/admin/campaigns" />
            <Kpi label="Postes occupés" value={data.stations.occupied ?? 0} to="/admin/operations" />
            <Kpi label="Postes en pause" value={data.stations.paused ?? 0} to="/admin/campaigns" />
            <Kpi label="Utilisateurs" value={data.staffUsers} to="/admin/users" />
          </div>

          <div className="grid cols-2 mt24">
            <div className="card">
              <h3>Actions récentes</h3>
              {data.recentActions.length === 0 && <div className="empty">Aucune action.</div>}
              {data.recentActions.slice(0, 12).map((a) => (
                <div key={a.id} className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="badge badge-gray">{a.action}</span>
                  <span className="muted small">{a.entityType}</span>
                  <span className="muted small">{new Date(a.occurredAt).toLocaleTimeString('fr-MA')}</span>
                </div>
              ))}
              <Link className="btn btn-ghost btn-sm mt8" to="/admin/audit">Tout le journal</Link>
            </div>

            <div className="card">
              <h3>Diffusions récentes</h3>
              {data.recentBroadcasts.length === 0 && <div className="empty">Aucune diffusion.</div>}
              {data.recentBroadcasts.map((b) => (
                <div key={b.id} className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{b.title}</span>
                  <span className="badge badge-gray">{b.status}</span>
                  <span className="muted small">{b.deliveredCount}/{b.targetCount}</span>
                </div>
              ))}
              <Link className="btn btn-ghost btn-sm mt8" to="/admin/notifications">Centre de notifications</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link className="kpi-card" to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </Link>
  );
}
