import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getProducts } from '../../../src/api/products';
import { getCacheConfig } from '../../../src/hooks/useCacheConfig';
import { useDebounce } from '../../../src/hooks/useDebounce';

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
import { ProductCard } from '../../../src/components/ProductCard';
import { LoadingSpinner } from '../../../src/components/ui/LoadingSpinner';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../src/constants/colors';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Available', value: 'available' },
  { label: 'Not Available', value: 'not_available' },
  { label: 'Limited', value: 'limited' },
  { label: 'Offer', value: 'offer' },
];

export default function ProductsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search);

  const isFiltered = Boolean(debouncedSearch || statusFilter);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['products', debouncedSearch, statusFilter],
    queryFn: ({ pageParam }) =>
      getProducts({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => getNextPage(lastPage.next),
    staleTime: isFiltered ? 0 : getCacheConfig('products').staleTime,
    gcTime: getCacheConfig('products').gcTime,
  });

  const products = data?.pages.flatMap((p) => p.results) ?? [];
  const totalCount = data?.pages[0]?.count ?? 0;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <Ionicons name="cube-outline" size={24} color={Colors.white} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.gray400} />
        <TextInput
          style={styles.search}
          placeholder="Search by name or barcode..."
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filtersScroll}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setStatusFilter(f.value)}
            style={[styles.filterPill, statusFilter === f.value && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!isLoading && data && (
        <Text style={styles.count}>
          {products.length} / {totalCount} product{totalCount !== 1 ? 's' : ''}
        </Text>
      )}

      {isLoading ? (
        <LoadingSpinner message="Loading products..." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/(tabs)/products/${item.id}` as any)}
            />
          )}
          contentContainerStyle={[styles.list, products.length === 0 && { flex: 1 }]}
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title="No Products Found"
              description={search ? 'Try a different search.' : 'No products available.'}
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
  filtersScroll: {
    marginTop: Spacing.md,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
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
  filterPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  count: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  footerLoader: { marginVertical: Spacing.lg },
});
