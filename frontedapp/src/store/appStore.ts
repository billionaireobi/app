import { create } from 'zustand';
import type { Notification } from '../types';

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

  // Notifications
  unreadNotifications: Notification[];
  unreadCount: number;
  setUnreadNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  markNotificationAsRead: (id: number) => void;
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

  unreadNotifications: [],
  unreadCount: 0,
  setUnreadNotifications: (notifications) => set({ unreadNotifications: notifications, unreadCount: notifications.length }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  markNotificationAsRead: (id) =>
    set((state) => ({
      unreadNotifications: state.unreadNotifications.filter((n) => n.id !== id),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
}));
