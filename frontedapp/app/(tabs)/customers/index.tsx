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
import { getCustomers } from '../../../src/api/customers';
import { CustomerCard } from '../../../src/components/CustomerCard';
import { LoadingSpinner } from '../../../src/components/ui/LoadingSpinner';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../src/constants/colors';

const CATEGORY_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Factory', value: 'factory' },
  { label: 'Distributor', value: 'distributor' },
  { label: 'Wholesale', value: 'wholesale' },
  { label: 'Towns', value: 'Towns' },
  { label: 'Retail', value: 'Retail customer' },
];

export default function CustomersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customers', search, categoryFilter],
    queryFn: () =>
      getCustomers({
        search: search || undefined,
        category: categoryFilter || undefined,
      }),
  });

  const customers = data?.results ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/customers/add' as any)}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.gray400} />
        <TextInput
          style={styles.search}
          placeholder="Search customers..."
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

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Category</Text>
        <FlatList
          data={CATEGORY_FILTERS}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setCategoryFilter(item.value)}
              style={[styles.filterPill, categoryFilter === item.value && styles.filterPillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, categoryFilter === item.value && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          scrollEventThrottle={16}
        />
      </View>

      {!isLoading && data && (
        <Text style={styles.count}>{data.count} customer{data.count !== 1 ? 's' : ''}</Text>
      )}

      {isLoading ? (
        <LoadingSpinner message="Loading customers..." />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              onPress={() => router.push(`/(tabs)/customers/${item.id}` as any)}
            />
          )}
          contentContainerStyle={[styles.list, customers.length === 0 && { flex: 1 }]}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No Customers Found"
              description={search ? 'Try a different search.' : 'Add your first customer.'}
              actionLabel="Add Customer"
              onAction={() => router.push('/(tabs)/customers/add' as any)}
            />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[Colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.lg,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
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
  search: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  filters: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  filterSection: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    paddingTop: Spacing.md,
  },
  filterLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 36,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  count: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
});
