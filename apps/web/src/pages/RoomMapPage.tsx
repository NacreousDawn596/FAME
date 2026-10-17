import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useI18n } from '../i18n/LocaleContext';
import type { Station } from '../api/types';

export default function RoomMapPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [dragging, setDragging] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  const { data: stations } = useQuery({
    queryKey: ['stations', campaignId],
    queryFn: () => api.get<Station[]>(`/campaigns/${campaignId}/stations`),
  });

  async function saveLayout() {
    const body = Object.entries(positions).map(([stationId, p]) => ({ stationId, posX: p.x, posY: p.y }));
    if (body.length === 0) return;
    await api.put(`/campaigns/${campaignId}/stations/layout`, body);
    await queryClient.invalidateQueries({ queryKey: ['stations', campaignId] });
    setPositions({});
  }

  function onPointerDown(e: React.PointerEvent, station: Station) {
    setDragging(station.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setPositions((prev) => ({ ...prev, [dragging]: { x, y } }));
  }

  function onPointerUp() {
    setDragging(null);
  }

  function togglePause(station: Station) {
    void api.post(`/campaigns/${campaignId}/stations/${station.id}/${station.status === 'PAUSED' ? 'resume' : 'pause'}`)
      .then(() => queryClient.invalidateQueries({ queryKey: ['stations', campaignId] }));
  }

  return (
    <div>
      <div className="page-header spread">
        <div>
          <h1>{t('roomMap')}</h1>
          <p className="subtitle">Glissez les postes pour reproduire la salle.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => void saveLayout()}>{t('saveLayout')}</button>
      </div>

      <div className="room-canvas" ref={canvasRef}
        onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="grid-bg" />
        {(stations ?? []).map((s) => {
          const pos = positions[s.id] ?? { x: s.posX, y: s.posY };
          return (
            <div
              key={s.id}
              className={`station-node ${s.status.toLowerCase()} ${dragging === s.id ? 'dragging' : ''}`}
              style={{ left: pos.x, top: pos.y }}
              onPointerDown={(e) => onPointerDown(e, s)}
              role="button"
              tabIndex={0}
              aria-label={`${s.label} — ${s.status}`}
            >
              <div className="st-label">{s.label}</div>
              <div className="st-filiere">{s.filiere ?? '—'}</div>
              <div className="st-state">
                {s.status === 'AVAILABLE' ? t('available') : s.status === 'OCCUPIED' ? t('occupied') : t('paused')}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); togglePause(s); }}
              >
                {s.status === 'PAUSED' ? t('resume') : t('pause')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
