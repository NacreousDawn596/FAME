import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { adminApi } from '../../api/client';
import type { AdminUser } from '../../api/types';

export default function AdminUsersPage() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [role, setRole] = useState('');
  const [revoked, setRevoked] = useState<number | null>(null);

  const [recEmail, setRecEmail] = useState('');
  const [recPassword, setRecPassword] = useState('');
  const [recName, setRecName] = useState('');
  const [recMsg, setRecMsg] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', q, role],
    queryFn: () => adminApi.get<AdminUser[]>(`/users?q=${encodeURIComponent(q)}${role ? `&role=${role}` : ''}`),
  });

  const toggleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      adminApi.patch(`/users/${id}/enabled`, { enabled }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const revoke = useMutation({
    mutationFn: (username: string) => adminApi.post<{ revoked: number }>(`/users/${username}/revoke-sessions`),
    onSuccess: (r) => setRevoked(r.revoked),
  });

  const createRecruiter = useMutation({
    mutationFn: () => adminApi.post('/recruiters', { email: recEmail, password: recPassword, displayName: recName }),
    onSuccess: () => {
      setRecEmail(''); setRecPassword(''); setRecName('');
      setRecMsg('Compte recruteur créé.');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) => setRecMsg(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Étudiants & utilisateurs</h1>
      </div>

      <div className="card mb16">
        <h3>Créer un compte recruteur</h3>
        <div className="row mt16">
          <input className="input" placeholder="Email" type="email" value={recEmail} onChange={(e) => setRecEmail(e.target.value)} />
          <input className="input" placeholder="Mot de passe (min. 8)" type="password" value={recPassword} onChange={(e) => setRecPassword(e.target.value)} />
          <input className="input" placeholder="Nom affiché" value={recName} onChange={(e) => setRecName(e.target.value)} />
          <button className="btn btn-primary btn-sm" disabled={!recEmail || recPassword.length < 8} onClick={() => createRecruiter.mutate()}>
            Créer
          </button>
        </div>
        {recMsg && <div className="alert alert-info mt8">{recMsg}</div>}
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="Rechercher (nom, email, code)" value={q}
          onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Tous les rôles</option>
          <option value="SUPERADMIN">Superadmin</option>
          <option value="ADMIN">Admin</option>
          <option value="ORGANIZER">Organizer</option>
          <option value="RECRUITER">Recruteur</option>
        </select>
      </div>

      {revoked !== null && <div className="alert alert-info">{revoked} session(s) révoquée(s).</div>}

      {isLoading && <div className="loading-center"><span className="spinner" /></div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Nom</th><th>Identifiant</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.displayName}</td>
                <td><code>{u.username}</code></td>
                <td><span className="badge badge-gray">{u.role}</span></td>
                <td>{u.enabled ? <span className="badge badge-green">Actif</span> : <span className="badge badge-red">Désactivé</span>}</td>
                <td>
                  <div className="row">
                    {u.role !== 'SUPERADMIN' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleEnabled.mutate({ id: u.id, enabled: !u.enabled })}>
                        {u.enabled ? 'Désactiver' : 'Réactiver'}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => revoke.mutate(u.username)}>Révoquer les sessions</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(users ?? []).length === 0 && <div className="empty">Aucun utilisateur.</div>}
      </div>
    </div>
  );
}
