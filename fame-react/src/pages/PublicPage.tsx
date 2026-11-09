import { Icon, Logo } from '../components/Shared'

const calls = [
  { table: 'B · 02', ticket: '#A-024', name: 'Karim A.', track: 'GI' },
  { table: 'A · 01', ticket: '#A-019', name: 'Mehdi Z.', track: 'GE' },
  { table: 'C · 05', ticket: '#A-018', name: 'Nora B.', track: 'MSE' },
]

export default function PublicPage() {
  return (
    <div className="public-display">
      <header className="display-header">
        <div className="display-brand"><Logo /><div><strong>PFE RECRUITMENT</strong><span>Campagne Safran Morocco</span></div></div>
        <div className="display-live"><i /> AFFICHAGE EN DIRECT</div>
        <div className="display-clock"><strong>10:24</strong><span>JEUDI 23 JANVIER 2025</span></div>
      </header>
      <main className="board">
        <section className="calls-board">
          <div className="board-heading"><div><span className="pulse-ring"><Icon name="bell" /></span><span><small>APPELS IMMÉDIATS</small><strong>Présentez-vous maintenant</strong></span></div><b>3 APPELS</b></div>
          <div className="calls-list">
            {calls.map((call, index) => <div className={index === 0 ? 'featured' : ''} key={call.ticket}>
              <div className="call-table"><span>STAND · TABLE</span><strong>{call.table}</strong></div>
              <div className="call-ticket"><span>TICKET</span><strong>{call.ticket}</strong></div>
              <div className="call-name"><strong>{call.name}</strong><span><i>{call.track}</i> Dirigez-vous vers le régulateur</span></div>
              <Icon name="arrow" size={34} />
            </div>)}
          </div>
        </section>
        <section className="next-board">
          <div className="board-heading"><div><span className="approach-icon"><Icon name="clock" /></span><span><small>PROCHAINS CANDIDATS</small><strong>Préparez-vous</strong></span></div><b>EN APPROCHE</b></div>
          <div className="next-grid">
            {[
              ['#A-025', 'Lina B.', 'GI'], ['#A-026', 'Omar F.', 'GM'], ['#A-027', 'Sara A.', 'GI'],
              ['#A-028', 'Youssef L.', 'GE'], ['#A-029', 'Imane K.', 'IInd'], ['#A-030', 'Adam R.', 'MSE'],
            ].map((person, index) => <div key={person[0]}><span>{String(index + 1).padStart(2, '0')}</span><strong>{person[0]}</strong><p>{person[1]} <i>{person[2]}</i></p></div>)}
          </div>
          <div className="prepare-note"><Icon name="id" /><span><strong>Préparez votre carte d’étudiant</strong>Restez à proximité de la zone de dispatch</span></div>
        </section>
      </main>
      <div className="ticker"><span className="ticker-label"><Icon name="bell" /> INFORMATIONS</span><div><span>Gardez votre carte d’étudiant prête</span><i /> <span>Tout retard de plus de 5 minutes entraîne le repositionnement en fin de file</span><i /> <span>Merci de respecter le silence dans la zone d’attente</span></div><span className="ensam-sign">ENSAM MEKNÈS · UMI</span></div>
    </div>
  )
}

