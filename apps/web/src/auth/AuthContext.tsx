import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { Me } from '../api/types';

interface AuthState {
  me: Me | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setMe: (me: Me) => void;
}

const AuthContext = createContext<AuthState>({
  me: null,
  loading: true,
  error: null,
  refresh: async () => {},
  logout: async () => {},
  setMe: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      // Fetch CSRF token first so subsequent POSTs carry it.
      await api.get<{ token: string }>('/auth/csrf').catch(() => undefined);
      const meData = await api.get<Me>('/auth/me');
      setMe(meData);
      setError(null);
    } catch (e) {
      setMe(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    setMe(null);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ me, loading, error, refresh, logout, setMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
