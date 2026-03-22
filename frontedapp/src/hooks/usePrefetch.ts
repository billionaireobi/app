/**
 * Query Prefetching Hook
 * Proactively fetches data before it's needed to reduce loading states
 * Dramatically improves perceived performance
 */

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getDashboardStats,
  getOrders,
  getOrder,
} from '../api/orders';
import { getProducts, getProductPriceByCategory } from '../api/products';
import { getCustomers } from '../api/customers';
import { getNotifications } from '../api/notifications';
import { getMessages } from '../api/messages';
import { getCacheConfig } from './useCacheConfig';

/**
 * Prefetch static data that's likely to be needed soon
 * Call this after user logs in to warm up the cache
 */
export function usePrefetchCommonQueries() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch dashboard stats
    queryClient.prefetchQuery({
      queryKey: ['dashboard-stats'],
      queryFn: getDashboardStats,
      staleTime: getCacheConfig('stats').staleTime,
    });

    // Prefetch products (first page) — uses prefetchInfiniteQuery to match useInfiniteQuery
    queryClient.prefetchInfiniteQuery({
      queryKey: ['products', '', ''],
      queryFn: ({ pageParam }: { pageParam: unknown }) =>
        getProducts({
          search: undefined,
          status: undefined,
          page: pageParam as number,
        }),
      initialPageParam: 1,
      staleTime: getCacheConfig('products').staleTime,
    } as any);

    // Prefetch customers (first batch) — uses prefetchInfiniteQuery to match useInfiniteQuery
    queryClient.prefetchInfiniteQuery({
      queryKey: ['customers', '', ''],
      queryFn: ({ pageParam }: { pageParam: unknown }) =>
        getCustomers({
          search: undefined,
          page: pageParam as number,
        }),
      initialPageParam: 1,
      staleTime: getCacheConfig('customers').staleTime,
    } as any);

    // Prefetch orders list — uses prefetchInfiniteQuery to match useInfiniteQuery
    queryClient.prefetchInfiniteQuery({
      queryKey: ['orders', '', '', ''],
      queryFn: ({ pageParam }: { pageParam: unknown }) =>
        getOrders({
          paid_status: undefined,
          delivery_status: undefined,
          store: undefined,
          search: undefined,
          page: pageParam as number,
        }),
      initialPageParam: 1,
      staleTime: getCacheConfig('orders').staleTime,
    } as any);

    // Prefetch notifications
    queryClient.prefetchQuery({
      queryKey: ['notifications'],
      queryFn: () => getNotifications(),
      staleTime: getCacheConfig('notifications').staleTime,
    });

    // Prefetch messages
    queryClient.prefetchQuery({
      queryKey: ['messages'],
      queryFn: getMessages,
      staleTime: getCacheConfig('messages').staleTime,
    });
  }, [queryClient]);
}

/**
 * Prefetch specific item details to avoid loading on navigation
 * Use before navigating to detail screens
 * 
 * @param type - Type of item to prefetch ('order', 'customer', 'product')
 * @param id - Item ID to prefetch
 */
export function usePrefetchItemDetail(type: 'order' | 'customer' | 'product', id?: number | string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) return;

    if (type === 'order') {
      queryClient.prefetchQuery({
        queryKey: ['order', Number(id)],
        queryFn: () => getOrder(Number(id)),
        staleTime: getCacheConfig('orders').staleTime,
      });
    } else if (type === 'product' && typeof id === 'number') {
      // Prefetch product price variations
      queryClient.prefetchQuery({
        queryKey: ['product-price', id, 'wholesale', 'with_vat'],
        queryFn: () => getProductPriceByCategory(id, 'wholesale', 'with_vat'),
        staleTime: getCacheConfig('products').staleTime,
      });
    }
  }, [queryClient, type, id]);
}

/**
 * Create a debounced prefetch for search queries
 * Prevents excessive prefetch requests while typing
 * 
 * @param type - Type of search ('products' or 'customers')
 * @param query - Search query string
 * @param debounceMs - Milliseconds to debounce
 */
export function usePrefetchSearch(
  type: 'products' | 'customers',
  query: string,
  debounceMs = 300,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (query.length < 2) return;

    const timer = setTimeout(() => {
      if (type === 'products') {
        queryClient.prefetchQuery({
          queryKey: ['products', query, ''],
          queryFn: () => getProducts({ search: query }),
          staleTime: getCacheConfig('products').staleTime,
        });
      } else if (type === 'customers') {
        queryClient.prefetchQuery({
          queryKey: ['customers', query, ''],
          queryFn: () => getCustomers({ search: query }),
          staleTime: getCacheConfig('customers').staleTime,
        });
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [queryClient, type, query, debounceMs]);
}
