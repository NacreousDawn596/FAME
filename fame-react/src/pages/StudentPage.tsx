import { useEffect, useState } from 'react'
import { Icon, MobileShell } from '../components/Shared'
import { getPwaInstallState, requestPwaInstall, subscribeToPwaInstall } from '../pwa'

export default function StudentPage({ onLogout }: { onLogout: () => void }) {
  const called = false
  const [confirmLeave, setConfirmLeave] = useState(false)
  return (
    <MobileShell step="Mon ticket en direct" onLogout={onLogout}>
      <div className="mobile-content ticket-content">
        <div className="ticket-topline"><span>Safran Morocco</span><b><i /> Mise à jour en direct</b></div>
        <section className={`hero-ticket ${called ? 'called' : 'waiting'}`}>
          <div className="status-label"><Icon name={called ? 'bell' : 'clock'} /><span>STATUT ACTUEL<strong>{called ? 'APPELÉ' : 'EN ATTENTE'}</strong></span></div>
          <div className="ticket-number"><span>Votre rang actuel</span><strong>#04</strong></div>
          <div className="eta"><Icon name="clock" /><span>Temps estimé<strong>{called ? 'Présentez-vous maintenant' : '~ 15 min'}</strong></span></div>
          <div className="ticket-pattern" />
        </section>
        <PwaInstallCard />
        <section className="progress-card">
          <div className="section-title"><span>Progression</span><small>Étape {called ? '3' : '1'} sur 4</small></div>
          <div className="stepper">
            {['En attente', 'En approche', 'Appelé', 'Entretien'].map((label, index) => <div className={index <= (called ? 2 : 0) ? 'done' : ''} key={label}><i>{index < (called ? 2 : 0) ? <Icon name="check" size={13} /> : index + 1}</i><span>{label}</span></div>)}
          </div>
        </section>
        {called && (
          <section className="callout-card">
            <div className="turn-badge"><Icon name="spark" /> C’EST VOTRE TOUR !</div>
            <h2>Présentez-vous au Régulateur</h2>
            <div className="location"><div><span>STAND</span><strong>B</strong></div><i /><div><span>TABLE</span><strong>02</strong></div></div>
            <div className="regulator"><div className="avatar">YA</div><div><span>Votre régulateur</span><strong>Yassine Aït Omar</strong></div><b><i /> Sur place</b></div>
          </section>
        )}
        <button className="leave-button" onClick={() => setConfirmLeave(true)}>Quitter la file d’attente <span>(Désistement)</span></button>
      </div>
      {confirmLeave && <div className="modal-backdrop"><div className="confirm-modal"><button className="modal-close" onClick={() => setConfirmLeave(false)}><Icon name="x" /></button><div className="warning-icon"><Icon name="door" /></div><h2>Quitter la file ?</h2><p>Votre rang sera définitivement libéré. Vous devrez vous réinscrire pour rejoindre une nouvelle file.</p><div><button className="secondary" onClick={() => setConfirmLeave(false)}>Rester dans la file</button><button className="danger" onClick={() => setConfirmLeave(false)}>Confirmer</button></div></div></div>}
    </MobileShell>
  )
}



function PwaInstallCard() {
  const [installState, setInstallState] = useState(getPwaInstallState)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => subscribeToPwaInstall(() => setInstallState(getPwaInstallState())), [])

  const install = async () => {
    const choice = await requestPwaInstall()
    if (choice === null) setShowHelp((value) => !value)
    else setShowHelp(false)
  }

  return (
    <section className="pwa-install-card">
      <div className="pwa-install-mark"><Icon name="phone" size={19} /></div>
      <div className="pwa-install-copy">
        <strong>{installState.installed ? 'FAME est installé' : 'Emportez FAME avec vous'}</strong>
        <span>{installState.installed ? 'Retrouvez votre ticket directement depuis votre écran d’accueil.' : 'Installez l’application pour retrouver votre rang en un geste.'}</span>
      </div>
      {!installState.installed && <button className="pwa-install-button" onClick={install}><Icon name="arrow" size={14} /> Installer</button>}
      {showHelp && !installState.installed && <div className="pwa-install-help"><strong>Installation manuelle</strong><span>Sur iPhone : ouvrez Partager puis « Sur l’écran d’accueil ». Sur Android ou ordinateur : ouvrez le menu du navigateur et choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».</span></div>}
    </section>
  )
}
