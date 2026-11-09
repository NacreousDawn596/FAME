import { useEffect, useState } from 'react'
import { AppHeader, Icon } from '../components/Shared'
import { api, ApiError } from '../api'
import { connectWebSocket } from '../ws'
import type { CandidateRow, DashboardResponse, FiliereQueue } from '../types'
import type { Session } from '../auth'

interface Props {
  session: Session
  onLogout: () => void
  onOpenPublic: () => void
  onUnauthorized: () => void
}

export default function OrganizerPage({ session, onLogout, onOpenPublic, onUnauthorized }: Props) {
  const [queues, setQueues] = useState<FiliereQueue[]>([])
  const [stats, setStats] = useState<DashboardResponse['stats'] | null>(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<CandidateRow[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [lastAction, setLastAction] = useState<{ name: string; code: string } | null>(null)

  const load = async () => {
    try {
      const [dashboard, queueList] = await Promise.all([api.dashboard(), api.queues()])
      setStats(dashboard.stats)
      setQueues(queueList)
      const latest = dashboard.recent_operations[0]
      if (latest && (latest.operation_type === 'FIFO' || latest.operation_type === 'MANUAL')) {
        setLastAction({ name: latest.ensam_code, code: latest.ensam_code })
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onUnauthorized()
    }
  }

  useEffect(() => {
    load()
    const close = connectWebSocket('/api/v1/ws/organizer', (msg) => {
      if (msg.type === 'board_changed') load()
    })
    return close
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced candidate search.
  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.candidates(search.trim())
        setResults(res.items.filter((c) => c.status === 'WAITING'))
      } catch {
        setResults([])
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const attributeNext = async (filiere: string) => {
    try {
      const result = await api.fifoAttribute(filiere, session.csrf)
      setNotice(`${result.first_name} ${result.last_name} a été attribué(e).`)
      setSelectedId(null)
      setSearch('')
      await load()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Aucun candidat en attente.')
    }
  }

  const attributeManual = async () => {
    if (selectedId == null) return
    try {
      const result = await api.manualAttribute(selectedId, session.csrf)
      setNotice(`${result.first_name} ${result.last_name} a été attribué(e) manuellement.`)
      setSelectedId(null)
      setSearch('')
      await load()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Attribution impossible.')
    }
  }

  const undoLast = async () => {
    try {
      await api.undoLast(session.csrf)
      setNotice('Attribution annulée.')
      setLastAction(null)
      await load()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Aucune attribution à annuler.')
    }
  }

  const waitingTotal = stats?.waiting ?? queues.reduce((sum, q) => sum + q.waiting, 0)
  const attributedTotal = stats?.attributed ?? queues.reduce((sum, q) => sum + q.attributed, 0)
  const totalCandidates = stats?.total_candidates ?? waitingTotal + attributedTotal

  return (
    <div className="organizer-page">
      <AppHeader company="Safran Morocco" userName={session.name} userRole="Organisateur" onLogout={onLogout} onOpenPublic={onOpenPublic} />
      <main className="organizer-main">
        <section className="organizer-heading">
          <div>
            <span className="eyebrow">ESPACE ORGANISATEUR · CONTRÔLE CENTRAL</span>
            <h1>Gestion des attributions</h1>
            <p>Une seule file par filière. Attribution FIFO ou sélection manuelle, avec annulation possible.</p>
          </div>
          <div className="organizer-live"><i /> Campagne active</div>
        </section>

        <section className="organizer-stats">
          <article><span className="stat-icon blue"><Icon name="users" /></span><div><small>Candidats inscrits</small><strong>{totalCandidates}</strong><em>Sur toutes les filières</em></div></article>
          <article><span className="stat-icon amber"><Icon name="clock" /></span><div><small>En attente</small><strong>{waitingTotal}</strong><em>Position recalculée en direct</em></div></article>
          <article><span className="stat-icon green"><Icon name="check" /></span><div><small>Déjà attribués</small><strong>{attributedTotal}</strong><em>Historique conservé</em></div></article>
        </section>

        {notice && <div className="organizer-notice"><Icon name="check" />{notice}<button onClick={() => setNotice('')} aria-label="Fermer">×</button></div>}

        <div className="organizer-grid">
          <section className="organizer-panel filiere-panel">
            <div className="organizer-panel-head">
              <div><span className="eyebrow">ATTRIBUTION AUTOMATIQUE</span><h2>Files par filière</h2></div>
              <span className="fifo-pill"><Icon name="shield" size={13} /> FIFO activé</span>
            </div>
            <div className="filiere-list">
              {queues.length === 0 && <p className="search-empty">Aucune filière active pour le moment.</p>}
              {queues.map((queue) => {
                const hasNext = queue.first_waiting != null
                return (
                  <article className="filiere-queue" key={queue.code}>
                    <div className="filiere-queue-top">
                      <div><strong>{queue.code}</strong><span>{queue.intitule}</span></div>
                      <b>{queue.waiting} <small>en attente</small></b>
                    </div>
                    <div className="filiere-next">
                      {hasNext ? (
                        <><div className="avatar">{queue.code.slice(0, 2)}</div><div><small>PROCHAIN CANDIDAT</small><strong>{queue.first_waiting}</strong><span>{queue.code}</span></div></>
                      ) : <div className="empty-queue">La file est vide pour cette filière.</div>}
                      <button className="primary fifo-button" disabled={!hasNext} onClick={() => attributeNext(queue.code)}>Attribuer le suivant <Icon name="arrow" size={14} /></button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <aside className="organizer-side">
            <section className="organizer-panel manual-panel">
              <div className="organizer-panel-head"><div><span className="eyebrow">ATTRIBUTION MANUELLE</span><h2>Rechercher un candidat</h2></div><Icon name="user" /></div>
              <label className="candidate-search">Nom, code ENSAM ou filière<input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedId(null) }} placeholder="Ex. Karim Amrani" /></label>
              <div className="manual-results">
                {search.trim() ? results.map((candidate) => (
                  <button className={`manual-result ${selectedId === candidate.id ? 'selected' : ''}`} key={candidate.id} onClick={() => setSelectedId(candidate.id)}>
                    <div className="avatar small">{(candidate.first_name[0] ?? '') + (candidate.last_name[0] ?? '')}</div>
                    <span><strong>{candidate.first_name} {candidate.last_name}</strong><small>{candidate.ensam_code} · {candidate.filiere_code}</small></span>
                    <i>{selectedId === candidate.id ? <Icon name="check" size={15} /> : <Icon name="chevron" size={15} />}</i>
                  </button>
                )) : <p className="search-empty">Saisissez un nom ou un code pour afficher les candidats en attente.</p>}
                {search.trim() && results.length === 0 && <p className="search-empty">Aucun candidat en attente ne correspond à cette recherche.</p>}
              </div>
              <button className="primary manual-attribute" disabled={selectedId == null} onClick={attributeManual}>Attribuer le candidat sélectionné <Icon name="arrow" size={14} /></button>
            </section>

            <section className="organizer-panel undo-panel">
              <div className="organizer-panel-head"><div><span className="eyebrow">SÉCURITÉ DES OPÉRATIONS</span><h2>Dernière attribution</h2></div><Icon name="refresh" /></div>
              {lastAction ? <><div className="last-action"><div className="avatar">{lastAction.name.slice(0, 2)}</div><div><strong>{lastAction.name}</strong><span>{lastAction.code}</span></div></div><button className="undo-button" onClick={undoLast}><Icon name="refresh" size={15} /> Annuler la dernière attribution</button></> : <p className="search-empty">Aucune attribution récente à annuler.</p>}
            </section>
          </aside>
        </div>

        <section className="organizer-panel all-queues-panel">
          <div className="organizer-panel-head"><div><span className="eyebrow">VUE D’ENSEMBLE</span><h2>Répartition des files</h2></div><span className="updated-label"><i /> Actualisé à l’instant</span></div>
          <div className="queue-summary-grid">
            {queues.map((queue) => <div key={queue.code}><strong>{queue.code}</strong><span>{queue.waiting} en attente</span><div><i style={{ width: `${Math.min(100, queue.waiting * 12)}%` }} /></div><small>{queue.attributed} attribués</small></div>)}
          </div>
        </section>
        <footer className="organizer-footer"><span>© 2025 ENSAM Meknès — Université Moulay Ismaïl</span><span>FAME · Console organisateur</span></footer>
      </main>
    </div>
  )
}
