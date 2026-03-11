import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { LoadingSpinner } from '../src/components/ui/LoadingSpinner';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Wait for stored auth check to complete before redirecting
  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading ZeliaOMS..." />;
  }

  // <Redirect> is the expo-router way — it waits for the navigator to mount
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
