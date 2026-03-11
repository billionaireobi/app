import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '../store/appStore';
import { BASE_URL } from '../api/client';

async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(BASE_URL, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    // Any response (even 4xx) means we have connectivity
    return true;
  } catch {
    return false;
  }
}

/**
 * Monitors network connectivity by periodically pinging the API server.
 * Updates appStore.isOffline accordingly.
 * Re-checks whenever the app comes to foreground.
 */
export function useNetworkStatus() {
  const setOffline = useAppStore((s) => s.setOffline);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    const connected = await checkConnectivity();
    setOffline(!connected);
  }, [setOffline]);

  useEffect(() => {
    // Initial check
    check();

    // Poll every 30 seconds
    intervalRef.current = setInterval(check, 30_000);

    // Re-check when app comes to foreground
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        check();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [check]);
}
