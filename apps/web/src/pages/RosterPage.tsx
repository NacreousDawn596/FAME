import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useI18n } from '../i18n/LocaleContext';

interface RosterEntry {
  studentCode: string;
  email: string;
  fullName: string;
  filiere: string;
}

export default function RosterPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<{ imported: number; duplicates: number; errors: number } | null>(null);
  const [recovery, setRecovery] = useState<{ username: string; password: string } | null>(null);
  const [recoveryCode, setRecoveryCode] = useState('');

  const { data: entries } = useQuery({
    queryKey: ['roster', campaignId],
    queryFn: () => api.get<RosterEntry[]>(`/campaigns/${campaignId}/roster`),
  });

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const result = await api.upload<{ imported: number; duplicates: number; errors: number }>(
      `/campaigns/${campaignId}/roster/import`, form);
    setSummary(result);
    await queryClient.invalidateQueries({ queryKey: ['roster', campaignId] });
  }

  async function issueRecovery() {
    const res = await api.post<{ username: string; password: string }>(
      `/campaigns/${campaignId}/recovery`, { studentCode: recoveryCode });
    setRecovery(res);
  }

  return (
    <div>
      <div className="page-header spread">
        <div>
          <h1>Roster</h1>
          <p className="subtitle">Liste blanche des étudiants éligibles.</p>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>{t('import')} CSV</h3>
          <p className="muted small mb16">Colonnes attendues : code, email, nom, filiere.</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="mb16" />
          <button className="btn btn-primary btn-sm" onClick={() => void upload()}>{t('import')}</button>
          {summary && (
            <div className="alert alert-info mt16">
              Importés : {summary.imported} · Doublons : {summary.duplicates} · Erreurs : {summary.errors}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Compte de secours</h3>
          <p className="muted small mb16">Après vérification physique de la carte étudiant.</p>
          <div className="field">
            <label className="label">Code étudiant (CNE)</label>
            <input className="input" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} />
          </div>
          <button className="btn btn-secondary btn-sm" disabled={!recoveryCode} onClick={() => void issueRecovery()}>
            Générer
          </button>
          {recovery && (
            <div className="alert alert-warning mt16">
              <strong>Identifiants temporaires</strong> (à usage unique) :
              <div className="mt8">Identifiant : <code>{recovery.username}</code></div>
              <div>Mot de passe : <code>{recovery.password}</code></div>
            </div>
          )}
        </div>
      </div>

      <div className="section-title">{t('students')} ({entries?.length ?? 0})</div>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Code</th><th>Nom</th><th>Email</th><th>{t('filiere')}</th></tr>
          </thead>
          <tbody>
            {(entries ?? []).map((e) => (
              <tr key={e.studentCode}>
                <td><code>{e.studentCode}</code></td>
                <td>{e.fullName}</td>
                <td>{e.email}</td>
                <td>{e.filiere}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
