import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import type { AuditEvent } from '../../api/types';

export default function AdminAuditPage() {
  const [campaignId, setCampaignId] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0);
  const size = 50;

  const params = new URLSearchParams();
  if (campaignId) params.set('campaignId', campaignId);
  if (action) params.set('action', action);
  params.set('page', String(page));
  params.set('size', String(size));

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', campaignId, action, page],
    queryFn: () => adminApi.get<AuditEvent[]>(`/audit?${params.toString()}`),
  });

  return (
    <div>
      <div className="page-header spread">
        <h1>Journal d’audit</h1>
        <a className="btn btn-secondary btn-sm" href={`/api/admin/audit/export${campaignId ? `?campaignId=${campaignId}` : ''}`} download>
          Exporter CSV
        </a>
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="Filtrer par action" value={action}
          onChange={(e) => { setAction(e.target.value); setPage(0); }} />
        <input className="input" placeholder="ID de campagne" value={campaignId}
          onChange={(e) => { setCampaignId(e.target.value); setPage(0); }} />
      </div>

      {isLoading && <div className="loading-center"><span className="spinner" /></div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Heure</th><th>Action</th><th>Entité</th><th>Acteur</th><th>Campagne</th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((e) => (
              <tr key={e.id}>
                <td className="small">{new Date(e.occurredAt).toLocaleString('fr-MA')}</td>
                <td><span className="badge badge-gray">{e.action}</span></td>
                <td className="small">{e.entityType}{e.entityId ? ` · ${e.entityId.slice(0, 8)}` : ''}</td>
                <td className="small">{e.actorRole}</td>
                <td className="small">{e.campaignId ? e.campaignId.slice(0, 8) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data ?? []).length === 0 && <div className="empty">Aucun événement.</div>}
      </div>

      <div className="pagination">
        <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Précédent</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)}>Suivant</button>
      </div>
    </div>
  );
}
