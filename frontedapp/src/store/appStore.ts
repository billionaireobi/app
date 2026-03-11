import { create } from 'zustand';

interface AppStore {
  // Network
  isOffline: boolean;
  setOffline: (offline: boolean) => void;

  // Global error banner (non-crash)
  globalError: string | null;
  setGlobalError: (msg: string | null) => void;
  clearGlobalError: () => void;

  // Loading overlay (for long ops)
  isGlobalLoading: boolean;
  globalLoadingMessage: string;
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isOffline: false,
  setOffline: (offline) => set({ isOffline: offline }),

  globalError: null,
  setGlobalError: (msg) => set({ globalError: msg }),
  clearGlobalError: () => set({ globalError: null }),

  isGlobalLoading: false,
  globalLoadingMessage: 'Loading...',
  setGlobalLoading: (loading, message = 'Loading...') =>
    set({ isGlobalLoading: loading, globalLoadingMessage: message }),
}));
