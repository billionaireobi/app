/**
 * Query Cache Configuration Presets
 * Optimized cache durations to minimize latency while maintaining data freshness
 * 
 * Usage: Apply these configs to useQuery hooks to standardize caching behavior
 * Example: useQuery({ ...getCacheConfig('static'), queryKey: [...], queryFn: ... })
 */

type CacheType = 'static' | 'products' | 'customers' | 'orders' | 'notifications' | 'messages' | 'payments' | 'stats';

/**
 * Cache configuration presets optimized for different data types
 */
export const cacheConfigs: Record<
  CacheType,
  {
    staleTime: number;
    gcTime: number;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
  }
> = {
  // Static data that rarely changes (categories, payment methods, etc.)
  static: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // Product list/details - Medium change frequency
  products: {
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Customers - Low change frequency but important
  customers: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Orders - High importance, moderate change frequency
  orders: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Notifications - Real-time important data
  notifications: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Messages - Chat-like interaction
  messages: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Payments - Critical data, frequent updates
  payments: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Dashboard stats - refresh frequently so revenue/orders stay current
  stats: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
};

/**
 * Get cache configuration for a specific data type
 * @param type - Cache type preset
 * @returns Cache configuration object for useQuery
 */
export function getCacheConfig(type: CacheType) {
  return cacheConfigs[type];
}

/**
 * Aggressive caching config - useful for frequently accessed lists
 * Reduces server requests significantly
 */
export const aggressiveCacheConfig = getCacheConfig('static');

/**
 * Moderate caching config - balanced between freshness and performance
 * Good for general list views
 */
export const moderateCacheConfig = getCacheConfig('orders');

/**
 * Minimal caching config - for data that changes frequently
 * Use for real-time data like messages and notifications
 */
export const minimalCacheConfig = getCacheConfig('notifications');

/**
 * Hook to get appropriate cache config based on query type
 * Ensures consistent caching behavior across the app
 * 
 * @param queryKey - React Query key
 * @returns Appropriate cache configuration
 */
export function useCacheConfig(queryKey: (string | any)[]) {
  const key = queryKey[0]?.toString().toLowerCase() || '';

  if (key.includes('product')) return getCacheConfig('products');
  if (key.includes('customer')) return getCacheConfig('customers');
  if (key.includes('order')) return getCacheConfig('orders');
  if (key.includes('notification')) return getCacheConfig('notifications');
  if (key.includes('message')) return getCacheConfig('messages');
  if (key.includes('payment')) return getCacheConfig('payments');
  if (key.includes('stats') || key.includes('dashboard')) return getCacheConfig('stats');

  return getCacheConfig('static');
}
