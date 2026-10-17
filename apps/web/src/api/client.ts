// Base API URL: same-origin reverse proxy by default; set VITE_API_BASE_URL to
// target the API directly (e.g. cross-origin deployments).
const API_ROOT = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function makeRequest(base: string) {
  return async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData)) {
      headers.set('content-type', 'application/json');
    }

    const csrf = getCookie('XSRF-TOKEN');
    if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(init.method ?? 'GET')) {
      headers.set('X-XSRF-TOKEN', csrf);
    }

    const res = await fetch(`${API_ROOT}${base}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });

    if (res.status === 204) {
      return undefined as T;
    }

    const contentType = res.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) {
      const message = typeof body === 'object' && body?.message ? body.message : `HTTP ${res.status}`;
      const code = typeof body === 'object' && body?.code ? body.code : 'ERROR';
      throw new ApiError(res.status, code, message);
    }

    return body as T;
  };
}

function client(base: string) {
  const request = makeRequest(base);
  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
    put: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
    del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
  };
}

/** Versioned public/staff/student API. */
export const api = client('/api/v1');

/** Superadmin control-center API (requires ROLE_SUPERADMIN). */
export const adminApi = client('/api/admin');
