import { useState } from 'react'
import { Icon, Logo, Footer } from '../components/Shared'
import { api } from '../api'
import type { Session } from '../auth'

interface Props {
  session: Session
  onConfirm: (email: string, phone: string) => void
  onLogout: () => void
}

export default function ConfirmContact({ session, onConfirm, onLogout }: Props) {
  const [email, setEmail] = useState(session.email || '')
  const [phone, setPhone] = useState(session.phone || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.updateContact(email.trim(), phone.trim(), session.csrf)
      onConfirm(email.trim(), phone.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de confirmer vos coordonnées.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signin-screen">
      <div className="top-accent"><span /></div>
      <main className="signin-main signin-main-simple">
        <section className="signin-card schoolapp-login-card">
          <div className="login-brand"><Logo /></div>
          <span className="eyebrow">CONFIRMATION</span>
          <h1>Confirmez vos coordonnées</h1>
          <p className="intro">
            Vérifiez votre adresse e-mail et votre numéro de téléphone. Ils serviront à vous
            prévenir (e-mail, WhatsApp) quand votre tour approche.
          </p>

          <form className="schoolapp-form" onSubmit={submit}>
            <label htmlFor="confirm-email">Adresse e-mail</label>
            <div className="schoolapp-input-wrap">
              <Icon name="mail" size={17} />
              <input
                id="confirm-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@exemple.com"
                required
              />
            </div>
            <div className="password-label-row">
              <label htmlFor="confirm-phone">Numéro de téléphone (WhatsApp)</label>
            </div>
            <div className="schoolapp-input-wrap">
              <Icon name="phone" size={17} />
              <input
                id="confirm-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="06 XX XX XX XX"
                required
              />
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="primary schoolapp-submit" type="submit" disabled={loading}>
              {loading ? 'Confirmation…' : 'Confirmer et continuer'} <Icon name="arrow" size={17} />
            </button>
          </form>

          <div className="login-secure-note"><Icon name="shield" size={15} /> Ces informations ne sont pas partagées publiquement</div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
