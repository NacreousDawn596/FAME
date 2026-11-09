import { useState, type FormEvent } from 'react'
import { Icon, Logo, Footer } from '../components/Shared'

export type DemoRole = 'student' | 'organizer'

const DEMO_ACCOUNTS = {
  student: {
    email: 'salma.elamrani@edu.umi.ac.ma',
    password: 'fame2025',
    role: 'student' as const,
  },
  organizer: {
    email: 'organisateur@edu.umi.ac.ma',
    password: 'organisateur2025',
    role: 'organizer' as const,
  },
}

export default function LoginPage({ onSuccess }: { onSuccess: (role: DemoRole, email: string) => void }) {
  const [email, setEmail] = useState(DEMO_ACCOUNTS.student.email)
  const [password, setPassword] = useState(DEMO_ACCOUNTS.student.password)
  const [error, setError] = useState('')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const account = Object.values(DEMO_ACCOUNTS).find((item) =>
      item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password,
    )
    if (!account) {
      setError('Adresse SchoolApp ou mot de passe incorrect. Utilisez les identifiants de démonstration ci-dessous.')
      return
    }
    onSuccess(account.role, account.email)
  }

  return (
    <div className="signin-screen">
      <div className="top-accent"><span /></div>
      <main className="signin-main signin-main-simple">
        <section className="signin-card schoolapp-login-card">
          <div className="login-brand"><Logo /></div>
          <span className="eyebrow">ESPACE DE CONNEXION</span>
          <h1>Connexion SchoolApp</h1>
          <p className="intro">Connectez-vous avec vos identifiants institutionnels ENSAM / UMI pour accéder à FAME.</p>

          <form className="schoolapp-form" onSubmit={submit}>
            <label htmlFor="schoolapp-email">Adresse e-mail SchoolApp</label>
            <div className="schoolapp-input-wrap">
              <Icon name="mail" size={17} />
              <input
                id="schoolapp-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="prenom.nom@edu.umi.ac.ma"
                required
              />
            </div>
            <div className="password-label-row">
              <label htmlFor="schoolapp-password">Mot de passe</label>
            </div>
            <div className="schoolapp-input-wrap">
              <Icon name="lock" size={17} />
              <input
                id="schoolapp-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe SchoolApp"
                required
              />
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="primary schoolapp-submit" type="submit">Se connecter <Icon name="arrow" size={17} /></button>
          </form>

          <div className="login-secure-note"><Icon name="shield" size={15} /> Authentification institutionnelle · Démonstration locale</div>
          <section className="demo-credentials" aria-label="Identifiants de démonstration">
            <div className="demo-credentials-title"><span>IDENTIFIANTS DE TEST</span><small>Mode démo</small></div>
            <div className="demo-account"><b>Étudiant</b><span>{DEMO_ACCOUNTS.student.email}</span><code>{DEMO_ACCOUNTS.student.password}</code></div>
            <div className="demo-account"><b>Organisateur</b><span>{DEMO_ACCOUNTS.organizer.email}</span><code>{DEMO_ACCOUNTS.organizer.password}</code></div>
          </section>
        </section>
      </main>
      <Footer />
    </div>
  )
}
