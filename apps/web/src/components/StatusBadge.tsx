import { useI18n } from '../i18n/LocaleContext';
import type { QueueStatus, StationStatus } from '../api/types';

const QUEUE_LABELS: Record<QueueStatus, string> = {
  WAITING: 'waiting',
  APPROACHING: 'approaching',
  CALLED: 'called',
  DISPATCH_READY: 'called',
  IN_INTERVIEW: 'inInterview',
  ABSENT: 'absent',
  DEFERRED: 'deferred',
  COMPLETED: 'completed',
  WITHDRAWN: 'withdrawn',
  EXPIRED: 'withdrawn',
};

const QUEUE_TONE: Record<QueueStatus, string> = {
  WAITING: 'badge-gray',
  APPROACHING: 'badge-orange',
  CALLED: 'badge-blue',
  DISPATCH_READY: 'badge-blue',
  IN_INTERVIEW: 'badge-orange',
  ABSENT: 'badge-red',
  DEFERRED: 'badge-gray',
  COMPLETED: 'badge-green',
  WITHDRAWN: 'badge-gray',
  EXPIRED: 'badge-gray',
};

export function QueueStatusBadge({ status }: { status: QueueStatus }) {
  const { t } = useI18n();
  return <span className={`badge ${QUEUE_TONE[status]}`}>{t(QUEUE_LABELS[status] as never)}</span>;
}

const STATION_LABELS: Record<StationStatus, string> = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  PAUSED: 'paused',
};

const STATION_TONE: Record<StationStatus, string> = {
  AVAILABLE: 'badge-green',
  OCCUPIED: 'badge-red',
  PAUSED: 'badge-gray',
};

export function StationStatusBadge({ status }: { status: StationStatus }) {
  const { t } = useI18n();
  return <span className={`badge ${STATION_TONE[status]}`}>{t(STATION_LABELS[status] as never)}</span>;
}
