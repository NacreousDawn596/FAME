import type {
  AttributionResult,
  CandidateMe,
  CandidateRow,
  DashboardResponse,
  FiliereQueue,
  PublicConfig,
  PublicDisplay,
} from './types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}, csrf?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (csrf) headers['X-CSRF-Token'] = csrf

  const res = await fetch(path, { ...options, headers, credentials: 'include' })

  if (res.status === 204) return undefined as T

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const detail =
      (body as { detail?: string; error?: string } | null)?.detail ??
      (body as { error?: string } | null)?.error ??
      res.statusText
    throw new ApiError(res.status, detail)
  }

  return body as T
}

export const api = {
  config: () => request<PublicConfig>('/api/v1/config/public'),

  // Candidate
  schoolappLogin: (assertion: string) =>
    request<{ candidate: CandidateMe['candidate']; csrf: string }>('/api/v1/auth/schoolapp', {
      method: 'POST',
      body: JSON.stringify({ assertion }),
    }),
  candidateMe: () => request<CandidateMe>('/api/v1/candidate/me'),
  addPushSubscription: (sub: { endpoint: string; p256dh: string; auth: string }, csrf: string) =>
    request('/api/v1/candidate/push-subscriptions', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: JSON.stringify(sub),
    }),
  withdraw: (csrf: string) =>
    request('/api/v1/candidate/withdraw', { method: 'POST', headers: { 'X-CSRF-Token': csrf } }),

  // Organizer auth
  organizerLogin: (username: string, password: string) =>
    request<{ username: string; email: string | null; csrf: string }>(
      '/api/v1/organizer/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) },
    ),

  // Organizer data
  dashboard: () => request<DashboardResponse>('/api/v1/organizer/dashboard'),
  queues: () => request<FiliereQueue[]>('/api/v1/organizer/queues'),
  candidates: (search: string) =>
    request<{ items: CandidateRow[]; total: number }>(
      `/api/v1/organizer/candidates?search=${encodeURIComponent(search)}`,
    ),

  // Attribution
  fifoAttribute: (filiereCode: string | null, csrf: string) =>
    request<AttributionResult>('/api/v1/organizer/attributions/fifo', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: JSON.stringify({ filiere_code: filiereCode }),
    }),
  manualAttribute: (candidateId: number, csrf: string) =>
    request<AttributionResult>('/api/v1/organizer/attributions/manual', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
      body: JSON.stringify({ candidate_id: candidateId }),
    }),
  undoLast: (csrf: string) =>
    request<AttributionResult>('/api/v1/organizer/operations/undo-last', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
    }),

  // Public
  publicDisplay: () => request<PublicDisplay>('/api/v1/public/display'),
}

export async function authenticateWithSchoolApp(username: string, password: string): Promise<string> {
  const config = await api.config()
  const res = await fetch(`${config.schoolapp_worker_url}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  let body: { assertion?: string; error?: string } = {}
  try {
    body = await res.json()
  } catch {
    /* ignore */
  }
  if (!res.ok || !body.assertion) {
    throw new Error(body.error ?? 'SchoolApp authentication failed')
  }
  return body.assertion
}
