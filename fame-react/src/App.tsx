import { useCallback, useEffect, useState } from 'react'
import LoginPage, { type DemoRole } from './pages/LoginPage'
import StudentPage from './pages/StudentPage'
import OrganizerPage from './pages/OrganizerPage'
import PublicPage from './pages/PublicPage'

type Route = 'login' | 'student' | 'organizer' | 'public'
type Session = { role: DemoRole; email: string }

const routeFromHash = (): Route => {
  const value = window.location.hash.replace(/^#\/?/, '')
  return value === 'student' || value === 'organizer' || value === 'public' ? value : 'login'
}

const readSession = (): Session | null => {
  try {
    const value = window.localStorage.getItem('fame-demo-session')
    return value ? JSON.parse(value) as Session : null
  } catch {
    return null
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [session, setSession] = useState<Session | null>(readSession)

  const navigate = useCallback((next: Route, replace = false) => {
    const nextHash = `#/${next}`
    if (window.location.hash !== nextHash) {
      if (replace) window.history.replaceState(null, '', nextHash)
      else window.history.pushState(null, '', nextHash)
    }
    setRoute(next)
  }, [])

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)
    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  useEffect(() => {
    if (route === 'student' && session?.role !== 'student') navigate('login', true)
    if (route === 'organizer' && session?.role !== 'organizer') navigate('login', true)
  }, [route, session, navigate])

  const signIn = (role: DemoRole, email: string) => {
    const nextSession = { role, email }
    window.localStorage.setItem('fame-demo-session', JSON.stringify(nextSession))
    setSession(nextSession)
    navigate(role === 'organizer' ? 'organizer' : 'student')
  }

  const signOut = () => {
    window.localStorage.removeItem('fame-demo-session')
    setSession(null)
    navigate('login')
  }

  const openPublic = () => {
    const publicUrl = `${window.location.origin}${window.location.pathname}#/public`
    const opened = window.open(publicUrl, '_blank')
    if (opened) opened.opener = null
    else navigate('public')
  }

  return (
    <div className={`app ${route === 'public' ? 'display-mode' : ''}`}>
      {route === 'login' && <LoginPage onSuccess={signIn} />}
      {route === 'student' && <StudentPage onLogout={signOut} />}
      {route === 'organizer' && <OrganizerPage onLogout={signOut} onOpenPublic={openPublic} />}
      {route === 'public' && <PublicPage />}
    </div>
  )
}
