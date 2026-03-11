import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getOrders } from '../../../src/api/orders';
import { OrderCard } from '../../../src/components/OrderCard';
import { LoadingSpinner } from '../../../src/components/ui/LoadingSpinner';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../src/constants/colors';
import type { OrderPaidStatus } from '../../../src/types';

const STATUS_FILTERS: { label: string; value: OrderPaidStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Partial', value: 'partially_paid' },
  { label: 'Paid', value: 'completed' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderPaidStatus | ''>('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders', statusFilter, search],
    queryFn: () =>
      getOrders({
        paid_status: statusFilter || undefined,
        search: search || undefined,
      }),
  });

  const orders = data?.results ?? [];

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
          placeholder="Search orders..."
          placeholderTextColor={Colors.gray400}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter Pills */}
      <View style={styles.filters}>
        {STATUS_FILTERS.map((f) => (
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
      </View>

      {/* Count */}
      {!isLoading && data && (
        <Text style={styles.count}>{data.count} order{data.count !== 1 ? 's' : ''}</Text>
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
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
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
});
