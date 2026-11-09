import type { ReactNode } from 'react'

export type IconName =
  | 'arrow'
  | 'bell'
  | 'building'
  | 'check'
  | 'chevron'
  | 'clock'
  | 'door'
  | 'filter'
  | 'google'
  | 'headset'
  | 'id'
  | 'layers'
  | 'lock'
  | 'mail'
  | 'map'
  | 'pause'
  | 'phone'
  | 'play'
  | 'refresh'
  | 'shield'
  | 'spark'
  | 'user'
  | 'users'
  | 'x'

const icons: Record<IconName, ReactNode> = {
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  building: <><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1M14 10h1M9 14h1M14 14h1M10 21v-3h4v3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  door: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M15 4h5v16h-5" /></>,
  filter: <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />,
  google: <><path d="M20.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.5h4.8a4 4 0 0 1-1.8 2.7v2.3h2.9c1.7-1.5 2.7-3.8 2.7-6.6Z" /><path d="M12 21c2.4 0 4.5-.8 6-2.2l-2.9-2.3c-.8.6-1.9.9-3.1.9a5.3 5.3 0 0 1-5-3.7H4v2.4A9 9 0 0 0 12 21Z" /><path d="M7 13.7a5.4 5.4 0 0 1 0-3.4V7.9H4a9 9 0 0 0 0 8.2l3-2.4Z" /><path d="M12 6.6c1.4 0 2.6.5 3.5 1.4l2.6-2.6A8.8 8.8 0 0 0 4 7.9l3 2.4a5.3 5.3 0 0 1 5-3.7Z" /></>,
  headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14v3a2 2 0 0 0 2 2h2v-7H6a2 2 0 0 0-2 2ZM20 14v3a2 2 0 0 1-2 2h-2v-7h2a2 2 0 0 1 2 2ZM16 19c0 2-2 2-4 2" /></>,
  id: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="11" r="2" /><path d="M5.5 16c.7-2 4.3-2 5 0M13 10h5M13 14h4" /></>,
  layers: <><path d="m12 3-9 5 9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
  pause: <><path d="M9 8v8M15 8v8" /><circle cx="12" cy="12" r="9" /></>,
  phone: <path d="M7 3h3l1.5 5-2 1.5a14 14 0 0 0 5 5L16 12.5l5 1.5v3c0 2-2 4-4 4C9 21 3 15 3 7c0-2 2-4 4-4Z" />,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></>,
  refresh: <><path d="M20 7h-6V1" /><path d="M20 7a9 9 0 1 0 1 8" /></>,
  shield: <><path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-3Z" /><path d="m9 12 2 2 4-5" /></>,
  spark: <><path d="m12 3 1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2L12 3Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  x: <path d="m6 6 12 12M18 6 6 18" />,
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{icons[name]}</svg>
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`logo ${compact ? 'logo-compact' : ''}`}>
      <div className="logo-mark"><span>F</span><i /></div>
      {!compact && <div className="logo-copy"><strong>FAME</strong><small>ENSAM MEKNÈS</small></div>}
    </div>
  )
}

export function AppHeader({ student = false, onLogout, onOpenPublic }: { student?: boolean; onLogout?: () => void; onOpenPublic?: () => void }) {
  return (
    <header className={`app-header ${student ? 'student-app-header' : ''}`}>
      <div className="header-left">
        <Logo />
        <div className="header-rule" />
        <div className="system-title"><strong>PFE Recruitment</strong><span>Gestion des files d’attente</span></div>
        <span className="campaign-pill"><i /> Campagne : Safran Morocco</span>
      </div>
      <div className="user-area">
        <button className="icon-button"><Icon name="bell" /><span className="notification-dot" /></button>
        <div className="user-chip">
          <div className="avatar">{student ? 'SE' : 'YA'}</div>
          <div><strong>{student ? 'Salma El Amrani' : 'Yassine Aït Omar'}</strong><span>{student ? 'Étudiante 5ème année' : 'Comité / Régulateur'}</span></div>
        </div>
        <>{onOpenPublic && <button className="public-open-button" onClick={onOpenPublic}><Icon name="arrow" /> <span>Écran public</span></button>}<button className="logout" onClick={onLogout}><Icon name="door" /> <span>Déconnexion</span></button></>
      </div>
    </header>
  )
}

export function Footer() {
  return <footer><span>© 2025 ENSAM Meknès — Université Moulay Ismaïl</span><a href="mailto:support@ensam-umi.ac.ma"><Icon name="headset" /> Assistance technique</a></footer>
}

export function MobileShell({ children, step: _step, onLogout }: { children: ReactNode; step: string; onLogout?: () => void }) {
  return (
    <div className="student-page">
      <AppHeader student onLogout={onLogout} />
      <main className="mobile-stage">
        <div className="student-content-wrap">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
