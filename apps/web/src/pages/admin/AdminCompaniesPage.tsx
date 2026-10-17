import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';

interface Company { id: string; name: string; description?: string; }
interface Recruiter { id: string; fullName: string; email?: string; title?: string; }

export default function AdminCompaniesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get<Company[]>('/companies'),
  });

  const { data: recruiters } = useQuery({
    queryKey: ['recruiters', selectedCompany],
    queryFn: () => api.get<Recruiter[]>(`/companies/${selectedCompany}/recruiters`),
    enabled: !!selectedCompany,
  });

  const createCompany = useMutation({
    mutationFn: () => api.post('/admin/companies', { name }),
    onSuccess: () => { setName(''); void queryClient.invalidateQueries({ queryKey: ['companies'] }); },
  });

  const createRecruiter = useMutation({
    mutationFn: () => api.post(`/admin/companies/${selectedCompany}/recruiters`, { fullName: recruiterName, email: recruiterEmail }),
    onSuccess: () => { setRecruiterName(''); setRecruiterEmail(''); void queryClient.invalidateQueries({ queryKey: ['recruiters', selectedCompany] }); },
  });

  return (
    <div>
      <div className="page-header">
        <h1>Entreprises & recruteurs</h1>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Entreprises</h3>
          <div className="row mt16">
            <input className="input" placeholder="Nom de l’entreprise" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={!name} onClick={() => createCompany.mutate()}>Créer</button>
          </div>
          <table className="table mt16">
            <thead><tr><th>Nom</th></tr></thead>
            <tbody>
              {(companies ?? []).map((c) => (
                <tr key={c.id} onClick={() => setSelectedCompany(c.id)} style={{ cursor: 'pointer', background: selectedCompany === c.id ? 'var(--accent-soft)' : undefined }}>
                  <td>{c.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Recruteurs {selectedCompany ? '(entreprise sélectionnée)' : ''}</h3>
          <div className="row mt16">
            <input className="input" placeholder="Nom du recruteur" value={recruiterName} onChange={(e) => setRecruiterName(e.target.value)} />
            <input className="input" placeholder="Email" value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={!selectedCompany || !recruiterName} onClick={() => createRecruiter.mutate()}>Créer</button>
          </div>
          <table className="table mt16">
            <thead><tr><th>Nom</th><th>Email</th></tr></thead>
            <tbody>
              {(recruiters ?? []).map((r) => (
                <tr key={r.id}><td>{r.fullName}</td><td className="small">{r.email}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
