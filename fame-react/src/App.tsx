import { useCallback, useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import StudentPage from './pages/StudentPage'
import OrganizerPage from './pages/OrganizerPage'
import PublicPage from './pages/PublicPage'
import ConfirmContact from './pages/ConfirmContact'
import { clearSession, readSession, updateContact, type Session } from './auth'

type Route = 'login' | 'confirm' | 'student' | 'organizer' | 'public'

const routeFromHash = (): Route => {
  const value = window.location.hash.replace(/^#\/?/, '')
  return value === 'confirm' || value === 'student' || value === 'organizer' || value === 'public'
    ? value
    : 'login'
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

  // Guard protected routes.
  useEffect(() => {
    if (route === 'student' && session?.role !== 'candidate') navigate('login', true)
    if (route === 'organizer' && session?.role !== 'organizer') navigate('login', true)
    if (route === 'confirm' && session?.role !== 'candidate') navigate('login', true)
    // Skip confirmation once the candidate has already confirmed their contact.
    if (route === 'confirm' && session?.contactConfirmed) navigate('student', true)
  }, [route, session, navigate])

  const signIn = (next: Session) => {
    setSession(next)
    if (next.role === 'organizer') navigate('organizer')
    else if (next.contactConfirmed) navigate('student')
    else navigate('confirm')
  }

  const confirmContact = (email: string, phone: string) => {
    const updated = updateContact(email, phone)
    if (updated) setSession(updated)
    navigate('student')
  }

  const signOut = () => {
    clearSession()
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
      {route === 'confirm' && session?.role === 'candidate' && (
        <ConfirmContact session={session} onConfirm={confirmContact} onLogout={signOut} />
      )}
      {route === 'student' && session?.role === 'candidate' && (
        <StudentPage session={session} onLogout={signOut} onUnauthorized={signOut} />
      )}
      {route === 'organizer' && session?.role === 'organizer' && (
        <OrganizerPage session={session} onLogout={signOut} onOpenPublic={openPublic} onUnauthorized={signOut} />
      )}
      {route === 'public' && <PublicPage />}
    </div>
  )
}
