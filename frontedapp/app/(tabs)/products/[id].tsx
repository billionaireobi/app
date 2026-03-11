import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getProduct } from '../../../src/api/products';
import { useAuthStore } from '../../../src/store/authStore';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { LoadingSpinner } from '../../../src/components/ui/LoadingSpinner';
import { Colors, FontSize, Spacing } from '../../../src/constants/colors';

const API_BASE = 'https://zeliaoms.mcdave.co.ke';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const productId = Number(id);
  const isAdmin = user?.is_admin;

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
  });

  if (isLoading || !product) return <LoadingSpinner fullScreen message="Loading product..." />;

  const imageUri = product.image_url || (product.image ? `${API_BASE}${product.image}` : null);
  const totalStock = product.total_stock ?? ((product.mcdave_stock || 0) + (product.kisii_stock || 0) + (product.offshore_stock || 0));

  const pricingRows = [
    { label: 'Factory Price', value: product.factory_price },
    { label: 'Distributor Price', value: product.distributor_price },
    { label: 'Wholesale Price', value: product.wholesale_price },
    { label: 'Towns Price', value: product.offshore_price },
    { label: 'Retail Price', value: product.retail_price },
  ];

  const stockRows = [
    { label: 'McDave (Nairobi)', value: product.mcdave_stock, store: 'mcdave' },
    { label: 'Kisii (Mombasa)', value: product.kisii_stock, store: 'kisii' },
    { label: 'Offshore (NRB)', value: product.offshore_stock, store: 'offshore' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.editBtn} onPress={() => router.push(`/(tabs)/products/${productId}/edit` as any)}>
            <Ionicons name="pencil" size={20} color={Colors.white} />
          </TouchableOpacity>
        )}
        {!isAdmin && <View style={{ width: 36 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image & Basic Info */}
        <Card style={styles.section}>
          <View style={styles.topRow}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={48} color={Colors.gray400} />
              </View>
            )}
            <View style={styles.basicInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              {product.barcode ? (
                <View style={styles.barcodeRow}>
                  <Ionicons name="barcode-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.barcode}>{product.barcode}</Text>
                </View>
              ) : null}
              {product.category_name && (
                <Text style={styles.category}>{product.category_name}</Text>
              )}
              <Badge
                label={product.status}
                variant={product.status === 'active' ? 'success' : 'neutral'}
              />
            </View>
          </View>
          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}
        </Card>

        {/* Pricing */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing by Tier</Text>
          {pricingRows.map((row) => (
            <View key={row.label} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{row.label}</Text>
              <Text style={styles.priceValue}>
                KSh {parseFloat(row.value).toLocaleString()}
              </Text>
            </View>
          ))}
        </Card>

        {/* Stock Levels */}
        <Card style={styles.section}>
          <View style={styles.stockHeader}>
            <Text style={styles.sectionTitle}>Stock Levels</Text>
            <Text style={[styles.totalStock, totalStock <= 10 && styles.totalStockLow]}>
              Total: {totalStock} units
            </Text>
          </View>
          {stockRows.map((row) => (
            <View key={row.store} style={styles.stockRow}>
              <View style={styles.stockLeft}>
                <Ionicons name="storefront-outline" size={16} color={Colors.primary} />
                <Text style={styles.stockLabel}>{row.label}</Text>
              </View>
              <View style={[
                styles.stockBadge,
                row.value <= 0
                  ? { backgroundColor: Colors.errorSurface }
                  : row.value <= 10
                  ? { backgroundColor: Colors.warningSurface }
                  : { backgroundColor: Colors.successSurface },
              ]}>
                <Text style={[
                  styles.stockValue,
                  row.value <= 0
                    ? { color: Colors.error }
                    : row.value <= 10
                    ? { color: Colors.warning }
                    : { color: Colors.success },
                ]}>
                  {row.value} units
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  editBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  section: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  topRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  image: { width: 100, height: 100, borderRadius: 12, backgroundColor: Colors.gray100 },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basicInfo: { flex: 1, gap: 6 },
  productName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barcode: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: 'monospace' },
  category: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '500' },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  priceLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  priceValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  totalStock: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.success },
  totalStockLow: { color: Colors.error },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  stockLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stockLabel: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  stockBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stockValue: { fontSize: FontSize.sm, fontWeight: '700' },
});
