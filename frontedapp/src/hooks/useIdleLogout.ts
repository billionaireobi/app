import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { AppState, AppStateStatus } from 'react-native';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export function useIdleLogout() {
  const { logout, isAuthenticated } = useAuthStore();
  const appState = useRef(AppState.currentState);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const backgroundTime = useRef<number | null>(null);

  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

    if (!isAuthenticated) return;

    // Set new timer
    inactivityTimer.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    resetInactivityTimer();

    return () => {
      subscription.remove();
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, [isAuthenticated]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to foreground
      const now = Date.now();
      const backgroundDuration = backgroundTime.current ? now - backgroundTime.current : 0;

      // If app was backgrounded for more than inactivity timeout, logout
      if (backgroundDuration > INACTIVITY_TIMEOUT && isAuthenticated) {
        logout();
        return;
      }

      // Reset timer for foreground activity
      resetInactivityTimer();
    } else if (nextAppState.match(/inactive|background/)) {
      // App is going to background, record the time
      backgroundTime.current = Date.now();
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    }

    appState.current = nextAppState;
  };
}
