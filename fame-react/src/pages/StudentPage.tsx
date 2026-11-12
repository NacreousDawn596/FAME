import { useEffect, useState } from 'react'
import { Icon, MobileShell } from '../components/Shared'
import { getPwaInstallState, requestPwaInstall, subscribeToPwaInstall } from '../pwa'
import { api, ApiError } from '../api'
import { connectWebSocket } from '../ws'
import type { CandidateMe } from '../types'
import type { Session } from '../auth'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

function b64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

interface Props {
  session: Session
  onLogout: () => void
  onUnauthorized: () => void
}

export default function StudentPage({ session, onLogout, onUnauthorized }: Props) {
  const [me, setMe] = useState<CandidateMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifState, setNotifState] = useState<'unsupported' | 'granted' | 'denied' | 'idle'>('idle')
  const [notifying, setNotifying] = useState(false)
  const [notifError, setNotifError] = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)

  const load = async (retries = 3) => {
    try {
      setMe(await api.candidateMe())
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onUnauthorized()
      else if (retries > 0) {
        // Transient failure under load (e.g. a pooled connection timeout) —
        // retry with a short backoff instead of leaving the ticket blank.
        setTimeout(() => load(retries - 1), 1000)
        return
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const close = connectWebSocket('/api/v1/ws/candidate', (msg) => {
      if (msg.type === 'queue_changed' || msg.type === 'status_changed') load()
    })
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotifState('unsupported')
    } else if (Notification.permission === 'granted') {
      setNotifState('granted')
      // Permission already granted — ensure a subscription is registered.
      enableNotifications()
    } else if (Notification.permission === 'denied') {
      setNotifState('denied')
    }
    return close
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enableNotifications = async () => {
    setNotifying(true)
    setNotifError('')
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setNotifState('unsupported')
        setNotifError('Ce navigateur ne prend pas en charge les notifications push.')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setNotifState('denied')
        setNotifError('Autorisation refusée par le navigateur.')
        return
      }
      const config = await api.config()
      if (!config.vapid_public_key) {
        setNotifError('Clé VAPID non configurée sur le serveur.')
        return
      }
      const registration = await navigator.serviceWorker.ready
      // Reuse the existing subscription if present (keeps the FCM token stable);
      // only create a new one if the browser has none.
      let sub = await registration.pushManager.getSubscription()
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.vapid_public_key),
        })
      }
      await api.addPushSubscription(
        { endpoint: sub.endpoint, p256dh: b64(sub.getKey('p256dh')), auth: b64(sub.getKey('auth')) },
        session.csrf,
      )
      setNotifState('granted')
    } catch (err) {
      setNotifError(err instanceof Error ? err.message : 'Échec de l’activation des notifications.')
    } finally {
      setNotifying(false)
    }
  }

  const withdraw = async () => {
    try {
      await api.withdraw(session.csrf)
      setConfirmLeave(false)
      await load()
    } catch {
      setConfirmLeave(false)
    }
  }

  const queue = me?.queue
  const candidate = me?.candidate
  const called = queue?.status === 'ATTRIBUTED'
  const waiting = queue?.status === 'WAITING'
  const position = queue?.position
  const step = called ? 2 : waiting && position != null && position <= 2 ? 1 : 0

  if (loading) {
    return <MobileShell step="Mon ticket" onLogout={onLogout}><div className="mobile-content"><p className="search-empty">Chargement de votre ticket…</p></div></MobileShell>
  }

  return (
    <MobileShell step="Mon ticket en direct" onLogout={onLogout}>
      <div className="mobile-content ticket-content">
        <div className="ticket-topline"><span>{queue?.company_name ?? 'FAME'}</span><b><i /> Mise à jour en direct</b></div>

        <section className={`hero-ticket ${called ? 'called' : 'waiting'}`}>
          <div className="status-label">
            <Icon name={called ? 'bell' : 'clock'} />
            <span>STATUT ACTUEL<strong>{called ? 'APPELÉ' : waiting ? 'EN ATTENTE' : queue?.status}</strong></span>
          </div>
          <div className="ticket-number">
            <span>Votre rang actuel</span>
            <strong>{waiting && position != null ? `#${String(position).padStart(2, '0')}` : '—'}</strong>
          </div>
          <div className="eta">
            <Icon name="clock" />
            <span>{called ? 'Présentez-vous maintenant' : waiting ? 'Restez à proximité' : queue?.message}<strong>{queue?.filiere_name ?? ''}</strong></span>
          </div>
          <div className="ticket-pattern" />
        </section>

        <NotificationCard
          state={notifState}
          notifying={notifying}
          error={notifError}
          onEnable={enableNotifications}
        />
        <PwaInstallCard />

        <section className="progress-card">
          <div className="section-title"><span>Progression</span><small>Étape {step + 1} sur 4</small></div>
          <div className="stepper">
            {['En attente', 'En approche', 'Appelé', 'Entretien'].map((label, index) => (
              <div className={index <= step ? 'done' : ''} key={label}>
                <i>{index < step ? <Icon name="check" size={13} /> : index + 1}</i><span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {called && (
          <section className="callout-card">
            <div className="turn-badge"><Icon name="spark" /> C’EST VOTRE TOUR !</div>
            <h2>Présentez-vous au Régulateur</h2>
            {(queue?.regulator || queue?.room) && (
              <div className="location">
                {queue?.regulator && <div><span>RÉGULATEUR</span><strong>{queue.regulator}</strong></div>}
                {queue?.regulator && queue?.room && <i />}
                {queue?.room && <div><span>SALLE</span><strong>{queue.room}</strong></div>}
              </div>
            )}
            <p className="callout-note">{queue?.message}</p>
          </section>
        )}

        {waiting && (
          <button className="leave-button" onClick={() => setConfirmLeave(true)}>
            Quitter la file d’attente <span>(Désistement)</span>
          </button>
        )}

        <div className="ticket-identity">
          <Icon name="id" size={15} />
          <span>{candidate?.first_name} {candidate?.last_name} · {candidate?.ensam_code}</span>
        </div>
      </div>

      {confirmLeave && (
        <div className="modal-backdrop">
          <div className="confirm-modal">
            <button className="modal-close" onClick={() => setConfirmLeave(false)}><Icon name="x" /></button>
            <div className="warning-icon"><Icon name="door" /></div>
            <h2>Quitter la file ?</h2>
            <p>Votre rang sera définitivement libéré. Vous devrez vous réinscrire pour rejoindre une nouvelle file.</p>
            <div>
              <button className="secondary" onClick={() => setConfirmLeave(false)}>Rester dans la file</button>
              <button className="danger" onClick={withdraw}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  )
}

function NotificationCard({ state, notifying, error, onEnable }: { state: 'unsupported' | 'granted' | 'denied' | 'idle'; notifying: boolean; error?: string; onEnable: () => void }) {
  if (state === 'unsupported') return null
  return (
    <section className="pwa-install-card notif-card">
      <div className="pwa-install-mark"><Icon name="bell" size={19} /></div>
      <div className="pwa-install-copy">
        <strong>{state === 'granted' ? 'Notifications activées' : 'Recevez votre appel'}</strong>
        <span>{state === 'granted' ? 'Vous serez averti même si FAME est fermé.' : 'Activez les notifications pour être prévenu quand votre tour approche.'}</span>
      </div>
      {state !== 'granted' && (
        <button className="pwa-install-button" onClick={onEnable} disabled={notifying || state === 'denied'}>
          <Icon name="bell" size={14} /> {state === 'denied' ? 'Bloqué' : notifying ? '…' : 'Activer'}
        </button>
      )}
      {error && <p className="login-error">{error}</p>}
    </section>
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
