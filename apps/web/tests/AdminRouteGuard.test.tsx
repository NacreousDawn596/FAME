import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../src/App';
import type { Me } from '../src/api/types';

vi.mock('../src/auth/AuthContext', () => ({
  useAuth: () => ({ me: mockMe, loading: false, error: null, refresh: async () => {}, logout: async () => {}, setMe: () => {} }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let mockMe: Me | null = null;

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Superadmin route guard', () => {
  beforeEach(() => {
    mockMe = null;
    vi.clearAllMocks();
  });

  it('redirects anonymous users to the unified login page', () => {
    mockMe = null;
    renderAt('/admin');
    expect(screen.getByText('FAME')).toBeInTheDocument();
  });

  it('denies a non-superadmin staff member', () => {
    mockMe = { kind: 'staff', id: '1', username: 'admin', displayName: 'Admin', role: 'ADMIN' };
    renderAt('/admin');
    expect(screen.getByText('Accès refusé')).toBeInTheDocument();
  });

  it('denies an organizer', () => {
    mockMe = { kind: 'staff', id: '1', username: 'org', displayName: 'Org', role: 'ORGANIZER' };
    renderAt('/admin');
    expect(screen.getByText('Accès refusé')).toBeInTheDocument();
  });
});
