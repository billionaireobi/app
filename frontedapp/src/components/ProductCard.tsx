import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Colors, FontSize, Spacing } from '../constants/colors';
import type { ProductListItem } from '../types';

// Re-export BASE_URL for image building — defined here to avoid circular deps
export const API_BASE_IMAGE = 'https://zeliaoms.mcdave.co.ke';

interface ProductCardProps {
  product: ProductListItem;
  onPress: () => void;
}

function resolveImageUri(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_IMAGE}${url}`;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const [imgError, setImgError] = React.useState(false);
  const imageUri = imgError ? null : resolveImageUri(product.image_url) || resolveImageUri(product.image);
  // Use total_stock from backend, or calculate from individual stores if not available
  const totalStock = product.total_stock ?? ((product.mcdave_stock || 0) + (product.kisii_stock || 0) + (product.offshore_stock || 0));
  const isLowStock = totalStock <= 10;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.row}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" onError={() => setImgError(true)} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="cube-outline" size={28} color={Colors.gray400} />
            </View>
          )}
          <View style={styles.info}>
            <View style={styles.topRow}>
              <Text style={styles.name} numberOfLines={2}>
                {product.name}
              </Text>
              <Badge
                label={product.status}
                variant={product.status === 'active' ? 'success' : 'neutral'}
              />
            </View>
            <Text style={styles.barcode}>{product.barcode}</Text>
            <Text style={styles.category}>{product.category_name}</Text>
            <View style={styles.stockRow}>
              <Ionicons
                name="layers-outline"
                size={13}
                color={isLowStock ? Colors.error : Colors.success}
              />
              <Text style={[styles.stock, isLowStock && styles.stockLow]}>
                {totalStock} units total
              </Text>
              {isLowStock && (
                <Badge label="Low Stock" variant="error" />
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.gray400} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.gray100,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  barcode: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  category: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stock: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: '500',
  },
  stockLow: {
    color: Colors.error,
  },
});
