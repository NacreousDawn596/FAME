import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  candidateCsrf: string | null;
  organizerCsrf: string | null;
  setCandidateCsrf: (csrf: string | null) => void;
  setOrganizerCsrf: (csrf: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      candidateCsrf: null,
      organizerCsrf: null,
      setCandidateCsrf: (csrf) => set({ candidateCsrf: csrf }),
      setOrganizerCsrf: (csrf) => set({ organizerCsrf: csrf }),
      clear: () => set({ candidateCsrf: null, organizerCsrf: null }),
    }),
    { name: "fame-auth" }
  )
);
