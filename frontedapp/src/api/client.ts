import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/**
 * Resolve the API base URL automatically:
 *
 *  • Development (Expo Go / dev build)
 *      Reads the host from the Expo Metro bundler manifest (e.g. "192.168.8.70:8081"),
 *      strips the port, then targets Django on port 8000.
 *      → The IP is detected at runtime so it works on any network without any code change.
 *      → Override: set EXPO_PUBLIC_API_URL in .env.local if you need a non-standard port.
 *
 *  • Production APK (eas build)
 *      Uses EXPO_PUBLIC_API_URL from .env, which is https://zeliaoms.mcdave.co.ke/api/
 *      The Metro host is not available in production builds, so the env var is always used.
 */
function resolveBaseUrl(): string {
  if (__DEV__) {
    // Constants.expoConfig.hostUri  →  "192.168.x.x:8081"  (Expo SDK 49+)
    // (Constants as any).manifest?.debuggerHost  →  same, legacy Expo Go fallback
    const hostUri: string | undefined =
      Constants.expoConfig?.hostUri ??
      (Constants as any).manifest?.debuggerHost;

    if (hostUri) {
      const ip = hostUri.split(':')[0]; // strip the Metro port, keep only the IP
      return `http://${ip}:8000/api/`;
    }

    // Fallback: env var or localhost (e.g. iOS Simulator on the same machine)
    return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/';
  }

  // Production build — always the live server
  return process.env.EXPO_PUBLIC_API_URL ?? 'https://zeliaoms.mcdave.co.ke/api/';
}

export const BASE_URL = resolveBaseUrl();
console.log('[API] Base URL:', BASE_URL);

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach token to every request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Normalize error responses — extract readable message from Django DRF errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Record<string, unknown>>) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('auth_token');
    }

    if (error.response?.data) {
      const d = error.response.data;
      // Only extract DRF error fields when the response is a plain object.
      // If Django returns an HTML debug page (e.g. DisallowedHost, 500),
      // d will be a string — fall through to the generic status message.
      const isJsonObject = d !== null && typeof d === 'object' && !Array.isArray(d);
      const msg = isJsonObject
        ? ((d.detail as string) ||
          (d.error as string) ||
          (d.message as string) ||
          (Array.isArray(d.non_field_errors) ? (d.non_field_errors as string[])[0] : undefined) ||
          extractFirstFieldError(d as Record<string, unknown>) ||
          `Server error (${error.response.status})`)
        : `Server error (${error.response.status})`;
      const enhanced = new Error(msg) as Error & { status: number; data: unknown };
      enhanced.status = error.response.status;
      enhanced.data = d;
      return Promise.reject(enhanced);
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return Promise.reject(new Error('Request timed out. Check your connection.'));
    }

    if (!error.response) {
      return Promise.reject(new Error('No internet connection.'));
    }

    return Promise.reject(error);
  },
);

function extractFirstFieldError(data: Record<string, unknown>): string | undefined {
  // Guard: only process plain objects (not strings, arrays, etc.)
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  for (const key of Object.keys(data)) {
    const val = data[key];
    if (Array.isArray(val) && typeof val[0] === 'string') {
      return `${key}: ${val[0]}`;
    }
    if (typeof val === 'string') return `${key}: ${val}`;
  }
  return undefined;
}

export default apiClient;
