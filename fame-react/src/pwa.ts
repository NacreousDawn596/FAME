export type InstallChoice = 'accepted' | 'dismissed'

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: InstallChoice; platform: string }>
}

export type PwaInstallState = {
  available: boolean
  installed: boolean
}

let deferredPrompt: DeferredInstallPrompt | null = null
let installed = typeof window !== 'undefined' && (
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true
)
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((listener) => listener())

if (typeof window !== 'undefined') {
  // Capture this as soon as the app bundle loads, even while the login page is open.
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault()
    deferredPrompt = event as DeferredInstallPrompt
    emit()
  })

  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    emit()
  })
}

export function getPwaInstallState(): PwaInstallState {
  return { available: deferredPrompt !== null, installed }
}

export function subscribeToPwaInstall(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export async function requestPwaInstall(): Promise<InstallChoice | null> {
  if (!deferredPrompt) return null
  const promptEvent = deferredPrompt
  await promptEvent.prompt()
  const choice = await promptEvent.userChoice
  deferredPrompt = null
  if (choice.outcome === 'accepted') installed = true
  emit()
  return choice.outcome
}
