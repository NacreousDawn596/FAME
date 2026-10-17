import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useI18n } from '../i18n/LocaleContext';
import { useRealtime } from '../lib/realtime';
import { QueueStatusBadge, StationStatusBadge } from '../components/StatusBadge';
import type { Campaign, Registration, Station } from '../api/types';

export default function RegulatorDashboardPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [selectedFiliere, setSelectedFiliere] = useState('');

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get<Campaign[]>('/campaigns'),
  });

  const activeId = campaignId ?? campaigns?.[0]?.id ?? null;

  const { data: counts } = useQuery({
    queryKey: ['counts', activeId],
    queryFn: () => api.get<Record<string, number>>(`/campaigns/${activeId}/queue/counts`),
    enabled: !!activeId,
  });

  const { data: stations } = useQuery({
    queryKey: ['stations', activeId],
    queryFn: () => api.get<Station[]>(`/campaigns/${activeId}/stations`),
    enabled: !!activeId,
  });

  const { data: next } = useQuery({
    queryKey: ['next', activeId, selectedFiliere],
    queryFn: () => api.get<Registration[]>(`/campaigns/${activeId}/queue/next?filiere=${encodeURIComponent(selectedFiliere)}`),
    enabled: !!activeId && !!selectedFiliere,
  });

  const { data: alternatives } = useQuery({
    queryKey: ['alternatives', activeId, selectedFiliere],
    queryFn: () => api.get<Registration[]>(`/campaigns/${activeId}/queue/alternatives?filiere=${encodeURIComponent(selectedFiliere)}`),
    enabled: !!activeId && !!selectedFiliere && (next?.length ?? 0) === 0,
  });

  const onEvent = useCallback(() => {
    if (!activeId) return;
    void queryClient.invalidateQueries({ queryKey: ['counts', activeId] });
    void queryClient.invalidateQueries({ queryKey: ['stations', activeId] });
    void queryClient.invalidateQueries({ queryKey: ['next', activeId, selectedFiliere] });
  }, [queryClient, activeId, selectedFiliere]);

  useRealtime(activeId ? `/api/v1/realtime/campaign/${activeId}/stream` : null, onEvent);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['counts', activeId] });
    void queryClient.invalidateQueries({ queryKey: ['stations', activeId] });
    void queryClient.invalidateQueries({ queryKey: ['next', activeId, selectedFiliere] });
    void queryClient.invalidateQueries({ queryKey: ['alternatives', activeId, selectedFiliere] });
  };

  async function call(stationId: string) {
    await api.post(`/campaigns/${activeId}/queue/call`, { stationId });
    invalidate();
  }

  async function togglePause(station: Station) {
    await api.post(`/campaigns/${activeId}/stations/${station.id}/${station.status === 'PAUSED' ? 'resume' : 'pause'}`);
    invalidate();
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="empty">
        <p>{t('empty')}</p>
        <Link className="btn btn-primary mt16" to="/admin">{t('campaigns')}</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header spread">
        <div>
          <h1>{t('dashboard')}</h1>
          <p className="subtitle">{t('appTagline')}</p>
        </div>
        <div className="row">
          <select className="input" style={{ width: 'auto', minWidth: 200 }} value={activeId ?? ''}
            onChange={(e) => setCampaignId(e.target.value)}>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {activeId && (
            <Link className="btn btn-secondary btn-sm" to={`/campaigns/${activeId}/map`}>{t('roomMap')}</Link>
          )}
        </div>
      </div>

      {counts && (
        <div className="grid cols-4">
          <Kpi label={t('totalWaiting')} value={counts.WAITING ?? 0} tone="gray" />
          <Kpi label={t('totalCalled')} value={(counts.CALLED ?? 0) + (counts.DISPATCH_READY ?? 0)} tone="blue" />
          <Kpi label={t('totalInInterview')} value={counts.IN_INTERVIEW ?? 0} tone="orange" />
          <Kpi label={t('totalAbsent')} value={counts.ABSENT ?? 0} tone="red" />
        </div>
      )}

      <div className="grid cols-2 mt24">
        <div className="card">
          <div className="spread mb16">
            <h3>{t('queue')}</h3>
            <select className="input" style={{ width: 'auto', minWidth: 180 }} value={selectedFiliere}
              onChange={(e) => setSelectedFiliere(e.target.value)}>
              <option value="">— {t('filiere')} —</option>
              {(stations ?? []).filter(s => s.filiere).map((s, i) => (
                <option key={i} value={s.filiere}>{s.filiere}</option>
              ))}
            </select>
          </div>

          {!selectedFiliere && <div className="empty">{t('empty')}</div>}

          {selectedFiliere && (next?.length ?? 0) === 0 && (alternatives?.length ?? 0) > 0 && (
            <div className="alert alert-warning">{t('emptyQueue')}</div>
          )}

          {next?.map((r) => (
            <div key={r.id} className="row spread" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row">
                <strong>#{r.sequenceNo}</strong>
                <span>{r.fullName}</span>
                <QueueStatusBadge status={r.status} />
              </div>
              <div className="row">
                <button className="btn btn-primary btn-sm" onClick={() => call(selectedStationFor(stations, selectedFiliere)?.id ?? '')} disabled={!selectedStationFor(stations, selectedFiliere)}>
                  {t('call')}
                </button>
              </div>
            </div>
          ))}

          {(next?.length ?? 0) === 0 && (alternatives?.length ?? 0) === 0 && selectedFiliere && (
            <div className="empty">{t('emptyQueue')}</div>
          )}

          {(alternatives?.length ?? 0) > 0 && (next?.length ?? 0) === 0 && (
            <>
              <div className="section-title">{t('suggestOthers')}</div>
              {alternatives?.map((r) => (
                <div key={r.id} className="row spread" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="row">
                    <strong>#{r.sequenceNo}</strong>
                    <span>{r.fullName}</span>
                    <span className="muted small">{r.filiere}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card">
          <div className="spread mb16">
            <h3>{t('stations')}</h3>
          </div>
          {stations?.map((s) => (
            <div key={s.id} className="row spread" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="row">
                  <strong>{s.label}</strong>
                  <StationStatusBadge status={s.status} />
                </div>
                <div className="muted small mt8">{s.filiere ?? '—'}</div>
              </div>
              <div className="row">
                <button className="btn btn-secondary btn-sm" onClick={() => togglePause(s)}>
                  {s.status === 'PAUSED' ? t('resume') : t('pause')}
                </button>
              </div>
            </div>
          ))}
          {activeId && (
            <Link className="btn btn-ghost btn-sm mt16" to={`/campaigns/${activeId}/map`}>{t('roomMap')}</Link>
          )}
        </div>
      </div>
    </div>
  );
}

function selectedStationFor(stations: Station[] | undefined, filiere: string): Station | undefined {
  return (stations ?? []).find((s) => s.filiere === filiere && s.status !== 'PAUSED');
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  const color = tone === 'red' ? 'var(--danger)' : tone === 'blue' ? 'var(--accent)' : tone === 'orange' ? 'var(--warning)' : 'var(--text)';
  return (
    <div className="kpi">
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
