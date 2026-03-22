import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

function getNextPage(nextUrl: string | null | undefined): number | undefined {
  if (!nextUrl) return undefined;
  try {
    const url = new URL(nextUrl);
    const p = parseInt(url.searchParams.get('page') || '2', 10);
    return isNaN(p) ? undefined : p;
  } catch {
    return undefined;
  }
}
import { getOrders } from '../../../src/api/orders';
import { useDebounce } from '../../../src/hooks/useDebounce';
import { OrderCard } from '../../../src/components/OrderCard';
import { LoadingSpinner } from '../../../src/components/ui/LoadingSpinner';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../src/constants/colors';
import type { OrderPaidStatus, OrderDeliveryStatus } from '../../../src/types';

const PAID_FILTERS: { label: string; value: OrderPaidStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Unpaid', value: 'pending' },
  { label: 'Partial', value: 'partially_paid' },
  { label: 'Paid', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const DELIVERY_FILTERS: { label: string; value: OrderDeliveryStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Delivered', value: 'completed' },
  { label: 'Returned', value: 'returned' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderPaidStatus | ''>('');
  const [deliveryFilter, setDeliveryFilter] = useState<OrderDeliveryStatus | ''>('');
  const debouncedSearch = useDebounce(search);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['orders', statusFilter, deliveryFilter, debouncedSearch],
    queryFn: ({ pageParam }) =>
      getOrders({
        paid_status: statusFilter || undefined,
        delivery_status: deliveryFilter || undefined,
        search: debouncedSearch || undefined,
        page: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => getNextPage(lastPage.next),
    staleTime: 0, // Always fresh for lists so filters/search reflect current data
  });

  const orders = data?.pages.flatMap((p) => p.results) ?? [];
  const totalCount = data?.pages[0]?.count ?? 0;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/orders/create' as any)}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.gray400} style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          placeholder="Search by customer name or phone..."
          placeholderTextColor={Colors.gray400}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Payment Status Filter Pills */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterGroupLabel}>Payment</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filtersScroll}
        >
          {PAID_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setStatusFilter(f.value)}
              style={[styles.filterPill, statusFilter === f.value && styles.filterPillActive]}
            >
              <Text
                style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Delivery Status Filter Pills */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterGroupLabel}>Delivery</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filtersScroll}
        >
          {DELIVERY_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setDeliveryFilter(f.value)}
              style={[styles.filterPill, deliveryFilter === f.value && styles.filterPillActive]}
            >
              <Text
                style={[styles.filterText, deliveryFilter === f.value && styles.filterTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Count */}
      {!isLoading && data && (
        <Text style={styles.count}>
          {orders.length} / {totalCount} order{totalCount !== 1 ? 's' : ''}
        </Text>
      )}

      {/* List */}
      {isLoading ? (
        <LoadingSpinner message="Loading orders..." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/(tabs)/orders/${item.id}` as any)}
            />
          )}
          contentContainerStyle={[styles.list, orders.length === 0 && { flex: 1 }]}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No Orders Found"
              description={
                search ? 'Try adjusting your search.' : 'No orders yet. Create your first order!'
              }
              actionLabel="Create Order"
              onAction={() => router.push('/(tabs)/orders/create' as any)}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color={Colors.primary} style={styles.footerLoader} />
            ) : null
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.white,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 44,
    gap: Spacing.sm,
  },
  searchIcon: {},
  search: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  filterGroup: {
    marginTop: Spacing.sm,
  },
  filterGroupLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    marginBottom: 2,
  },
  filtersScroll: {
    // intentionally empty — group margin handles spacing
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  count: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  footerLoader: { marginVertical: Spacing.lg },
});
