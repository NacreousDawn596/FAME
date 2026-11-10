import { useState, type FormEvent } from 'react'
import { Icon, Logo, Footer } from '../components/Shared'
import { api, authenticateWithSchoolApp } from '../api'
import { setSession, type Session } from '../auth'

type Mode = 'student' | 'organizer'

export default function LoginPage({ onSuccess }: { onSuccess: (session: Session) => void }) {
  const [mode, setMode] = useState<Mode>('student')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'student') {
        const assertion = await authenticateWithSchoolApp(email.trim(), password)
        const result = await api.schoolappLogin(assertion)
        const name = `${result.candidate.first_name} ${result.candidate.last_name}`.trim()
        onSuccess(
          setSession(
            'candidate',
            result.csrf,
            name,
            result.candidate.email ?? '',
            result.candidate.phone ?? '',
            false,
          ),
        )
      } else {
        const result = await api.organizerLogin(username.trim(), password)
        onSuccess(setSession('organizer', result.csrf, result.username))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible. Vérifiez vos identifiants.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
  }

  return (
    <div className="signin-screen">
      <div className="top-accent"><span /></div>
      <main className="signin-main signin-main-simple">
        <section className="signin-card schoolapp-login-card">
          <div className="login-brand"><Logo /></div>
          <span className="eyebrow">ESPACE DE CONNEXION</span>
          <h1>{mode === 'student' ? 'Connexion SchoolApp' : 'Espace organisateur'}</h1>
          <p className="intro">
            {mode === 'student'
              ? 'Connectez-vous avec vos identifiants institutionnels ENSAM / UMI pour accéder à FAME.'
              : 'Réservé à l’équipe organisatrice. Utilisez vos identifiants organisateur.'}
          </p>

          <form className="schoolapp-form" onSubmit={submit}>
            {mode === 'student' ? (
              <>
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
              </>
            ) : (
              <>
                <label htmlFor="organizer-username">Nom d’utilisateur</label>
                <div className="schoolapp-input-wrap">
                  <Icon name="user" size={17} />
                  <input
                    id="organizer-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="votre.nom"
                    required
                  />
                </div>
              </>
            )}
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
                placeholder={mode === 'student' ? 'Votre mot de passe SchoolApp' : 'Votre mot de passe'}
                required
              />
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="primary schoolapp-submit" type="submit" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'} <Icon name="arrow" size={17} />
            </button>
          </form>

          <div className="login-secure-note"><Icon name="shield" size={15} /> Authentification institutionnelle sécurisée</div>

          <div className="login-mode-switch">
            {mode === 'student' ? (
              <button type="button" onClick={() => switchMode('organizer')}>
                <Icon name="users" size={15} /> Espace organisateur
              </button>
            ) : (
              <button type="button" onClick={() => switchMode('student')}>
                <Icon name="user" size={15} /> Espace étudiant (SchoolApp)
              </button>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
