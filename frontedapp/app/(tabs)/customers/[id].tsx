import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getCustomer, getCustomerOrders } from '../../../src/api/customers';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { OrderCard } from '../../../src/components/OrderCard';
import { LoadingSpinner } from '../../../src/components/ui/LoadingSpinner';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Button } from '../../../src/components/ui/Button';
import { Colors, FontSize, Spacing } from '../../../src/constants/colors';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const customerId = Number(id);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: () => getCustomerOrders(customerId),
  });

  if (isLoading || !customer) return <LoadingSpinner fullScreen message="Loading customer..." />;

  const totalOrderValue = orders
    ? orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
    : 0;

  const initials = `${customer.first_name.charAt(0)}${customer.last_name.charAt(0)}`.toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Profile</Text>
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/customers/edit/${customer.id}` as any)}
          style={styles.backBtn}
        >
          <Ionicons name="create-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{customer.first_name} {customer.last_name}</Text>
              <Badge label={customer.default_category} variant="primary" />
              {customer.sales_person_name && (
                <Text style={styles.salesPerson}>
                  Salesperson: {customer.sales_person_name}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL(`tel:${customer.phone_number}`)}
            >
              <Ionicons name="call" size={20} color={Colors.success} />
              <Text style={styles.contactText}>{customer.phone_number}</Text>
            </TouchableOpacity>
            {customer.email && (
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => Linking.openURL(`mailto:${customer.email}`)}
              >
                <Ionicons name="mail" size={20} color={Colors.primary} />
                <Text style={styles.contactText}>{customer.email}</Text>
              </TouchableOpacity>
            )}
          </View>

          {customer.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.address}>{customer.address}</Text>
            </View>
          )}
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{orders?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>KSh {totalOrderValue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <Button
            onPress={() => router.push({
              pathname: '/(tabs)/orders/create' as any,
              params: { customerId: customer.id },
            })}
            label="New Order"
            variant="primary"
            style={styles.actionBtn}
          />
          <Button
            onPress={() => Linking.openURL(`tel:${customer.phone_number}`)}
            label="Call"
            variant="outline"
            style={styles.actionBtn}
          />
        </View>

        {/* Order History */}
        <Text style={styles.sectionTitle}>Order History</Text>
        {ordersLoading ? (
          <LoadingSpinner message="Loading orders..." />
        ) : orders && orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => router.push(`/(tabs)/orders/${order.id}` as any)}
            />
          ))
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="No Orders Yet"
            description="This customer hasn't placed any orders."
            actionLabel="Create First Order"
            onAction={() => router.push('/(tabs)/orders/create' as any)}
          />
        )}
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
  profileCard: { marginBottom: Spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  profileInfo: { flex: 1, gap: 6 },
  profileName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  salesPerson: { fontSize: FontSize.xs, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.divider, marginBottom: Spacing.md },
  contactRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  contactText: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: Spacing.xs },
  address: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  actionBtn: { flex: 1 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
});
