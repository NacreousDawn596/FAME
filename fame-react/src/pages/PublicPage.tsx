import { useEffect, useState } from 'react'
import { Icon, Logo } from '../components/Shared'
import { api } from '../api'
import type { PublicDisplay } from '../types'

export default function PublicPage() {
  const [display, setDisplay] = useState<PublicDisplay | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const load = () => api.publicDisplay().then(setDisplay).catch(() => {})
    load()
    const interval = setInterval(load, 5000)
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => {
      clearInterval(interval)
      clearInterval(clock)
    }
  }, [])

  const calls = display?.calls ?? []
  const next = display?.next ?? []

  return (
    <div className="public-display">
      <header className="display-header">
        <div className="display-brand"><Logo /><div><strong>PFE RECRUITMENT</strong><span>{display?.company_name ?? 'FAME'}</span></div></div>
        <div className="display-live"><i /> AFFICHAGE EN DIRECT</div>
        <div className="display-clock"><strong>{now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong><span>{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</span></div>
      </header>
      <main className="board">
        <section className="calls-board">
          <div className="board-heading">
            <div><span className="pulse-ring"><Icon name="bell" /></span><span><small>APPELS IMMÉDIATS</small><strong>Présentez-vous maintenant</strong></span></div>
            <b>{calls.length} {calls.length === 1 ? 'APPEL' : 'APPELS'}</b>
          </div>
          <div className="calls-list">
            {calls.length === 0 && <div className="empty-board">Aucun appel en cours pour le moment.</div>}
            {calls.map((call, index) => (
              <div className={index === 0 ? 'featured' : ''} key={`${call.candidate_name}-${index}`}>
                <div className="call-table"><span>FILIÈRE</span><strong>{call.filiere_code ?? '—'}</strong></div>
                <div className="call-ticket"><span>APPELÉ</span><strong>Maintenant</strong></div>
                <div className="call-name"><strong>{call.candidate_name}</strong><span><i>{call.filiere_code ?? ''}</i> Dirigez-vous vers le régulateur</span></div>
                <Icon name="arrow" size={34} />
              </div>
            ))}
          </div>
        </section>
        <section className="next-board">
          <div className="board-heading"><div><span className="approach-icon"><Icon name="clock" /></span><span><small>PROCHAINS CANDIDATS</small><strong>Préparez-vous</strong></span></div><b>EN APPROCHE</b></div>
          <div className="next-grid">
            {next.length === 0 && <div className="empty-board">Aucun candidat en attente.</div>}
            {next.map((person, index) => (
              <div key={`${person.candidate_name}-${index}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{person.candidate_name}</strong>
                <p>{person.filiere_code ?? '—'} <i>en attente</i></p>
              </div>
            ))}
          </div>
          <div className="prepare-note"><Icon name="id" /><span><strong>Préparez votre carte d’étudiant</strong>Restez à proximité de la zone de dispatch</span></div>
        </section>
      </main>
      <div className="ticker"><span className="ticker-label"><Icon name="bell" /> INFORMATIONS</span><div><span>Gardez votre carte d’étudiant prête</span><i /> <span>Tout retard de plus de 5 minutes entraîne le repositionnement en fin de file</span><i /> <span>Merci de respecter le silence dans la zone d’attente</span></div><span className="ensam-sign">ENSAM MEKNÈS · UMI</span></div>
    </div>
  )
}
