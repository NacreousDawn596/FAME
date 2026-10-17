import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import type { AppSettingView, SafeConfig } from '../../api/types';

export default function AdminConfigurationPage() {
  const queryClient = useQueryClient();
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => adminApi.get<SafeConfig>('/configuration'),
  });

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.get<AppSettingView[]>('/configuration/settings'),
  });

  const save = useMutation({
    mutationFn: () => adminApi.put(`/configuration/settings/${key}`, { value }),
    onSuccess: () => {
      setMsg('Paramètre enregistré.');
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Configuration</h1>
        <p className="subtitle">Les secrets et le fichier config.yml ne sont jamais exposés.</p>
      </div>

      {config && (
        <div className="card">
          <h3>Configuration applicative (lecture seule)</h3>
          <div className="grid cols-2 mt16">
            <Row k="Origines CORS" v={config.corsOrigins} />
            <Row k="Émetteur Worker" v={config.workerIssuer} />
            <Row k="Audience" v={config.workerAudience} />
            <Row k="TTL assertion" v={config.workerAssertionTtl} />
            <Row k="VAPID configuré" v={config.vapidConfigured ? 'Oui' : 'Non'} />
            <Row k="Superadmin configuré" v={config.superAdminConfigured ? 'Oui' : 'Non'} />
            <Row k="Compte bootstrap" v={config.bootstrapAdminUsername} />
          </div>
        </div>
      )}

      <div className="card mt16">
        <h3>Paramètres métier (persistants)</h3>
        <div className="row mt16">
          <input className="input" placeholder="Clé (ex: queue.prealert.count)" value={key} onChange={(e) => setKey(e.target.value)} />
          <input className="input" placeholder="Valeur" value={value} onChange={(e) => setValue(e.target.value)} />
          <button className="btn btn-primary btn-sm" disabled={!key || !value} onClick={() => save.mutate()}>Enregistrer</button>
        </div>
        {msg && <div className="alert alert-success mt8">{msg}</div>}
        <table className="table mt16">
          <thead><tr><th>Clé</th><th>Valeur</th><th>Modifié par</th></tr></thead>
          <tbody>
            {(settings ?? []).map((s) => (
              <tr key={s.key}>
                <td><code>{s.key}</code></td>
                <td>{s.value}</td>
                <td className="small">{s.updatedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="muted">{k}</span>
      <span>{v ?? '—'}</span>
    </div>
  );
}
