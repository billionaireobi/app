import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { getDashboardStats } from '../../src/api/orders';
import { useAuthStore } from '../../src/store/authStore';
import { StatsCard } from '../../src/components/StatsCard';
import { OrderCard } from '../../src/components/OrderCard';
import { DashboardStatsComponent } from '../../src/components/DashboardStats';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../src/constants/colors';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {user?.user?.first_name ?? user?.user?.username ?? 'User'}
            </Text>
            {user?.is_admin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={11} color={Colors.gold} />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
            {user?.is_salesperson && !user?.is_admin && (
              <View style={[styles.adminBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="briefcase-outline" size={11} color={Colors.white} />
                <Text style={styles.adminBadgeText}>Sales</Text>
              </View>
            )}
          </View>
          {user?.department && (
            <Text style={styles.department}>{user.department}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/more')}
            style={styles.headerBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/more')}
            style={styles.headerBtn}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.user?.first_name?.[0] ?? user?.user?.username?.[0] ?? 'U').toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Date */}
        <Text style={styles.date}>{format(new Date(), 'EEEE, dd MMMM yyyy')}</Text>

        {isLoading ? (
          <LoadingSpinner message="Loading dashboard..." />
        ) : (
          <>
            {/* Stats Grid */}
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatsCard
                label="Total Orders"
                value={stats?.total_orders ?? 0}
                icon="receipt-outline"
                iconColor={Colors.primary}
                iconBg={Colors.primarySurface}
              />
              <StatsCard
                label="Customers"
                value={stats?.total_customers ?? 0}
                icon="people-outline"
                iconColor={Colors.secondary}
                iconBg={Colors.secondarySurface}
              />
            </View>
            <View style={styles.statsGrid}>
              <StatsCard
                label="Revenue"
                value={`KSh ${parseFloat(stats?.total_revenue ?? '0').toLocaleString()}`}
                icon="cash-outline"
                iconColor={Colors.success}
                iconBg={Colors.successSurface}
              />
              <StatsCard
                label="Pending Orders"
                value={stats?.pending_orders ?? 0}
                icon="time-outline"
                iconColor={Colors.warning}
                iconBg={Colors.warningSurface}
              />
            </View>
            <View style={styles.statsGrid}>
              <StatsCard
                label="Products"
                value={stats?.total_products ?? 0}
                icon="cube-outline"
                iconColor={Colors.info}
                iconBg={Colors.infoSurface}
              />
              <StatsCard
                label="Low Stock Alerts"
                value={stats?.low_stock_alerts ?? 0}
                icon="alert-circle-outline"
                iconColor={Colors.error}
                iconBg={Colors.errorSurface}
              />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              {[
                { label: 'New Order', icon: 'add-circle-outline', route: '/(tabs)/orders/create', color: Colors.accent },
                { label: 'Add Customer', icon: 'person-add-outline', route: '/(tabs)/customers/add', color: Colors.primary },
                { label: 'Products', icon: 'cube-outline', route: '/(tabs)/products', color: Colors.info },
                { label: 'More', icon: 'grid-outline', route: '/(tabs)/more', color: Colors.secondary },
              ].map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickActionBtn}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '18' }]}>
                    <Ionicons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Detailed Dashboard Stats */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Detailed Analytics</Text>
            </View>
            <DashboardStatsComponent stats={stats ?? null} loading={isLoading} />
            {/* Admin-only: Additional stats */}
            {user?.is_admin && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Admin Overview</Text>
                  <View style={styles.adminPill}>
                    <Ionicons name="shield-checkmark" size={12} color={Colors.gold} />
                    <Text style={styles.adminPillText}>Admin only</Text>
                  </View>
                </View>
                <View style={styles.statsGrid}>
                  <TouchableOpacity
                    style={styles.adminStatCard}
                    onPress={() => router.push('/(tabs)/more' as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="swap-horizontal-outline" size={22} color={Colors.primary} />
                    <Text style={styles.adminStatLabel}>Stock Transfers</Text>
                    <Text style={styles.adminStatSub}>Manage inter-store stock</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.adminStatCard}
                    onPress={() => router.push('/(tabs)/more' as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="alert-circle-outline" size={22} color={Colors.warning} />
                    <Text style={styles.adminStatLabel}>Low Stock</Text>
                    <Text style={styles.adminStatSub}>
                      {stats?.low_stock_alerts ?? 0} alert{(stats?.low_stock_alerts ?? 0) !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Recent Orders */}
            {stats?.recent_orders && stats.recent_orders.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Orders</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                    <Text style={styles.seeAll}>See All</Text>
                  </TouchableOpacity>
                </View>
                {stats.recent_orders.slice(0, 5).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onPress={() => router.push(`/(tabs)/orders/${order.id}` as any)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(247,184,1,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(247,184,1,0.4)',
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gold,
  },
  department: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.goldSurface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  adminPillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.warning,
  },
  adminStatCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  adminStatLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  adminStatSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
