import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

interface DisplayItem {
  label: string;
  status: string;
  filiere?: string;
}

export default function PublicDisplayPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await api.get<DisplayItem[]>(`/public/campaigns/${campaignId}/display`);
        if (!cancelled) {
          setItems(data);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) timer = setTimeout(poll, 3000);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [campaignId]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', color: '#fff', padding: 32 }}>
      <div className="text-center mb16" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
        Prochains entretiens
      </div>
      {error && <div className="text-center muted">Affichage indisponible</div>}
      <div className="grid cols-3" style={{ maxWidth: 900, margin: '0 auto' }}>
        {items.map((item, i) => (
          <div key={i} className="card" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{item.label}</div>
            <div className="muted" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.filiere ?? ''}</div>
          </div>
        ))}
        {items.length === 0 && !error && (
          <div className="text-center" style={{ gridColumn: '1 / -1', padding: 40, color: 'rgba(255,255,255,0.6)' }}>
            En attente
          </div>
        )}
      </div>
    </div>
  );
}
