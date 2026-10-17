import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/LocaleContext';
import { useRealtime } from '../lib/realtime';
import { subscribeToPush, isPushSupported, isStandalone } from '../lib/push';
import { QueueStatusBadge } from '../components/StatusBadge';
import type { Campaign, RealtimeEvent } from '../api/types';

export default function StudentStatusPage() {
  const { t } = useI18n();
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const [pushState, setPushState] = useState<string | null>(null);

  const registration = me?.kind === 'student' ? me.registration : null;

  const { data: campaign } = useQuery({
    queryKey: ['student-campaign'],
    queryFn: () => api.get<Pick<Campaign, 'name' | 'location' | 'companyName' | 'status'>>('/student/campaign'),
  });

  const onEvent = useCallback((e: RealtimeEvent) => {
    void queryClient.invalidateQueries({ queryKey: ['student-me'] });
    void queryClient.invalidateQueries({ queryKey: ['student-campaign'] });
    if (e.type === 'CALLED' || e.type === 'DISPATCH_READY' || e.type === 'IN_INTERVIEW') {
      void queryClient.invalidateQueries({ queryKey: ['student-registration'] });
    }
  }, [queryClient]);

  useRealtime('/api/v1/realtime/student/stream', onEvent);

  async function withdraw() {
    await api.post('/student/withdraw');
    void queryClient.invalidateQueries({ queryKey: ['student-me'] });
  }

  async function enablePush() {
    const result = await subscribeToPush();
    setPushState(result);
  }

  if (!registration) {
    return <div className="loading-center"><span className="spinner" /></div>;
  }

  const called = registration.status === 'CALLED' || registration.status === 'DISPATCH_READY';
  const inInterview = registration.status === 'IN_INTERVIEW';
  const done = registration.status === 'COMPLETED';
  const withdrawn = registration.status === 'WITHDRAWN';

  return (
    <div className="container" style={{ maxWidth: 520, paddingTop: 24 }}>
      {called && (
        <div className="call-banner" role="status">
          <div className="call-title">{t('callNotification')}</div>
          <div className="call-sub">{t('goToStation')}</div>
          {registration.station && (
            <div className="station-badge">
              {registration.station.label}
              {registration.station.locationLabel ? ` · ${registration.station.locationLabel}` : ''}
            </div>
          )}
          {registration.station?.recruiter && (
            <div className="mt8" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
              {registration.station.recruiter.fullName}
            </div>
          )}
        </div>
      )}

      <div className="card mt16">
        <div className="spread">
          <h3>{t('yourStatus')}</h3>
          <QueueStatusBadge status={registration.status} />
        </div>
        <div className="mt16">
          <div className="row spread">
            <span className="muted">{t('campaign')}</span>
            <span>{campaign?.name ?? '—'}</span>
          </div>
          {campaign?.location && (
            <div className="row spread mt8">
              <span className="muted">{t('table')}</span>
              <span>{campaign.location}</span>
            </div>
          )}
          <div className="row spread mt8">
            <span className="muted">{t('filiere')}</span>
            <span>{registration.filiere ?? '—'}</span>
          </div>
        </div>
      </div>

      {done && (
        <div className="card mt16 text-center">
          <h3>{t('completed')}</h3>
          <p className="muted">Merci pour votre participation.</p>
        </div>
      )}

      {!done && !withdrawn && !called && !inInterview && (
        <>
          <div className="card mt16">
            <div className="spread">
              <span className="muted">{t('position')}</span>
              <strong>#{registration.sequenceNo}</strong>
            </div>
          </div>
          <div className="mt16">
            <button className="btn btn-danger btn-block" onClick={() => void withdraw()}>
              {t('withdraw')}
            </button>
          </div>
        </>
      )}

      {!done && !withdrawn && (
        <div className="card mt16">
          <div className="spread">
            <div>
              <h3>{t('enableNotifications')}</h3>
              <p className="muted small">Restez informé de votre appel.</p>
            </div>
            {isPushSupported() && (
              <button className="btn btn-secondary btn-sm" onClick={() => void enablePush()}>
                {t('enableNotifications')}
              </button>
            )}
          </div>
          {pushState === 'denied' && <div className="alert alert-warning mt8">{t('notifyPermissionDenied')}</div>}
          {pushState === 'subscribed' && <div className="alert alert-info mt8">Notifications activées</div>}
          {!isPushSupported() && !isStandalone() && (
            <p className="muted small mt8">Ajoutez FAME à l’écran d’accueil pour activer les notifications.</p>
          )}
        </div>
      )}
    </div>
  );
}
