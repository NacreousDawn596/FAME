import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminApi } from '../../api/client';

interface RecoveryAccount {
  id: string;
  username: string;
  studentCode: string;
  mustChangePassword: boolean;
  expiresAt: string;
  usedAt: string;
}

export default function AdminSecurityPage() {
  const [username, setUsername] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const { data: recovery } = useQuery({
    queryKey: ['admin-recovery'],
    queryFn: () => adminApi.get<RecoveryAccount[]>('/recovery-accounts'),
  });

  const revoke = useMutation({
    mutationFn: (name: string) => adminApi.post<{ revoked: number }>(`/users/${name}/revoke-sessions`),
    onSuccess: (r) => setResult(r.revoked),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Sécurité & sessions</h1>
      </div>

      <div className="card">
        <h3>Révoquer les sessions d’un utilisateur</h3>
        <div className="row mt16">
          <input className="input" placeholder="Identifiant (email)" value={username} onChange={(e) => setUsername(e.target.value)} />
          <button className="btn btn-danger" disabled={!username} onClick={() => revoke.mutate(username)}>Révoquer</button>
        </div>
        {result !== null && <div className="alert alert-info mt8">{result} session(s) révoquée(s).</div>}
      </div>

      <div className="card mt16">
        <h3>Comptes de secours</h3>
        <table className="table mt16">
          <thead><tr><th>Identifiant</th><th>Code étudiant</th><th>MDP à changer</th><th>Expire</th><th>Utilisé</th></tr></thead>
          <tbody>
            {(recovery ?? []).map((a) => (
              <tr key={a.id}>
                <td><code>{a.username}</code></td>
                <td><code>{a.studentCode}</code></td>
                <td>{a.mustChangePassword ? 'Oui' : 'Non'}</td>
                <td className="small">{a.expiresAt ? new Date(a.expiresAt).toLocaleString('fr-MA') : ''}</td>
                <td className="small">{a.usedAt ? new Date(a.usedAt).toLocaleString('fr-MA') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(recovery ?? []).length === 0 && <div className="empty">Aucun compte de secours.</div>}
      </div>
    </div>
  );
}
