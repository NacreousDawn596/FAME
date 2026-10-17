import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useI18n } from '../i18n/LocaleContext';
import type { Campaign } from '../api/types';

export default function AdminCampaignsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [location, setLocation] = useState('');

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/companies'),
  });

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get<Campaign[]>('/campaigns'),
  });

  const createCompany = useMutation({
    mutationFn: () => api.post('/admin/companies', { name: companyName }),
    onSuccess: () => {
      setCompanyName('');
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const createCampaign = useMutation({
    mutationFn: () => api.post('/admin/campaigns', { name, companyId, location }),
    onSuccess: () => {
      setName('');
      setLocation('');
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const transition = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.post(`/campaigns/${id}/status`, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return (
    <div>
      <div className="page-header">
        <h1>{t('campaigns')}</h1>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>{t('create')} — {t('campaign')}</h3>
          <div className="field mt16">
            <label className="label">{t('campaign')}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t('company')}</label>
            <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">—</option>
              {(companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">{t('table')}</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={!name || !companyId} onClick={() => createCampaign.mutate()}>
            {t('create')}
          </button>
        </div>

        <div className="card">
          <h3>{t('create')} — {t('company')}</h3>
          <div className="field mt16">
            <label className="label">{t('company')}</label>
            <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <button className="btn btn-secondary" disabled={!companyName} onClick={() => createCompany.mutate()}>
            {t('create')}
          </button>
        </div>
      </div>

      <div className="section-title">{t('campaigns')}</div>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>{t('campaign')}</th><th>{t('company')}</th><th>{t('status')}</th><th></th></tr>
          </thead>
          <tbody>
            {(campaigns ?? []).map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  <div className="muted small">{c.location}</div>
                </td>
                <td>{c.companyName}</td>
                <td>{c.status}</td>
                <td>
                  <div className="row wrap">
                    {c.status === 'DRAFT' && <button className="btn btn-primary btn-sm" onClick={() => transition.mutate({ id: c.id, status: 'ACTIVE' })}>Activer</button>}
                    {c.status === 'ACTIVE' && <button className="btn btn-secondary btn-sm" onClick={() => transition.mutate({ id: c.id, status: 'PAUSED' })}>Pause</button>}
                    {c.status === 'PAUSED' && <button className="btn btn-primary btn-sm" onClick={() => transition.mutate({ id: c.id, status: 'ACTIVE' })}>Reprendre</button>}
                    {c.status === 'ACTIVE' && <button className="btn btn-secondary btn-sm" onClick={() => transition.mutate({ id: c.id, status: 'CLOSED' })}>Clore</button>}
                    {c.status === 'CLOSED' && <button className="btn btn-secondary btn-sm" onClick={() => transition.mutate({ id: c.id, status: 'ARCHIVED' })}>Archiver</button>}
                    <Link className="btn btn-ghost btn-sm" to={`/campaigns/${c.id}/roster`}>Roster</Link>
                    <Link className="btn btn-ghost btn-sm" to={`/campaigns/${c.id}/map`}>Plan</Link>
                    <Link className="btn btn-ghost btn-sm" to={`/campaigns/${c.id}/analytics`}>Analyses</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
