import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import type { BroadcastSummary, Template } from '../../api/types';

const SEGMENTS = [
  { value: 'ALL', label: 'Tous les inscrits' },
  { value: 'CAMPAIGN_ALL', label: 'Toute une campagne' },
  { value: 'WAITING', label: 'En attente / en approche' },
  { value: 'CALLED', label: 'Appelés' },
  { value: 'IN_INTERVIEW', label: 'En entretien' },
  { value: 'SPECIFIC', label: 'Étudiants spécifiques' },
];

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const [segment, setSegment] = useState('ALL');
  const [campaignId, setCampaignId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('ANNOUNCEMENT');
  const [route, setRoute] = useState('/student');
  const [preview, setPreview] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => adminApi.get<Template[]>('/notifications/templates'),
  });

  const { data: broadcasts } = useQuery({
    queryKey: ['admin-broadcasts'],
    queryFn: () => adminApi.get<BroadcastSummary[]>('/notifications?limit=30'),
  });

  const doPreview = useMutation({
    mutationFn: () => adminApi.post<{ count: number }>('/notifications/preview', { segment, campaignId: campaignId || null, title, body, type, route }),
    onSuccess: (r) => setPreview(r.count),
  });

  const doSend = useMutation({
    mutationFn: () => adminApi.post('/notifications/send', { segment, campaignId: campaignId || null, title, body, type, route }),
    onSuccess: () => {
      setConfirmOpen(false);
      setMsg('Diffusion lancée.');
      setPreview(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-broadcasts'] });
    },
  });

  const createTemplate = useMutation({
    mutationFn: () => adminApi.post('/notifications/templates', { name: `Modèle ${Date.now()}`, title, body, type, route }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-templates'] }),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Centre de notifications</h1>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Composer une diffusion</h3>
          <div className="field mt16">
            <label className="label">Audience</label>
            <select className="input" value={segment} onChange={(e) => setSegment(e.target.value)}>
              {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {segment === 'CAMPAIGN_ALL' && (
            <div className="field">
              <label className="label">ID de campagne</label>
              <input className="input" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label className="label">Titre</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Message</label>
            <textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="grid cols-2">
            <div className="field">
              <label className="label">Type</label>
              <input className="input" value={type} onChange={(e) => setType(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Destination (route)</label>
              <input className="input" value={route} onChange={(e) => setRoute(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <button className="btn btn-secondary btn-sm" disabled={!title} onClick={() => doPreview.mutate()}>
              Prévisualiser
            </button>
            <button className="btn btn-primary btn-sm" disabled={!title} onClick={() => setConfirmOpen(true)}>
              Envoyer
            </button>
            <button className="btn btn-ghost btn-sm" disabled={!title} onClick={() => createTemplate.mutate()}>
              Sauver comme modèle
            </button>
          </div>
          {preview !== null && <div className="alert alert-info mt8">{preview} destinataire(s).</div>}
          {msg && <div className="alert alert-success mt8">{msg}</div>}
        </div>

        <div className="card">
          <h3>Modèles</h3>
          {(templates ?? []).map((t) => (
            <div key={t.id} className="row spread" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <strong>{t.name}</strong>
                <div className="muted small">{t.title}</div>
              </div>
              <span className={`badge ${t.active ? 'badge-green' : 'badge-gray'}`}>{t.active ? 'Actif' : 'Inactif'}</span>
            </div>
          ))}
          {(templates ?? []).length === 0 && <div className="empty">Aucun modèle.</div>}
        </div>
      </div>

      <div className="section-title">Historique des diffusions</div>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Titre</th><th>Segment</th><th>Statut</th><th>Livrés</th></tr>
          </thead>
          <tbody>
            {(broadcasts ?? []).map((b) => (
              <tr key={b.id}>
                <td className="small">{new Date(b.createdAt).toLocaleString('fr-MA')}</td>
                <td>{b.title}</td>
                <td className="small">{b.segment}</td>
                <td><span className="badge badge-gray">{b.status}</span></td>
                <td>{b.deliveredCount}/{b.targetCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmOpen && (
        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          <strong>Confirmer l’envoi</strong> à {preview ?? '…'} destinataire(s) du segment « {segment} ».
          <div className="row mt8">
            <button className="btn btn-primary btn-sm" onClick={() => doSend.mutate()}>Confirmer l’envoi</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setConfirmOpen(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
