import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as authApi from '../api/auth';
import type { UserProfile, LoginCredentials } from '../types';

interface AuthStore {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: UserProfile) => void;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,   // true until loadStoredAuth() completes on first app launch
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      await SecureStore.setItemAsync(TOKEN_KEY, response.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user));
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      // The API interceptor in client.ts already extracts the server error
      // message and wraps it in new Error(msg), so read .message directly.
      const message =
        (err as Error)?.message ||
        'Login failed. Please check your credentials.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout API errors
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      set({ token: null, user: null, isAuthenticated: false });
    }
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      if (token && userJson) {
        const user = JSON.parse(userJson) as UserProfile;
        set({ token, user, isAuthenticated: true });
      }
    } catch {
      // Storage read failed — stay logged out
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  updateUser: (user) => {
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));

// Convenience selectors
export const selectIsAdmin = (state: AuthStore) => state.user?.is_admin ?? false;
export const selectUser = (state: AuthStore) => state.user;
