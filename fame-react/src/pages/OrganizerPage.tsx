import { useEffect, useState } from 'react'
import { AppHeader, Icon } from '../components/Shared'
import { api, ApiError } from '../api'
import { connectWebSocket } from '../ws'
import type { CandidateRow, DashboardResponse, FiliereQueue, PublicConfig, SummonedCandidate } from '../types'
import type { Session } from '../auth'

/** Time window (seconds) the organizer gives a summoned candidate to arrive. */
const SUMMON_SECONDS = 300

/** localStorage keys for the free-text regulator / room (persist unless changed). */
const STORAGE_REGULATOR = 'fame:regulator'
const STORAGE_ROOM = 'fame:room'

interface Props {
  session: Session
  onLogout: () => void
  onOpenPublic: () => void
  onUnauthorized: () => void
}

export default function OrganizerPage({ session, onLogout, onOpenPublic, onUnauthorized }: Props) {
  const [queues, setQueues] = useState<FiliereQueue[]>([])
  const [stats, setStats] = useState<DashboardResponse['stats'] | null>(null)
  const [companyName, setCompanyName] = useState<string>('')
  const [regulator, setRegulator] = useState<string>(() => localStorage.getItem(STORAGE_REGULATOR) ?? '')
  const [room, setRoom] = useState<string>(() => localStorage.getItem(STORAGE_ROOM) ?? '')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<CandidateRow[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [summoned, setSummoned] = useState<SummonedCandidate[]>([])
  const [tick, setTick] = useState(0)
  const [notice, setNotice] = useState('')
  const [lastAction, setLastAction] = useState<{ name: string; code: string } | null>(null)

  const load = async () => {
    try {
      const [dashboard, queueList, config, summonedList] = await Promise.all([
        api.dashboard(),
        api.queues(),
        api.config(),
        api.summoned(),
      ])
      setStats(dashboard.stats)
      setQueues(queueList)
      setSummoned(summonedList)
      setCompanyName(config.company_name ?? '')
      // Default selection: first regulator + its paired room, only if not
      // already set (free text, persisted in localStorage).
      setRegulator((current) => current || (config.regulators?.[0] ?? ''))
      setRoom((current) => current || (config.rooms?.[0] ?? ''))
      const latest = dashboard.recent_operations[0]
      if (latest && (latest.operation_type === 'FIFO' || latest.operation_type === 'MANUAL')) {
        setLastAction({ name: latest.ensam_code, code: latest.ensam_code })
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onUnauthorized()
    }
  }

  // Re-render every second so the countdown timers stay live.
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Persist the free-text regulator / room across reloads.
  useEffect(() => {
    localStorage.setItem(STORAGE_REGULATOR, regulator)
  }, [regulator])

  useEffect(() => {
    localStorage.setItem(STORAGE_ROOM, room)
  }, [room])

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
      const result = await api.fifoAttribute(filiere, regulator || null, room || null, session.csrf)
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
      const result = await api.manualAttribute(selectedId, regulator || null, room || null, session.csrf)
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

  const arrive = async (candidateId: number, name: string) => {
    try {
      await api.arrive(candidateId, session.csrf)
      setNotice(`${name} est arrivé(e).`)
      await load()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Arrivée impossible.')
    }
  }

  const renotify = async (candidateId: number, name: string) => {
    try {
      await api.renotify(candidateId, session.csrf)
      setNotice(`Notification renvoyée à ${name}.`)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Renvoi impossible.')
    }
  }

  const cancelSummon = async (candidateId: number, name: string) => {
    try {
      await api.returnToQueue(candidateId, session.csrf)
      setNotice(`${name} a été renvoyé(e) en fin de file.`)
      await load()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Annulation impossible.')
    }
  }

  const remainingSeconds = (attributedAt: string | null): number => {
    if (!attributedAt) return 0
    const elapsed = (Date.now() - new Date(attributedAt).getTime()) / 1000
    return Math.max(0, Math.round(SUMMON_SECONDS - elapsed))
  }

  const waitingTotal = stats?.waiting ?? queues.reduce((sum, q) => sum + q.waiting, 0)
  const attributedTotal = stats?.attributed ?? queues.reduce((sum, q) => sum + q.attributed, 0)
  const totalCandidates = stats?.total_candidates ?? waitingTotal + attributedTotal

  return (
    <div className="organizer-page">
      <AppHeader company={companyName || 'FAME'} userName={session.name} userRole="Organisateur" onLogout={onLogout} onOpenPublic={onOpenPublic} />
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

        <section className="organizer-panel assignment-panel">
          <div className="organizer-panel-head">
            <div><span className="eyebrow">DISPATCH</span><h2>Régulateur & salle</h2></div>
          </div>
          <div className="assignment-row">
            <label>
              <span>Régulateur</span>
              <input
                type="text"
                value={regulator}
                onChange={(e) => setRegulator(e.target.value)}
                placeholder="Nom du régulateur"
              />
            </label>
            <label>
              <span>Salle</span>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Nom de la salle"
              />
            </label>
          </div>
        </section>

        {notice && <div className="organizer-notice"><Icon name="check" />{notice}<button onClick={() => setNotice('')} aria-label="Fermer">×</button></div>}

        {summoned.length > 0 && (
          <section className="organizer-panel summoned-panel">
            <div className="organizer-panel-head">
              <div>
                <span className="eyebrow">EN ATTENTE D'ARRIVÉE</span>
                <h2>Candidats convoqués ({summoned.length})</h2>
              </div>
              <span className="summoned-live-pill"><i /> Décompte en direct</span>
            </div>
            <div className="summoned-list">
              {summoned.map((c) => {
                const left = remainingSeconds(c.attributed_at)
                const expired = left === 0
                return (
                  <article className={`summoned-card ${expired ? 'expired' : ''}`} key={c.candidate_id}>
                    <div className="summoned-top">
                      <div className="avatar">{c.name.slice(0, 2)}</div>
                      <div className="summoned-info">
                        <strong>{c.name}</strong>
                        <span>{c.ensam_code} · {c.filiere_code ?? 'Sans filière'}</span>
                        <small>Affecté(e) à : {c.regulator ?? '—'} ({c.room ?? '—'})</small>
                      </div>
                      <div className={`summoned-timer ${expired ? 'timer-expired' : ''}`}>
                        <Icon name="clock" size={14} />
                        <strong>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</strong>
                        <small>{expired ? 'Délai dépassé' : 'restant'}</small>
                      </div>
                    </div>
                    <div className="summoned-actions">
                      <button className="primary arrive-button" onClick={() => arrive(c.candidate_id, c.name)}>
                        <Icon name="check" size={14} /> Arrivé(e)
                      </button>
                      <button className="renotify-button" onClick={() => renotify(c.candidate_id, c.name)}>
                        <Icon name="bell" size={14} /> Relancer
                      </button>
                      <button className="cancel-summon-button" onClick={() => cancelSummon(c.candidate_id, c.name)}>
                        <Icon name="refresh" size={14} /> Renvoyer en fin de file
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

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
                  <div className={`manual-result ${selectedId === candidate.id ? 'selected' : ''}`} key={candidate.id}>
                    <div className="manual-result-row">
                      <button className="manual-result-main" onClick={() => setSelectedId(candidate.id)}>
                        <div className="avatar small">{(candidate.first_name[0] ?? '') + (candidate.last_name[0] ?? '')}</div>
                        <span><strong>{candidate.first_name} {candidate.last_name}</strong><small>{candidate.ensam_code} · {candidate.filiere_code}</small></span>
                        <i>{selectedId === candidate.id ? <Icon name="check" size={15} /> : <Icon name="chevron" size={15} />}</i>
                      </button>
                      <button
                        className="profile-expand"
                        onClick={() => setExpandedId((current) => (current === candidate.id ? null : candidate.id))}
                        aria-label="Afficher le profil"
                      >
                        {expandedId === candidate.id ? '−' : '+'}
                      </button>
                    </div>
                    {expandedId === candidate.id && (
                      <div className="profile-detail">
                        <div><small>Nom complet</small><strong>{candidate.first_name} {candidate.last_name}</strong></div>
                        <div><small>Code ENSAM</small><strong>{candidate.ensam_code}</strong></div>
                        <div><small>Année</small><strong>{candidate.year ?? '—'}</strong></div>
                        <div><small>Filière</small><strong>{candidate.filiere_code ?? '—'}</strong></div>
                        <div><small>Email</small><strong>{candidate.email ?? '—'}</strong></div>
                        <div><small>Téléphone</small><strong>{candidate.phone ?? '—'}</strong></div>
                      </div>
                    )}
                  </div>
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
