import { useMemo, useState } from 'react'
import { AppHeader, Icon } from '../components/Shared'

type Candidate = {
  id: string
  name: string
  code: string
  filiere: string
  year: string
  joined: string
}

type QueueGroup = {
  code: string
  title: string
  waiting: Candidate[]
  attributed: number
}

const initialQueues: QueueGroup[] = [
  {
    code: 'GI-ILSI',
    title: 'Génie Informatique · Ingénierie Logicielle et Systèmes Intelligents',
    attributed: 18,
    waiting: [
      { id: '1', name: 'Karim Amrani', code: 'ENSAM-21-0482', filiere: 'GI-ILSI', year: '5A', joined: '09:14' },
      { id: '2', name: 'Lina Bouzidi', code: 'ENSAM-21-0521', filiere: 'GI-ILSI', year: '5A', joined: '09:19' },
      { id: '3', name: 'Sara Amine', code: 'ENSAM-21-0610', filiere: 'GI-ILSI', year: '5A', joined: '09:24' },
    ],
  },
  {
    code: 'GIP24',
    title: 'Génie Industriel et Productique',
    attributed: 12,
    waiting: [
      { id: '4', name: 'Omar Fassi', code: 'ENSAM-21-0338', filiere: 'GIP24', year: '5A', joined: '09:08' },
      { id: '5', name: 'Imane Kabbaj', code: 'ENSAM-21-0391', filiere: 'GIP24', year: '5A', joined: '09:21' },
    ],
  },
  {
    code: 'GE-DI',
    title: 'Génie Electromécanique · Digitalisation Industrielle',
    attributed: 9,
    waiting: [
      { id: '6', name: 'Mehdi Zahraoui', code: 'ENSAM-21-0274', filiere: 'GE-DI', year: '5A', joined: '09:11' },
      { id: '7', name: 'Nora Benali', code: 'ENSAM-21-0550', filiere: 'GE-DI', year: '5A', joined: '09:28' },
    ],
  },
  {
    code: 'GM-CISM',
    title: 'Génie Mécanique · Conception et Industrialisation',
    attributed: 7,
    waiting: [
      { id: '8', name: 'Youssef Lahlou', code: 'ENSAM-21-0470', filiere: 'GM-CISM', year: '5A', joined: '09:16' },
    ],
  },
]


export default function OrganizerPage({ onLogout, onOpenPublic }: { onLogout: () => void; onOpenPublic: () => void }) {
  const [queues, setQueues] = useState(initialQueues)
  const [search, setSearch] = useState('')
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [recentAction, setRecentAction] = useState<{ candidate: Candidate; filiere: string } | null>(null)
  const [notice, setNotice] = useState('')

  const waitingTotal = queues.reduce((sum, queue) => sum + queue.waiting.length, 0)
  const attributedTotal = queues.reduce((sum, queue) => sum + queue.attributed, 0)
  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLocaleLowerCase()
    if (!q) return []
    return queues.flatMap((queue) => queue.waiting).filter((candidate) =>
      [candidate.name, candidate.code, candidate.filiere].some((value) => value.toLocaleLowerCase().includes(q)),
    )
  }, [queues, search])

  const attributeNext = (filiere: string) => {
    const queue = queues.find((item) => item.code === filiere)
    const candidate = queue?.waiting[0]
    if (!candidate) {
      setNotice(`Aucun candidat en attente dans ${filiere}.`)
      return
    }
    setQueues((current) => current.map((item) => item.code === filiere
      ? { ...item, waiting: item.waiting.slice(1), attributed: item.attributed + 1 }
      : item,
    ))
    setRecentAction({ candidate, filiere })
    setNotice(`${candidate.name} a été attribué(e).`)
  }

  const attributeManual = () => {
    const candidate = filteredCandidates.find((item) => item.id === selectedCandidateId)
    if (!candidate) return
    setQueues((current) => current.map((queue) => queue.code === candidate.filiere
      ? { ...queue, waiting: queue.waiting.filter((item) => item.id !== candidate.id), attributed: queue.attributed + 1 }
      : queue,
    ))
    setRecentAction({ candidate, filiere: candidate.filiere })
    setSearch('')
    setSelectedCandidateId('')
    setNotice(`${candidate.name} a été attribué(e) manuellement.`)
  }

  const undoLast = () => {
    if (!recentAction) return
    const { candidate, filiere } = recentAction
    setQueues((current) => current.map((queue) => queue.code === filiere
      ? { ...queue, waiting: [candidate, ...queue.waiting], attributed: Math.max(0, queue.attributed - 1) }
      : queue,
    ))
    setNotice(`Attribution annulée : ${candidate.name} est revenu(e) en tête de sa file.`)
    setRecentAction(null)
  }

  return (
    <div className="organizer-page">
      <AppHeader onLogout={onLogout} onOpenPublic={onOpenPublic} />
      <main className="organizer-main">
        <section className="organizer-heading">
          <div>
            <span className="eyebrow">ESPACE ORGANISATEUR · CONTRÔLE CENTRAL</span>
            <h1>Gestion des attributions</h1>
            <p>Une seule file par filière. Attribution FIFO ou sélection manuelle, avec annulation possible.</p>
          </div>
          <div className="organizer-live"><i /> Campagne active · Safran Morocco</div>
        </section>

        <section className="organizer-stats">
          <article><span className="stat-icon blue"><Icon name="users" /></span><div><small>Candidats inscrits</small><strong>{waitingTotal + attributedTotal}</strong><em>Sur toutes les filières</em></div></article>
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
              {queues.map((queue) => {
                const next = queue.waiting[0]
                return (
                  <article className="filiere-queue" key={queue.code}>
                    <div className="filiere-queue-top">
                      <div><strong>{queue.code}</strong><span>{queue.title}</span></div>
                      <b>{queue.waiting.length} <small>en attente</small></b>
                    </div>
                    <div className="filiere-next">
                      {next ? <><div className="avatar">{next.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><small>PROCHAIN CANDIDAT · INSCRIT À {next.joined}</small><strong>{next.name}</strong><span>{next.code} · {next.year}</span></div></> : <div className="empty-queue">La file est vide pour cette filière.</div>}
                      <button className="primary fifo-button" disabled={!next} onClick={() => attributeNext(queue.code)}>Attribuer le suivant <Icon name="arrow" size={14} /></button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <aside className="organizer-side">
            <section className="organizer-panel manual-panel">
              <div className="organizer-panel-head"><div><span className="eyebrow">ATTRIBUTION MANUELLE</span><h2>Rechercher un candidat</h2></div><Icon name="user" /></div>
              <label className="candidate-search">Nom, code ENSAM ou filière<input value={search} onChange={(event) => { setSearch(event.target.value); setSelectedCandidateId('') }} placeholder="Ex. Karim Amrani" /></label>
              <div className="manual-results">
                {search.trim() ? filteredCandidates.map((candidate) => (
                  <button className={`manual-result ${selectedCandidateId === candidate.id ? 'selected' : ''}`} key={candidate.id} onClick={() => setSelectedCandidateId(candidate.id)}>
                    <div className="avatar small">{candidate.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><span><strong>{candidate.name}</strong><small>{candidate.code} · {candidate.filiere}</small></span><i>{selectedCandidateId === candidate.id ? <Icon name="check" size={15} /> : <Icon name="chevron" size={15} />}</i>
                  </button>
                )) : <p className="search-empty">Saisissez un nom ou un code pour afficher les candidats en attente.</p>}
                {search.trim() && filteredCandidates.length === 0 && <p className="search-empty">Aucun candidat en attente ne correspond à cette recherche.</p>}
              </div>
              <button className="primary manual-attribute" disabled={!selectedCandidateId} onClick={attributeManual}>Attribuer le candidat sélectionné <Icon name="arrow" size={14} /></button>
            </section>

            <section className="organizer-panel undo-panel">
              <div className="organizer-panel-head"><div><span className="eyebrow">SÉCURITÉ DES OPÉRATIONS</span><h2>Dernière attribution</h2></div><Icon name="refresh" /></div>
              {recentAction ? <><div className="last-action"><div className="avatar">{recentAction.candidate.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{recentAction.candidate.name}</strong><span>{recentAction.candidate.code} · {recentAction.filiere}</span></div></div><button className="undo-button" onClick={undoLast}><Icon name="refresh" size={15} /> Annuler cette attribution</button></> : <p className="search-empty">Aucune attribution récente à annuler.</p>}
            </section>
          </aside>
        </div>

        <section className="organizer-panel all-queues-panel">
          <div className="organizer-panel-head"><div><span className="eyebrow">VUE D’ENSEMBLE</span><h2>Répartition des files</h2></div><span className="updated-label"><i /> Actualisé à l’instant</span></div>
          <div className="queue-summary-grid">
            {queues.map((queue) => <div key={queue.code}><strong>{queue.code}</strong><span>{queue.waiting.length} en attente</span><div><i style={{ width: `${Math.min(100, queue.waiting.length * 12)}%` }} /></div><small>{queue.attributed} attribués</small></div>)}
          </div>
        </section>
        <footer className="organizer-footer"><span>© 2025 ENSAM Meknès — Université Moulay Ismaïl</span><span>FAME · Console organisateur</span></footer>
      </main>
    </div>
  )
}
