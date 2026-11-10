export type Role = 'candidate' | 'organizer'

export interface Session {
  role: Role
  csrf: string
  name: string
  email: string
  phone: string
  contactConfirmed: boolean
}

const STORAGE_KEY = 'fame-session'

export function readSession(): Session | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value ? (JSON.parse(value) as Session) : null
  } catch {
    return null
  }
}

function persist(session: Session | null) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  else localStorage.removeItem(STORAGE_KEY)
}

export function setSession(
  role: Role,
  csrf: string,
  name: string,
  email = '',
  phone = '',
  contactConfirmed = false,
): Session {
  const session: Session = { role, csrf, name, email, phone, contactConfirmed }
  persist(session)
  return session
}

export function updateContact(email: string, phone: string): Session | null {
  const session = readSession()
  if (!session) return null
  session.email = email
  session.phone = phone
  session.contactConfirmed = true
  persist(session)
  return session
}

export function clearSession() {
  persist(null)
}
