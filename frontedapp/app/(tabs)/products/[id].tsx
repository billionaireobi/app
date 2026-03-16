import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getProduct, getProductStats } from '../../../src/api/products';
import { useAuthStore } from '../../../src/store/authStore';
import { getCacheConfig } from '../../../src/hooks/useCacheConfig';
import { LoadingSpinner } from '../../../src/components/ui/LoadingSpinner';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../src/constants/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 260;

// ── Status helpers ────────────────────────────────────────────────────────────
function statusLabel(s: string) {
  const map: Record<string, string> = {
    available: 'Available',
    not_available: 'Out of Stock',
    limited: 'Limited',
    offer: 'On Offer',
    active: 'Active',
    inactive: 'Inactive',
  };
  return map[s] ?? s;
}
function statusColors(s: string): { bg: string; text: string } {
  switch (s) {
    case 'available':
    case 'active':
      return { bg: Colors.successSurface, text: Colors.success };
    case 'not_available':
    case 'inactive':
      return { bg: Colors.errorSurface, text: Colors.error };
    case 'limited':
      return { bg: Colors.warningSurface, text: Colors.warning };
    case 'offer':
      return { bg: Colors.accentSurface, text: Colors.accentDark };
    default:
      return { bg: Colors.gray100, text: Colors.gray600 };
  }
}

// ── Collapsible Drawer ────────────────────────────────────────────────────────
function DrawerSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };
  return (
    <View style={drawer.wrap}>
      <TouchableOpacity style={drawer.header} onPress={toggle} activeOpacity={0.7}>
        <View style={drawer.left}>
          <View style={drawer.iconBg}>
            <Ionicons name={icon as any} size={15} color={Colors.primary} />
          </View>
          <Text style={drawer.title}>{title}</Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={17}
          color={Colors.gray500}
        />
      </TouchableOpacity>
      {open && <View style={drawer.body}>{children}</View>}
    </View>
  );
}

// ── Horizontal stock bar ──────────────────────────────────────────────────────
function StockBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const color =
    value <= 0 ? Colors.error : value <= 10 ? Colors.warning : Colors.success;
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}

// Resolve image URLs safely: DRF ImageField already returns absolute URLs with request context,
// so we must not prepend the domain again. Fall back to relative-only path if needed.
function resolveImageUri(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://zeliaoms.mcdave.co.ke${url}`;
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const productId = Number(id);
  const isAdmin = user?.is_admin;
  const [imgError, setImgError] = useState(false);

  const { data: product, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    ...getCacheConfig('products'),
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['product-stats', productId],
    queryFn: () => getProductStats(productId),
    enabled: !!product,
    ...getCacheConfig('stats'),
  });

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchStats()]);
  };

  if (isLoading || !product) return <LoadingSpinner fullScreen message="Loading product..." />;

  const imageUri = imgError
    ? null
    : resolveImageUri(product.image_url) || resolveImageUri(product.image);

  const mcdaveStock   = product.mcdave_stock   ?? 0;
  const kisiiStock    = product.kisii_stock    ?? 0;
  const offshoreStock = product.offshore_stock ?? 0;
  const totalStock    = product.total_stock    ?? (mcdaveStock + kisiiStock + offshoreStock);
  const maxStock      = Math.max(mcdaveStock, kisiiStock, offshoreStock, 1);

  const sc = statusColors(product.status);

  const pricingRows = [
    { label: 'Factory',     value: product.factory_price,     icon: 'business-outline' as const },
    { label: 'Distributor', value: product.distributor_price, icon: 'car-outline' as const },
    { label: 'Wholesale',   value: product.wholesale_price,   icon: 'pricetag-outline' as const },
    { label: 'Towns',       value: product.offshore_price,    icon: 'boat-outline' as const },
    { label: 'Retail',      value: product.retail_price,      icon: 'storefront-outline' as const },
  ];

  const stockRows = [
    { label: 'McDave — Nairobi', value: mcdaveStock,   icon: 'home-outline' as const },
    { label: 'Kisii — Mombasa',  value: kisiiStock,    icon: 'water-outline' as const },
    { label: 'Offshore — NRB',   value: offshoreStock, icon: 'airplane-outline' as const },
  ];

  const revenueDisplay = stats
    ? stats.total_revenue >= 1_000_000
      ? `${(stats.total_revenue / 1_000_000).toFixed(1)}M`
      : stats.total_revenue >= 1_000
      ? `${(stats.total_revenue / 1_000).toFixed(0)}K`
      : stats.total_revenue.toLocaleString()
    : '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Floating header ── */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => router.push(`/(tabs)/products/${productId}/edit` as any)}
          >
            <Ionicons name="pencil" size={18} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      >
        {/* ── Hero image ── */}
        <View style={styles.hero}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="cube-outline" size={72} color={Colors.gray300} />
              <Text style={styles.placeholderText}>No image</Text>
            </View>
          )}
          {/* Dark overlay at bottom */}
          <View style={styles.heroOverlay} />
          {/* Info layered on top of overlay */}
          <View style={styles.heroInfo}>
            {product.category_name ? (
              <Text style={styles.heroCategory}>{product.category_name}</Text>
            ) : null}
            <Text style={styles.heroName} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={styles.heroMeta}>
              {product.barcode ? (
                <View style={styles.barcodeChip}>
                  <Ionicons name="barcode-outline" size={11} color={Colors.white} />
                  <Text style={styles.barcodeText}>{product.barcode}</Text>
                </View>
              ) : null}
              <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusText, { color: sc.text }]}>
                  {statusLabel(product.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Quick stats row ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: Colors.primary }]}>
            <Ionicons name="layers-outline" size={18} color={Colors.primary} />
            <Text style={styles.statValue}>{totalStock}</Text>
            <Text style={styles.statLabel}>In Stock</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.accent }]}>
            <Ionicons name="receipt-outline" size={18} color={Colors.accent} />
            <Text style={styles.statValue}>{stats?.total_orders ?? '—'}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
            <Ionicons name="cash-outline" size={18} color={Colors.success} />
            <Text style={styles.statValue} numberOfLines={1}>
              {revenueDisplay}
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.info }]}>
            <Ionicons name="cube-outline" size={18} color={Colors.info} />
            <Text style={styles.statValue}>{stats?.total_units_sold ?? '—'}</Text>
            <Text style={styles.statLabel}>Units Sold</Text>
          </View>
        </View>

        {/* ── Pricing drawer ── */}
        <DrawerSection title="Pricing by Tier" icon="pricetags-outline" defaultOpen>
          {pricingRows.map((row) => (
            <View key={row.label} style={styles.priceRow}>
              <View style={styles.priceLeft}>
                <Ionicons name={row.icon} size={13} color={Colors.textSecondary} />
                <Text style={styles.priceLabel}>{row.label}</Text>
              </View>
              <Text style={styles.priceValue}>
                KSh {parseFloat(row.value || '0').toLocaleString()}
              </Text>
            </View>
          ))}
        </DrawerSection>

        {/* ── Stock drawer ── */}
        <DrawerSection title="Stock by Store" icon="storefront-outline" defaultOpen>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total across all stores</Text>
            <Text
              style={[
                styles.totalValue,
                totalStock <= 0
                  ? { color: Colors.error }
                  : totalStock <= 10
                  ? { color: Colors.warning }
                  : {},
              ]}
            >
              {totalStock} units
            </Text>
          </View>
          {stockRows.map((row) => (
            <View key={row.label} style={styles.storeRow}>
              <View style={styles.storeLeft}>
                <Ionicons name={row.icon} size={14} color={Colors.primary} />
                <Text style={styles.storeLabel}>{row.label}</Text>
              </View>
              <View style={styles.storeRight}>
                <Text
                  style={[
                    styles.storeQty,
                    row.value <= 0
                      ? { color: Colors.error }
                      : row.value <= 10
                      ? { color: Colors.warning }
                      : { color: Colors.success },
                  ]}
                >
                  {row.value} units
                </Text>
                <StockBar value={row.value} max={maxStock} />
              </View>
            </View>
          ))}
        </DrawerSection>

        {/* ── Description drawer ── */}
        {product.description ? (
          <DrawerSection title="Description" icon="document-text-outline">
            <Text style={styles.description}>{product.description}</Text>
          </DrawerSection>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Main StyleSheet ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  headerOverlay: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  content: { paddingBottom: Spacing.xxl },

  // Hero
  hero: { width: SCREEN_WIDTH, height: HERO_HEIGHT, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  placeholderText: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontWeight: '500',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT * 0.6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  heroCategory: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  heroName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 30,
    marginBottom: Spacing.sm,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  barcodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  barcodeText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: '500',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 3,
    borderLeftWidth: 3,
    ...Shadow.sm,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Pricing
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  priceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  priceLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  priceValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },

  // Stock
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  totalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  totalValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.success },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  storeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  storeLabel: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  storeRight: { alignItems: 'flex-end', gap: 5 },
  storeQty: { fontSize: FontSize.sm, fontWeight: '700' },

  // Description
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
});

// ── Drawer component styles ───────────────────────────────────────────────────
const drawer = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBg: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
});

// ── Stock bar styles ──────────────────────────────────────────────────────────
const bar = StyleSheet.create({
  track: {
    height: 5,
    width: 80,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
