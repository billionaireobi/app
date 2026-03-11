import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getProduct } from '../../../../src/api/products';
import { useAuthStore } from '../../../../src/store/authStore';
import { Card } from '../../../../src/components/ui/Card';
import { Button } from '../../../../src/components/ui/Button';
import { LoadingSpinner } from '../../../../src/components/ui/LoadingSpinner';
import Toast from 'react-native-toast-message';
import { Colors, FontSize, Spacing } from '../../../../src/constants/colors';

export default function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const productId = Number(id);

  // Check if user is admin
  if (!user?.is_admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Not Authorized</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg }}>
          <Ionicons name="lock-closed" size={48} color={Colors.error} />
          <Text style={{ fontSize: FontSize.lg, fontWeight: '600', marginTop: Spacing.md, textAlign: 'center' }}>
            Only administrators can edit products
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    factory_price: '',
    distributor_price: '',
    wholesale_price: '',
    offshore_price: '',
    retail_price: '',
    status: 'available',
  });

  React.useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        factory_price: String(product.factory_price || 0),
        distributor_price: String(product.distributor_price || 0),
        wholesale_price: String(product.wholesale_price || 0),
        offshore_price: String(product.offshore_price || 0),
        retail_price: String(product.retail_price || 0),
        status: product.status || 'available',
      });
    }
  }, [product]);

  if (isLoading || !product) return <LoadingSpinner fullScreen message="Loading product..." />;

  const handleSave = () => {
    // TODO: Implement API update endpoint and hook
    Toast.show({ type: 'info', text1: 'Product edit in development' });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Product</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <Text style={styles.label}>Product Name</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(val) => setFormData({ ...formData, name: val })}
            editable={false}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            value={formData.description}
            onChangeText={(val) => setFormData({ ...formData, description: val })}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            {['available', 'not_available', 'limited', 'offer'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusBtn,
                  formData.status === status && styles.statusBtnActive,
                ]}
                onPress={() => setFormData({ ...formData, status })}
              >
                <Text style={[styles.statusText, formData.status === status && styles.statusTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Prices by Tier</Text>
          
          <Text style={styles.label}>Factory Price</Text>
          <TextInput
            style={styles.input}
            value={formData.factory_price}
            onChangeText={(val) => setFormData({ ...formData, factory_price: val })}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Distributor Price</Text>
          <TextInput
            style={styles.input}
            value={formData.distributor_price}
            onChangeText={(val) => setFormData({ ...formData, distributor_price: val })}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Wholesale Price</Text>
          <TextInput
            style={styles.input}
            value={formData.wholesale_price}
            onChangeText={(val) => setFormData({ ...formData, wholesale_price: val })}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Towns Price</Text>
          <TextInput
            style={styles.input}
            value={formData.offshore_price}
            onChangeText={(val) => setFormData({ ...formData, offshore_price: val })}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Retail Price</Text>
          <TextInput
            style={styles.input}
            value={formData.retail_price}
            onChangeText={(val) => setFormData({ ...formData, retail_price: val })}
            keyboardType="decimal-pad"
          />
        </Card>

        <View style={styles.buttonRow}>
          <Button
            onPress={() => router.back()}
            label="Cancel"
            variant="outline"
            style={{ flex: 1 }}
          />
          <Button
            onPress={handleSave}
            label="Save Changes"
            variant="primary"
            style={{ flex: 1 }}
          />
        </View>
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
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  section: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statusBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  statusBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  statusTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
});
