import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store/authStore';
import { useAppStore } from '../src/store/appStore';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { useIdleLogout } from '../src/hooks/useIdleLogout';
import { useNotifications } from '../src/hooks/useNotifications';
import { usePrefetchCommonQueries } from '../src/hooks/usePrefetch';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { SplashScreen } from '../src/components/SplashScreen';
import { Colors } from '../src/constants/colors';

/**
 * Smart retry strategy:
 * - Don't retry auth/permission/not-found errors
 * - Retry timeout/network errors up to 2 times
 * - Exponential backoff: 1s, 2s
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const errorMessage = (error as { message?: string })?.message?.toLowerCase() || '';

  // Don't retry these errors
  if (status === 401 || status === 403 || status === 404) return false;

  // Don't retry after 2 attempts 
  if (failureCount >= 2) return false;

  // Retry on network/timeout errors
  return true;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      staleTime: 1000 * 60 * 5, // 5 minutes default (overridden per query type)
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime, renamed in React Query v5)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: false, // Don't automatically retry mutations
    },
  },
});

function OfflineBanner() {
  const isOffline = useAppStore((s) => s.isOffline);
  if (!isOffline) return null;
  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>⚠ No internet — data may be outdated</Text>
    </View>
  );
}

function AppRoot() {
  const loadStoredAuth = useAuthStore((s) => s.loadStoredAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUnreadNotifications = useAppStore((s) => s.setUnreadNotifications);
  const setUnreadCount = useAppStore((s) => s.setUnreadCount);
  useNetworkStatus();
  useIdleLogout();
  const [showSplash, setShowSplash] = useState(true);

  // Initialize notifications polling
  const { unreadNotifications, unreadCount } = useNotifications();

  // Prefetch common queries after user authenticates to warm up cache
  usePrefetchCommonQueries();

  // Update app store when notifications change
  useEffect(() => {
    if (isAuthenticated) {
      setUnreadNotifications(unreadNotifications);
      setUnreadCount(unreadCount);
    }
  }, [unreadNotifications, unreadCount, isAuthenticated, setUnreadNotifications, setUnreadCount]);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  return (
    <>
      {showSplash && (
        <SplashScreen
          duration={2500}
          onFinish={() => setShowSplash(false)}
        />
      )}
      {!showSplash && (
        <>
          <OfflineBanner />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="light" backgroundColor={Colors.primary} />
          <Toast position="top" topOffset={60} />
        </>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <AppRoot />
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: '#D32F2F',
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
