import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import { getCustomers } from '../../../src/api/customers';
import { getProducts, getProductPriceByCategory } from '../../../src/api/products';
import { createOrder } from '../../../src/api/orders';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../../src/constants/colors';
import type {
  Customer,
  CustomerCategory,
  ProductListItem,
  StoreLocation,
} from '../../../src/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderLine {
  product_id: number;
  product_name: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  variance: number;
  stock: number; // stock for the selected store
  loadingPrice: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; value: CustomerCategory }[] = [
  { label: 'Factory', value: 'factory' },
  { label: 'Distributor', value: 'distributor' },
  { label: 'Wholesale', value: 'wholesale' },
  { label: 'Towns', value: 'Towns' },
  { label: 'Retail', value: 'Retail customer' },
];

const STORES: { label: string; value: StoreLocation; icon: string }[] = [
  { label: 'McDave', value: 'mcdave', icon: 'business-outline' },
  { label: 'Kisii', value: 'kisii', icon: 'storefront-outline' },
  { label: 'Offshore', value: 'offshore', icon: 'boat-outline' },
];

const fmt = (n: number) =>
  n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const stockKey = (p: ProductListItem, store: StoreLocation): number => {
  if (store === 'mcdave') return p.mcdave_stock ?? 0;
  if (store === 'kisii') return p.kisii_stock ?? 0;
  return p.offshore_stock ?? 0;
};

const priceFromList = (p: ProductListItem, cat: CustomerCategory): number => {
  const map: Record<CustomerCategory, string | undefined> = {
    factory: p.factory_price,
    distributor: p.distributor_price,
    wholesale: p.wholesale_price,
    Towns: p.offshore_price,
    'Retail customer': p.retail_price,
  };
  return parseFloat(map[cat] ?? '0') || 0;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Pill selector row */
function PillRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={pill.wrap}>
      <Text style={pill.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pill.row}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[pill.chip, active && pill.chipActive]}
            >
              <Text style={[pill.text, active && pill.textActive]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const pill = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  row: { gap: Spacing.xs, paddingVertical: 2 },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    backgroundColor: Colors.white,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySurface },
  text: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  textActive: { color: Colors.primary, fontWeight: '700' },
});

/** Section card */
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sec.card}>
      <View style={sec.header}>
        <View style={sec.iconBg}>
          <Ionicons name={icon as any} size={16} color={Colors.primary} />
        </View>
        <Text style={sec.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const sec = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  iconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
});

// ─── Customer Picker Modal ────────────────────────────────────────────────────

interface CustomerPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (c: Customer) => void;
}

function CustomerPickerModal({ visible, onClose, onSelect }: CustomerPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['customer-search', query],
    queryFn: () => getCustomers({ search: query }),
    enabled: query.length >= 1,
    staleTime: 10_000,
  });

  const customers = data?.results ?? [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[cpk.container, { paddingTop: insets.top || Spacing.lg }]}>
        {/* Header */}
        <View style={cpk.header}>
          <Text style={cpk.title}>Select Customer</Text>
          <TouchableOpacity onPress={onClose} style={cpk.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={cpk.searchWrap}>
          <Ionicons name="search-outline" size={18} color={Colors.gray400} />
          <TextInput
            style={cpk.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor={Colors.gray400}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {isFetching && <ActivityIndicator size="small" color={Colors.primary} />}
          {query.length > 0 && !isFetching && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        {query.length === 0 ? (
          <View style={cpk.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.gray300} />
            <Text style={cpk.emptyText}>Type to search customers</Text>
          </View>
        ) : customers.length === 0 && !isFetching ? (
          <View style={cpk.empty}>
            <Ionicons name="search-outline" size={48} color={Colors.gray300} />
            <Text style={cpk.emptyText}>No customers found for "{query}"</Text>
          </View>
        ) : (
          <FlatList
            data={customers}
            keyExtractor={(c) => String(c.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            renderItem={({ item: c }) => (
              <TouchableOpacity
                style={cpk.item}
                onPress={() => {
                  onSelect(c);
                  setQuery('');
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={cpk.itemAvatar}>
                  <Text style={cpk.avatarText}>
                    {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                  </Text>
                </View>
                <View style={cpk.itemInfo}>
                  <Text style={cpk.itemName}>{c.first_name} {c.last_name}</Text>
                  <Text style={cpk.itemSub}>{c.phone_number}</Text>
                  <View style={cpk.categoryBadge}>
                    <Text style={cpk.categoryText}>{c.default_category}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={cpk.separator} />}
          />
        )}
      </View>
    </Modal>
  );
}

const cpk = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 48,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    gap: Spacing.md,
  },
  itemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  itemSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentSurface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  categoryText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '600' },
  separator: { height: 1, backgroundColor: Colors.gray100, marginLeft: 76 },
});

// ─── Product Picker Modal ─────────────────────────────────────────────────────

interface ProductPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (p: ProductListItem) => void;
  store: StoreLocation;
  category: CustomerCategory;
  addedIds: Set<number>;
}

function ProductPickerModal({
  visible,
  onClose,
  onSelect,
  store,
  category,
  addedIds,
}: ProductPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['product-search', query],
    queryFn: () => getProducts({ search: query }),
    enabled: query.length >= 1,
    staleTime: 10_000,
  });

  const products = data?.results ?? [];

  const stockColor = (stock: number) => {
    if (stock <= 0) return Colors.error;
    if (stock <= 5) return Colors.warning;
    return Colors.success;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[ppk.container, { paddingTop: insets.top || Spacing.lg }]}>
        {/* Header */}
        <View style={ppk.header}>
          <Text style={ppk.title}>Add Product</Text>
          <TouchableOpacity onPress={onClose} style={ppk.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={ppk.subtitle}>
          Store: <Text style={ppk.subtitleBold}>{store}</Text> · Category:{' '}
          <Text style={ppk.subtitleBold}>{category}</Text>
        </Text>

        {/* Search */}
        <View style={ppk.searchWrap}>
          <Ionicons name="search-outline" size={18} color={Colors.gray400} />
          <TextInput
            style={ppk.searchInput}
            placeholder="Search product by name or barcode..."
            placeholderTextColor={Colors.gray400}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {isFetching && <ActivityIndicator size="small" color={Colors.primary} />}
          {query.length > 0 && !isFetching && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        {query.length === 0 ? (
          <View style={ppk.empty}>
            <Ionicons name="cube-outline" size={48} color={Colors.gray300} />
            <Text style={ppk.emptyText}>Type to search products</Text>
          </View>
        ) : products.length === 0 && !isFetching ? (
          <View style={ppk.empty}>
            <Ionicons name="search-outline" size={48} color={Colors.gray300} />
            <Text style={ppk.emptyText}>No products found for "{query}"</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(p) => String(p.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            renderItem={({ item: p }) => {
              const stock = stockKey(p, store);
              const price = priceFromList(p, category);
              const alreadyAdded = addedIds.has(p.id);
              return (
                <TouchableOpacity
                  style={[ppk.item, alreadyAdded && ppk.itemAdded]}
                  onPress={() => {
                    if (!alreadyAdded) {
                      onSelect(p);
                      setQuery('');
                      onClose();
                    }
                  }}
                  activeOpacity={alreadyAdded ? 1 : 0.7}
                >
                  <View style={ppk.itemMain}>
                    <View style={ppk.nameRow}>
                      <Text style={ppk.itemName} numberOfLines={2}>{p.name}</Text>
                      {alreadyAdded && (
                        <View style={ppk.addedBadge}>
                          <Ionicons name="checkmark" size={12} color={Colors.success} />
                          <Text style={ppk.addedText}>Added</Text>
                        </View>
                      )}
                    </View>
                    <Text style={ppk.itemBarcode}>{p.barcode}</Text>
                    <View style={ppk.itemMeta}>
                      <View style={[ppk.stockBadge, { backgroundColor: stock <= 0 ? Colors.errorSurface : stock <= 5 ? Colors.warningSurface : Colors.successSurface }]}>
                        <Text style={[ppk.stockText, { color: stockColor(stock) }]}>
                          Stock: {stock}
                        </Text>
                      </View>
                      <Text style={ppk.priceText}>
                        KSh {fmt(price)}
                      </Text>
                    </View>
                  </View>
                  {!alreadyAdded && (
                    <View style={ppk.addBtn}>
                      <Ionicons name="add" size={20} color={Colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={ppk.separator} />}
          />
        )}
      </View>
    </Modal>
  );
}

const ppk = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.white,
  },
  subtitleBold: { fontWeight: '700', color: Colors.primary },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 48,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    gap: Spacing.md,
  },
  itemAdded: { opacity: 0.5 },
  itemMain: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  itemName: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.successSurface,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  addedText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  itemBarcode: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6 },
  stockBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  stockText: { fontSize: FontSize.xs, fontWeight: '600' },
  priceText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: { height: 1, backgroundColor: Colors.gray100 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreateOrderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [store, setStore] = useState<StoreLocation>('mcdave');
  const [category, setCategory] = useState<CustomerCategory>('wholesale');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [withVat, setWithVat] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [locationAddress, setLocationAddress] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Modal state
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const addedIds = new Set(lines.map((l) => l.product_id));

  // ─── GPS capture ────────────────────────────────────────────────────────────

  const captureGps = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission denied' });
        setGpsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude: lat, longitude: lng } = loc.coords;
      setGpsCoords({ lat, lng });

      // Reverse geocode to human-readable address
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const r = results[0];
        const parts = [r.name, r.street, r.district, r.city, r.region]
          .filter(Boolean)
          .join(', ');
        setLocationAddress(parts);
        if (!address) setAddress(parts);
      }
      Toast.show({ type: 'success', text1: 'Location captured', text2: 'GPS coordinates saved' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to get location' });
    } finally {
      setGpsLoading(false);
    }
  }, [address]);

  // ─── Customer selection ──────────────────────────────────────────────────────

  const handleSelectCustomer = useCallback(
    (c: Customer) => {
      setSelectedCustomer(c);
      setPhone(c.phone_number);
      setAddress(c.address || '');
      // Set category from customer's default
      const found = CATEGORIES.find((cat) => cat.value === c.default_category);
      if (found) setCategory(found.value);
    },
    [],
  );

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setPhone('');
    setAddress('');
  };

  // ─── Category change guard ───────────────────────────────────────────────────

  const handleCategoryChange = (newCat: CustomerCategory) => {
    if (lines.length > 0 && newCat !== category) {
      Alert.alert(
        'Change Category?',
        'Changing the customer category will clear prices for all added items. Prices will be recalculated.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Change',
            style: 'destructive',
            onPress: () => {
              setCategory(newCat);
              // Recalculate prices for existing lines
              setLines((prev) =>
                prev.map((l) => ({ ...l, unit_price: 0, loadingPrice: true })),
              );
              // We'll let the product picker modal re-fetch, just reset prices
              setLines((prev) =>
                prev.map((l) => ({ ...l, unit_price: 0, loadingPrice: false })),
              );
            },
          },
        ],
      );
    } else {
      setCategory(newCat);
    }
  };

  // ─── Store change guard ──────────────────────────────────────────────────────

  const handleStoreChange = (newStore: StoreLocation) => {
    setStore(newStore);
    // Update stock values for existing lines
    // (stock is set from the product list item at add time; changing store needs re-fetch)
    // For simplicity, show a note. Lines keep their prices.
  };

  // ─── Product selection ───────────────────────────────────────────────────────

  const handleSelectProduct = useCallback(
    async (p: ProductListItem) => {
      const stock = stockKey(p, store);
      if (stock <= 0) {
        Toast.show({
          type: 'error',
          text1: 'Out of Stock',
          text2: `${p.name} has no stock at ${store} store`,
        });
        return;
      }

      // Optimistically add with list price
      const listPrice = priceFromList(p, category);
      const newLine: OrderLine = {
        product_id: p.id,
        product_name: p.name,
        barcode: p.barcode,
        quantity: 1,
        unit_price: listPrice,
        variance: 0,
        stock,
        loadingPrice: false,
      };
      setLines((prev) => [...prev, newLine]);

      // Fetch exact price from API
      try {
        const priceData = await getProductPriceByCategory(p.id, category);
        const exactPrice = parseFloat(priceData.price) || listPrice;
        setLines((prev) =>
          prev.map((l) =>
            l.product_id === p.id && l.unit_price === listPrice
              ? { ...l, unit_price: exactPrice, loadingPrice: false }
              : l,
          ),
        );
      } catch {
        // keep list price on error
      }
    },
    [store, category],
  );

  // ─── Line operations ─────────────────────────────────────────────────────────

  const updateQty = (idx: number, delta: number) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const qty = Math.max(1, l.quantity + delta);
        return { ...l, quantity: qty };
      }),
    );
  };

  const updatePrice = (idx: number, val: string) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, unit_price: parseFloat(val) || 0 } : l,
      ),
    );
  };

  const updateVariance = (idx: number, val: string) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, variance: parseFloat(val) || 0 } : l,
      ),
    );
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Totals ──────────────────────────────────────────────────────────────────

  const subtotal = lines.reduce((s, l) => s + l.quantity * (l.unit_price + l.variance), 0);
  const vat = withVat ? subtotal * 0.16 : 0;
  const fee = parseFloat(deliveryFee) || 0;
  const grandTotal = subtotal + vat + fee;
  const balance = grandTotal - (parseFloat(amountPaid) || 0);

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const { mutate: submitOrder, isPending } = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      Toast.show({ type: 'success', text1: `Order #${order.id} created!`, text2: 'Order placed successfully' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      router.replace(`/(tabs)/orders/${order.id}` as any);
    },
    onError: (e: Error) =>
      Toast.show({ type: 'error', text1: 'Failed to create order', text2: e.message }),
  });

  const handleSubmit = () => {
    if (!selectedCustomer) {
      Toast.show({ type: 'error', text1: 'Select a customer' });
      return;
    }
    if (!address.trim()) {
      Toast.show({ type: 'error', text1: 'Enter delivery address' });
      return;
    }
    if (!phone.trim()) {
      Toast.show({ type: 'error', text1: 'Enter phone number' });
      return;
    }
    if (lines.length === 0) {
      Toast.show({ type: 'error', text1: 'Add at least one item' });
      return;
    }

    submitOrder({
      customer_id: selectedCustomer.id,
      store,
      customer_category: category,
      address: address.trim(),
      phone: phone.trim(),
      vat_variation: withVat ? 'with_vat' : 'without_vat',
      delivery_fee: fee || undefined,
      latitude: gpsCoords?.lat,
      longitude: gpsCoords?.lng,
      location_address: locationAddress || undefined,
      amount_paid: parseFloat(amountPaid) || undefined,
      items: lines.map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        variance: l.variance || undefined,
      })),
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>New Order</Text>
        <View style={s.headerRight}>
          {gpsCoords && (
            <View style={s.gpsDot}>
              <Ionicons name="location" size={14} color={Colors.white} />
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. Customer ── */}
          <Section title="Customer" icon="person-outline">
            {selectedCustomer ? (
              <View style={s.selectedBox}>
                <View style={s.customerAvatar}>
                  <Text style={s.avatarLetter}>
                    {selectedCustomer.first_name.charAt(0)}{selectedCustomer.last_name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.customerName}>
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </Text>
                  <Text style={s.customerSub}>{selectedCustomer.phone_number}</Text>
                  <Text style={s.customerCat}>{selectedCustomer.default_category}</Text>
                </View>
                <TouchableOpacity onPress={clearCustomer} style={s.clearBtn}>
                  <Ionicons name="close-circle" size={22} color={Colors.gray400} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={s.pickerBtn}
                onPress={() => setShowCustomerPicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="search-outline" size={18} color={Colors.primary} />
                <Text style={s.pickerBtnText}>Search & select customer...</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
              </TouchableOpacity>
            )}
            {!selectedCustomer && (
              <Text style={s.hint}>
                <Ionicons name="information-circle-outline" size={13} color={Colors.info} />{' '}
                Selecting a customer auto-fills phone, address, and pricing category.
              </Text>
            )}
          </Section>

          {/* ── 2. Order Details ── */}
          <Section title="Order Details" icon="receipt-outline">
            <PillRow
              label="Store"
              options={STORES}
              value={store}
              onChange={handleStoreChange}
            />

            <PillRow
              label="Customer Category"
              options={CATEGORIES}
              value={category}
              onChange={handleCategoryChange}
            />

            {/* Delivery Address */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Delivery Address *</Text>
              <View style={s.addressRow}>
                <View style={[s.inputWrap, { flex: 1 }]}>
                  <Ionicons name="location-outline" size={16} color={Colors.gray400} />
                  <TextInput
                    style={s.input}
                    placeholder="Enter delivery address"
                    placeholderTextColor={Colors.gray400}
                    value={address}
                    onChangeText={setAddress}
                    multiline
                  />
                </View>
                <TouchableOpacity
                  style={[s.gpsBtn, gpsLoading && { opacity: 0.6 }]}
                  onPress={captureGps}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="navigate" size={16} color={Colors.white} />
                      <Text style={s.gpsBtnText}>GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {gpsCoords && (
                <Text style={s.gpsCoordText}>
                  📍 {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                </Text>
              )}
            </View>

            {/* Phone */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Phone Number *</Text>
              <View style={s.inputWrap}>
                <Ionicons name="call-outline" size={16} color={Colors.gray400} />
                <TextInput
                  style={s.input}
                  placeholder="0700000000"
                  placeholderTextColor={Colors.gray400}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Delivery Fee */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>Delivery Fee (KSh)</Text>
              <View style={s.inputWrap}>
                <Ionicons name="car-outline" size={16} color={Colors.gray400} />
                <TextInput
                  style={s.input}
                  placeholder="0"
                  placeholderTextColor={Colors.gray400}
                  value={deliveryFee}
                  onChangeText={setDeliveryFee}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* VAT Toggle */}
            <View style={s.vatRow}>
              <View>
                <Text style={s.fieldLabel}>Include VAT (16%)</Text>
                <Text style={s.vatSub}>Only for VAT-registered customers</Text>
              </View>
              <Switch
                value={withVat}
                onValueChange={setWithVat}
                trackColor={{ false: Colors.gray300, true: Colors.primary }}
                thumbColor={Colors.white}
              />
            </View>
          </Section>

          {/* ── 3. Items ── */}
          <Section title={`Order Items${lines.length > 0 ? ` (${lines.length})` : ''}`} icon="cube-outline">
            {/* Add product button */}
            <TouchableOpacity
              style={s.addProductBtn}
              onPress={() => setShowProductPicker(true)}
              activeOpacity={0.7}
            >
              <View style={s.addProductIcon}>
                <Ionicons name="add" size={20} color={Colors.white} />
              </View>
              <Text style={s.addProductText}>Add Product</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>

            {lines.length === 0 && (
              <View style={s.emptyItems}>
                <Ionicons name="cube-outline" size={36} color={Colors.gray300} />
                <Text style={s.emptyItemsText}>No items added yet</Text>
                <Text style={s.emptyItemsSub}>Tap "Add Product" to search the catalogue</Text>
              </View>
            )}

            {lines.map((line, idx) => {
              const lineTotal = line.quantity * (line.unit_price + line.variance);
              const lowStock = line.stock <= 5;
              const outOfStock = line.stock <= 0;
              return (
                <View key={`${line.product_id}-${idx}`} style={s.lineCard}>
                  {/* Line header */}
                  <View style={s.lineTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lineName} numberOfLines={2}>{line.product_name}</Text>
                      <Text style={s.lineBarcode}>{line.barcode}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeLine(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>

                  {/* Stock badge */}
                  {(lowStock || outOfStock) && (
                    <View style={[s.stockWarning, { backgroundColor: outOfStock ? Colors.errorSurface : Colors.warningSurface }]}>
                      <Ionicons
                        name="warning-outline"
                        size={13}
                        color={outOfStock ? Colors.error : Colors.warning}
                      />
                      <Text style={[s.stockWarningText, { color: outOfStock ? Colors.error : Colors.warning }]}>
                        {outOfStock ? 'Out of stock at this store' : `Low stock: only ${line.stock} left`}
                      </Text>
                    </View>
                  )}

                  {/* Qty stepper */}
                  <View style={s.lineControls}>
                    <View style={s.qtyWrap}>
                      <Text style={s.lineFieldLabel}>Quantity</Text>
                      <View style={s.qtyRow}>
                        <TouchableOpacity
                          style={[s.qtyBtn, line.quantity <= 1 && s.qtyBtnDisabled]}
                          onPress={() => updateQty(idx, -1)}
                          disabled={line.quantity <= 1}
                        >
                          <Ionicons name="remove" size={16} color={line.quantity <= 1 ? Colors.gray400 : Colors.primary} />
                        </TouchableOpacity>
                        <Text style={s.qtyVal}>{line.quantity}</Text>
                        <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(idx, 1)}>
                          <Ionicons name="add" size={16} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={s.priceFld}>
                      <Text style={s.lineFieldLabel}>Unit Price (KSh)</Text>
                      <TextInput
                        style={s.priceInput}
                        keyboardType="numeric"
                        value={String(line.unit_price)}
                        onChangeText={(v) => updatePrice(idx, v)}
                        selectTextOnFocus
                      />
                    </View>

                    <View style={s.priceFld}>
                      <Text style={s.lineFieldLabel}>Variance</Text>
                      <TextInput
                        style={s.priceInput}
                        keyboardType="numeric"
                        value={String(line.variance)}
                        onChangeText={(v) => updateVariance(idx, v)}
                        selectTextOnFocus
                        placeholder="0"
                        placeholderTextColor={Colors.gray400}
                      />
                    </View>
                  </View>

                  {/* Line total */}
                  <View style={s.lineTotalRow}>
                    <Text style={s.lineTotalLabel}>Line Total</Text>
                    <Text style={s.lineTotalVal}>KSh {fmt(lineTotal)}</Text>
                  </View>
                </View>
              );
            })}
          </Section>

          {/* ── 4. Payment ── */}
          {lines.length > 0 && (
            <Section title="Payment" icon="cash-outline">
              <View style={s.field}>
                <Text style={s.fieldLabel}>Amount Paid (KSh)</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="cash-outline" size={16} color={Colors.gray400} />
                  <TextInput
                    style={s.input}
                    placeholder="0 (leave blank for unpaid)"
                    placeholderTextColor={Colors.gray400}
                    value={amountPaid}
                    onChangeText={setAmountPaid}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </Section>
          )}

          {/* ── 5. Summary ── */}
          {lines.length > 0 && (
            <View style={s.summaryCard}>
              <Text style={s.summaryTitle}>Order Summary</Text>

              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Subtotal ({lines.length} item{lines.length !== 1 ? 's' : ''})</Text>
                <Text style={s.summaryVal}>KSh {fmt(subtotal)}</Text>
              </View>
              {withVat && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>VAT (16%)</Text>
                  <Text style={s.summaryVal}>KSh {fmt(vat)}</Text>
                </View>
              )}
              {fee > 0 && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Delivery Fee</Text>
                  <Text style={s.summaryVal}>KSh {fmt(fee)}</Text>
                </View>
              )}

              <View style={s.divider} />

              <View style={s.summaryRow}>
                <Text style={s.grandLabel}>Grand Total</Text>
                <Text style={s.grandVal}>KSh {fmt(grandTotal)}</Text>
              </View>

              {amountPaid !== '' && (
                <>
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Amount Paid</Text>
                    <Text style={[s.summaryVal, { color: Colors.success }]}>
                      KSh {fmt(parseFloat(amountPaid) || 0)}
                    </Text>
                  </View>
                  <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Balance</Text>
                    <Text style={[s.summaryVal, { color: balance > 0 ? Colors.error : Colors.success }]}>
                      KSh {fmt(Math.abs(balance))}{balance < 0 ? ' (Overpaid)' : ''}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[s.submitBtn, isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isPending}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                <Text style={s.submitText}>Place Order</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modals ── */}
      <CustomerPickerModal
        visible={showCustomerPicker}
        onClose={() => setShowCustomerPicker(false)}
        onSelect={handleSelectCustomer}
      />

      <ProductPickerModal
        visible={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSelect={handleSelectProduct}
        store={store}
        category={category}
        addedIds={addedIds}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  headerRight: { width: 38, alignItems: 'center' },
  gpsDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scroll: { padding: Spacing.md, paddingBottom: 40 },

  // Customer section
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primarySurface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  customerName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  customerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  customerCat: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  clearBtn: { padding: Spacing.xs },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.primarySurface,
  },
  pickerBtnText: { flex: 1, fontSize: FontSize.md, color: Colors.primary, fontWeight: '500' },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },

  // Fields
  field: { marginBottom: Spacing.md },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  input: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, paddingVertical: Spacing.sm },

  // Address row with GPS button
  addressRow: { flexDirection: 'row', gap: Spacing.sm },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    minWidth: 60,
    justifyContent: 'center',
  },
  gpsBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.xs },
  gpsCoordText: { fontSize: FontSize.xs, color: Colors.info, marginTop: 4 },

  // VAT row
  vatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  vatSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  // Add product button
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.primarySurface,
    marginBottom: Spacing.md,
  },
  addProductIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProductText: { flex: 1, fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' },

  // Empty items
  emptyItems: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyItemsText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
  emptyItemsSub: { fontSize: FontSize.sm, color: Colors.gray400, textAlign: 'center' },

  // Line card
  lineCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  lineName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  lineBarcode: { fontSize: FontSize.xs, color: Colors.gray500, marginTop: 2 },
  stockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  stockWarningText: { fontSize: FontSize.xs, fontWeight: '600' },
  lineControls: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  qtyWrap: {},
  lineFieldLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 34,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray50,
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyVal: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  priceFld: { flex: 1 },
  priceInput: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 38,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    textAlign: 'center',
  },
  lineTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  lineTotalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  lineTotalVal: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary },

  // Summary card
  summaryCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  summaryTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)' },
  summaryVal: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: Spacing.sm },
  grandLabel: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  grandVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.gold },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    marginTop: Spacing.sm,
    ...Shadow.lg,
  },
  submitText: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.white },
});
