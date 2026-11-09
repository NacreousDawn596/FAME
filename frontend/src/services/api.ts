import type {
  AttributionResult,
  CandidateMe,
  CandidateRow,
  DashboardResponse,
  Filiere,
  FiliereQueue,
  FiliereQueueDetail,
  HistoryItem,
  NotificationItem,
  PublicConfig,
  QueueStatusResponse,
} from "@/types";

const API_URL = __API_URL__;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });
  if (res.status === 401) {
    throw new ApiError(401, "Unauthorized");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? body.error ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const api = {
  // Candidate
  schoolappLogin: (assertion: string) =>
    request<{ candidate: CandidateMe["candidate"]; csrf: string }>("/api/v1/auth/schoolapp", {
      method: "POST",
      body: JSON.stringify({ assertion }),
    }),
  me: () => request<CandidateMe>("/api/v1/candidate/me"),
  queue: () => request<QueueStatusResponse>("/api/v1/candidate/queue"),
  logout: () => request<{ ok: boolean }>("/api/v1/auth/logout", { method: "POST" }),
  addPushSubscription: (sub: {
    endpoint: string;
    p256dh: string;
    auth: string;
    expiration_time?: string | null;
  }, csrf: string) =>
    request("/api/v1/candidate/push-subscriptions", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
      body: JSON.stringify(sub),
    }),
  removePushSubscription: (id: number, csrf: string) =>
    request(`/api/v1/candidate/push-subscriptions/${id}`, {
      method: "DELETE",
      headers: { "X-CSRF-Token": csrf },
    }),

  // Config
  publicConfig: () => request<PublicConfig>("/api/v1/config/public"),

  // Organizer auth
  organizerLogin: (username: string, password: string) =>
    request<{ username: string; email: string | null; csrf: string }>(
      "/api/v1/organizer/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) }
    ),
  organizerLogout: (csrf: string) =>
    request("/api/v1/organizer/auth/logout", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
    }),

  // Organizer data
  dashboard: () => request<DashboardResponse>("/api/v1/organizer/dashboard"),
  filieres: () => request<Filiere[]>("/api/v1/organizer/filieres"),
  queues: () => request<FiliereQueue[]>("/api/v1/organizer/queues"),
  queueDetail: (code: string) =>
    request<FiliereQueueDetail>(`/api/v1/organizer/queues/${code}`),
  candidates: (params: { search?: string; filiere?: string; status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.filiere) q.set("filiere", params.filiere);
    if (params.status) q.set("status", params.status);
    if (params.page) q.set("page", String(params.page));
    return request<{ items: CandidateRow[]; total: number }>(
      `/api/v1/organizer/candidates?${q.toString()}`
    );
  },
  history: (page = 1) =>
    request<{ items: HistoryItem[]; total: number }>(`/api/v1/organizer/history?page=${page}`),
  notifications: (page = 1) =>
    request<{ items: NotificationItem[]; total: number }>(
      `/api/v1/organizer/notifications?page=${page}`
    ),

  // Attribution operations
  fifoAttribute: (filiereCode: string | null, csrf: string) =>
    request<AttributionResult>("/api/v1/organizer/attributions/fifo", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
      body: JSON.stringify({ filiere_code: filiereCode }),
    }),
  manualAttribute: (candidateId: number, csrf: string) =>
    request<AttributionResult>("/api/v1/organizer/attributions/manual", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
      body: JSON.stringify({ candidate_id: candidateId }),
    }),
  undoAttribution: (candidateId: number, csrf: string) =>
    request<AttributionResult>(`/api/v1/organizer/attributions/${candidateId}/undo`, {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
    }),
  returnToQueue: (candidateId: number, csrf: string) =>
    request<AttributionResult>(`/api/v1/organizer/attributions/${candidateId}/return`, {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
    }),
  cancelCandidate: (candidateId: number, csrf: string) =>
    request<AttributionResult>(`/api/v1/organizer/candidates/${candidateId}/cancel`, {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
      body: JSON.stringify({ reason: null }),
    }),
  restoreCandidate: (candidateId: number, csrf: string) =>
    request<AttributionResult>(`/api/v1/organizer/candidates/${candidateId}/restore`, {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
    }),
  undoLast: (csrf: string) =>
    request<AttributionResult>("/api/v1/organizer/operations/undo-last", {
      method: "POST",
      headers: { "X-CSRF-Token": csrf },
    }),
};
