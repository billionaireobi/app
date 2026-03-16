import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useAppStore } from '../../src/store/appStore';
import { NotificationBadge } from '../../src/components/NotificationBadge';
import { Colors } from '../../src/constants/colors';

/** Height of the visible tab bar above the system navigation area */
const TAB_CONTENT_HEIGHT = 68;
/** Larger icon for easier tapping */
const TAB_ICON_SIZE = 26;

export default function TabLayout() {
  const { isAuthenticated } = useAuthStore();
  const { unreadCount } = useAppStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Total tab bar height = visible content + phone's system navigation area
  const tabBarHeight = TAB_CONTENT_HEIGHT + insets.bottom;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.gray200,
          // Height includes system nav area so the bar sits above it
          height: tabBarHeight,
          // Push label/icon up out of the system nav area
          paddingBottom: insets.bottom + 6,
          paddingTop: 10,
          // Raise bar above any floating system gesture pill
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        // Scene content should not be hidden behind the tab bar
        sceneStyle: {
          paddingBottom: tabBarHeight,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => (
            <Ionicons name="receipt-outline" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color }) => (
            <Ionicons name="cube-outline" size={TAB_ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <View>
              <Ionicons name="menu-outline" size={TAB_ICON_SIZE} color={color} />
              <NotificationBadge count={unreadCount} size="small" />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
