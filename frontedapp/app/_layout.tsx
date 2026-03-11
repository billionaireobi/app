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
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { SplashScreen } from '../src/components/SplashScreen';
import { Colors } from '../src/constants/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
    },
    mutations: {
      retry: false,
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
  useNetworkStatus();
  useIdleLogout();
  const [showSplash, setShowSplash] = useState(true);

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
