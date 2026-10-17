import { Link } from 'react-router-dom';

export default function AccessDeniedPage() {
  return (
    <div className="container" style={{ maxWidth: 480, paddingTop: '10vh', textAlign: 'center' }}>
      <div className="card" style={{ padding: 36 }}>
        <h1>Accès refusé</h1>
        <p className="muted">Vous n’avez pas les droits superadmin requis pour accéder à cette page.</p>
        <div className="row mt16" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-secondary" to="/">Retour</Link>
        </div>
      </div>
    </div>
  );
}
