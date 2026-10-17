import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import type { HealthStatus } from '../../api/types';

export default function AdminHealthPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => adminApi.get<HealthStatus>('/health'),
  });

  return (
    <div>
      <div className="page-header spread">
        <h1>Santé du système</h1>
        <button className="btn btn-secondary btn-sm" onClick={() => void refetch()}>Actualiser</button>
      </div>

      {isLoading && <div className="loading-center"><span className="spinner" /></div>}

      {data && (
        <div className="grid cols-3">
          <StatusCard name="Base de données" up={data.database.status === 'UP'} />
          <StatusCard name="Redis" up={data.redis.status === 'UP'} />
          <StatusCard name="VAPID (Web Push)" up={data.vapidConfigured} />
          <StatusCard name="Superadmin configuré" up={data.superAdminConfigured} />
          <div className="kpi-card">
            <div className="value">{data.pendingPushDeliveries}</div>
            <div className="label">Livraisons push en attente</div>
          </div>
          <div className="kpi-card">
            <div className="value">{data.application}</div>
            <div className="label">Application</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({ name, up }: { name: string; up: boolean }) {
  return (
    <div className="kpi-card">
      <div className="value">
        <span className={`badge ${up ? 'badge-green' : 'badge-red'}`}>{up ? 'UP' : 'DOWN'}</span>
      </div>
      <div className="label">{name}</div>
    </div>
  );
}
