import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/client';

export default function AdminDataPage() {
  const queryClient = useQueryClient();

  const { data: counts } = useQuery({
    queryKey: ['admin-data-counts'],
    queryFn: () => adminApi.get<Record<string, number>>('/data/counts'),
  });

  const archive = useMutation({
    mutationFn: () => adminApi.post<{ archived: number }>('/data/archive-closed-campaigns'),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-data-counts'] }),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Gestion des données</h1>
      </div>

      <div className="card">
        <h3>Compteurs d’enregistrements</h3>
        <div className="kpi-grid mt16">
          {(counts ? Object.entries(counts) : []).map(([k, v]) => (
            <div key={k} className="kpi-card">
              <div className="value">{v}</div>
              <div className="label">{k}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt16">
        <h3>Opérations</h3>
        <div className="row mt16">
          <button className="btn btn-secondary" onClick={() => archive.mutate()}>Archiver les campagnes clôturées</button>
          {archive.data && <span className="muted">{archive.data.archived} campagne(s) archivée(s).</span>}
        </div>
        <p className="muted small mt8">Les exports de campagne sont disponibles depuis la page Campagnes.</p>
      </div>
    </div>
  );
}
